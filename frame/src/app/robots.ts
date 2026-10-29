import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: ["/", "/u/", "/p/", "/desafios", "/lab", "/comunidades"], disallow: ["/api/", "/collab/nova", "/configuracoes", "/salvos", "/notificacoes", "/moderacao", "/ai", "/publicar", "/onboarding"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
