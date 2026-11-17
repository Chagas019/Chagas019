import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/** Rotas públicas + comunidades verificadas e oportunidades abertas (quando o banco está conectado). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  const now = new Date();
  const staticRoutes = ["", "/oportunidades", "/talentos", "/comunidades", "/cadastro", "/entrar", "/termos", "/privacidade"].map((p) => ({
    url: `${base}${p}`, lastModified: now, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.7,
  }));
  const supabase = await createClient().catch(() => null);
  if (!supabase) return staticRoutes;
  const [communities, opportunities] = await Promise.all([
    supabase.from("communities").select("slug, updated_at").eq("status", "verified").limit(5000),
    supabase.from("opportunities").select("id, updated_at").eq("status", "open").limit(5000),
  ]);
  return [
    ...staticRoutes,
    ...(communities.data ?? []).map((c) => ({ url: `${base}/comunidades/${c.slug}`, lastModified: new Date(c.updated_at as string), priority: 0.6 })),
    ...(opportunities.data ?? []).map((o) => ({ url: `${base}/oportunidades/${o.id}`, lastModified: new Date(o.updated_at as string), priority: 0.8 })),
  ];
}
