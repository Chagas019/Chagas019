import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'NEXUS Cloud Gaming',
    short_name: 'NEXUS',
    description: 'Seu universo gamer. Em qualquer tela.',
    lang: 'pt-BR',
    start_url: '/?origem=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['fullscreen', 'standalone'],
    orientation: 'any',
    background_color: '#05060f',
    theme_color: '#05060f',
    categories: ['games', 'entertainment'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Catálogo', url: '/catalogo' },
      { name: 'Testar controle', url: '/controle' },
    ],
  };
}
