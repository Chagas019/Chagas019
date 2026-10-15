/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Caminhos relativos: o mesmo build funciona no site e dentro do Capacitor.
  base: './',
  plugins: [react()],
  worker: { format: 'es' },
  build: { target: 'es2020' },
  test: { environment: 'node', include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] },
});
