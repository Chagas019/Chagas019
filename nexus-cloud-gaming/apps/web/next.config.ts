import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * Cabeçalhos de segurança aplicados a todas as rotas.
 * - CSP: Next.js injeta scripts inline de hidratação, por isso 'unsafe-inline'
 *   em script-src nesta fase. A Fase 8 troca por nonce gerado no proxy.
 * - HSTS fica no proxy reverso (Caddy), que é quem termina o HTTPS.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'gamepad=(self), fullscreen=(self), screen-wake-lock=(self), camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  // Monorepo: rastreia dependências a partir da raiz para o build standalone do Docker.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: ['@nexus/core'],
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/' }] },
    ];
  },
};

export default nextConfig;
