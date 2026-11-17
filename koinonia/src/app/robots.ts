import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/painel", "/perfil", "/conta", "/mensagens", "/admin", "/onboarding", "/match", "/auth/", "/design-system"] }],
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
  };
}
