import { z } from "zod";
import type { Product, ProductQuery, SortOption } from "@/lib/types";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Lançamentos" },
  { value: "popular", label: "Mais baixados" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "name", label: "Nome (A–Z)" },
];

const querySchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  categoria: z.string().regex(/^[a-z0-9-]{1,40}$/).optional().catch(undefined),
  acesso: z.enum(["free", "premium"]).optional().catch(undefined),
  ordem: z.enum(["recent", "popular", "price_asc", "price_desc", "name"]).optional().catch(undefined),
});

/** Converte os parâmetros da URL do marketplace em uma consulta validada. */
export function parseCatalogParams(sp: Record<string, string | string[] | undefined>): ProductQuery {
  const pick = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined)) || undefined;
  const r = querySchema.parse({ q: pick("q"), categoria: pick("categoria"), acesso: pick("acesso"), ordem: pick("ordem") });
  return { q: r.q || undefined, category: r.categoria, access: r.acesso, sort: r.ordem ?? "recent" };
}

export function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Filtro/ordenação em memória (modo local). O Supabase faz o equivalente em SQL. */
export function applyProductQuery(all: Product[], query: ProductQuery, categoryIdBySlug: Map<string, string>): Product[] {
  let list = all.filter((p) => query.includeUnpublished || p.status === "published");
  if (query.ids) {
    const ids = new Set(query.ids);
    list = list.filter((p) => ids.has(p.id));
  }
  if (query.access === "free") list = list.filter((p) => p.product_type === "free");
  if (query.access === "premium") list = list.filter((p) => p.product_type === "premium");
  if (query.featured) list = list.filter((p) => p.featured);
  if (query.category) {
    const catId = categoryIdBySlug.get(query.category);
    list = list.filter((p) => p.tags.includes(query.category!) || (catId !== undefined && p.category_id === catId));
  }
  if (query.q) {
    const terms = normalize(query.q).split(/\s+/).filter(Boolean);
    list = list.filter((p) => {
      const hay = normalize([p.name, p.short_description, p.description, p.tags.join(" "), p.creator_name].join(" "));
      return terms.every((t) => hay.includes(t));
    });
  }
  list = sortProducts(list, query.sort ?? "recent");
  return query.limit ? list.slice(0, query.limit) : list;
}

export function sortProducts(list: Product[], sort: SortOption): Product[] {
  const date = (p: Product) => Date.parse(p.published_at ?? p.created_at) || 0;
  const copy = [...list];
  switch (sort) {
    case "popular":
      return copy.sort((a, b) => b.downloads_count - a.downloads_count || date(b) - date(a));
    case "price_asc":
      return copy.sort((a, b) => a.price_cents - b.price_cents || a.name.localeCompare(b.name));
    case "price_desc":
      return copy.sort((a, b) => b.price_cents - a.price_cents || a.name.localeCompare(b.name));
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    default:
      return copy.sort((a, b) => date(b) - date(a));
  }
}

/** Escapa curingas para uso seguro em filtros ILIKE do PostgREST. */
export function escapeIlike(s: string) {
  return s.replace(/[\\%_,()*."']/g, " ").trim();
}
