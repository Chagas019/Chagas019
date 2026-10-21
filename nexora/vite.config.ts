/// <reference types="vitest" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { demoProperties } from './src/data/properties';
import { propertySeo } from './src/lib/seo';

/**
 * SEO no build: robots.txt, sitemap.xml e uma cópia do index.html por imóvel com título, descrição,
 * Open Graph, canonical e JSON-LD já no HTML (robôs e prévias de links não executam JavaScript).
 * Com o Supabase, rode o build de novo após publicar imóveis (ou troque por uma função de servidor).
 */
function seoPages(siteUrl: string): Plugin {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return {
    name: 'nexora-seo',
    apply: 'build',
    closeBundle() {
      const out = fileURLToPath(new URL('./dist/', import.meta.url));
      const base = readFileSync(`${out}index.html`, 'utf8');
      const published = demoProperties.filter((p) => p.status === 'publicado');
      const abs = (u: string) => (siteUrl ? siteUrl + u : u);
      for (const p of published) {
        const seo = propertySeo(p);
        const head = [
          `<title>${esc(seo.title)}</title>`,
          `<meta name="description" content="${esc(seo.description)}" />`,
          siteUrl ? `<link rel="canonical" href="${siteUrl}${seo.path}" />` : '',
          `<meta property="og:title" content="${esc(seo.title)}" />`,
          `<meta property="og:description" content="${esc(seo.description)}" />`,
          `<meta property="og:image" content="${abs(p.cover.thumb ?? p.cover.src)}" />`,
          siteUrl ? `<meta property="og:url" content="${siteUrl}${seo.path}" />` : '',
          `<script type="application/ld+json" data-seo-jsonld>${JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c')}</script>`,
        ].filter(Boolean).join('\n    ');
        const html = base
          .replace(/<title>[\s\S]*?<\/title>/, '')
          .replace(/<meta name="description"[^>]*>/, '')
          .replace(/<meta property="og:(title|description|image)"[^>]*>/g, '')
          .replace(/<link rel="preload" as="image"[^>]*>/, `<link rel="preload" as="image" href="${p.cover.thumb ?? p.cover.src}" fetchpriority="high" />`)
          .replace('</head>', `    ${head}\n  </head>`);
        mkdirSync(`${out}imovel/${p.slug}`, { recursive: true });
        writeFileSync(`${out}imovel/${p.slug}/index.html`, html);
      }
      const pages = ['/', '/imoveis', '/imoveis?finalidade=venda', '/imoveis?finalidade=aluguel', '/experiencia-3d', '/sobre', '/contato', '/privacidade', '/termos'];
      const urls = [...pages.map((u) => ({ loc: u, lastmod: undefined as string | undefined })), ...published.map((p) => ({ loc: `/imovel/${p.slug}`, lastmod: p.updatedAt.slice(0, 10) }))];
      writeFileSync(`${out}sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(abs(u.loc))}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);
      writeFileSync(`${out}robots.txt`, `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /entrar\nDisallow: /favoritos\nDisallow: /comparar\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    // modo "preview": build com caminhos relativos e rotas por hash, para hospedar como página estática num subcaminho
    base: mode === 'preview' ? './' : '/',
    define: mode === 'preview' ? { 'import.meta.env.VITE_ROUTER': JSON.stringify('hash') } : {},
    plugins: [react(), ...(mode === 'preview' ? [] : [seoPages((env.VITE_SITE_URL ?? '').replace(/\/$/, ''))])],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          // three/R3F não entram aqui: ficam nos pedaços carregados sob demanda pelo 3D e pela visita 360°
          manualChunks: (id) => {
            if (/node_modules\/(react|react-dom|react-router|scheduler)\//.test(id)) return 'react';
            if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion')) return 'motion';
            if (id.includes('node_modules/@supabase')) return 'supabase';
          },
        },
      },
    },
    test: { globals: true, environment: 'jsdom', setupFiles: './src/test/setup.ts', exclude: ['node_modules', 'dist', 'e2e'] },
  };
});
