/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Caminhos relativos: o build funciona na raiz de um domínio ou numa subpasta (GitHub Pages, Vercel, Netlify).
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // React e bibliotecas de interface num pedaço próprio; o motor 3D (three.js, R3F) fica nos
        // pedaços carregados sob demanda pela cena, baixados só quando ela é montada.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|scheduler|zustand|use-sync-external-store|framer-motion|motion-dom|motion-utils|lucide-react)\//.test(id)) return 'vendor';
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
