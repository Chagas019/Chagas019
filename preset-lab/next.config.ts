import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : undefined;

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // permite rodar vários servidores de desenvolvimento lado a lado (ex.: testes E2E)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // uploads do Admin Studio no modo local passam pelo servidor; no Supabase vão direto para o Storage
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : [],
  },
  // arquivos privados de demonstração nunca vão para o bundle público
  outputFileTracingExcludes: { "*": ["./.data/**"] },
  // presets de demonstração acompanham só a rota que os entrega (nunca ficam públicos em /public)
  outputFileTracingIncludes: { "/api/files/[token]": ["./private-files/demo/**"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
