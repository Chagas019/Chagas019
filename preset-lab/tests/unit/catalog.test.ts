import { describe, expect, it } from "vitest";
import { applyProductQuery, parseCatalogParams } from "@/lib/catalog";
import type { Product } from "@/lib/types";

const base = (o: Partial<Product>): Product =>
  ({ id: o.slug, slug: "x", name: "X", short_description: "", description: "", price_cents: 0, currency: "BRL", product_type: "free", access_mode: "free", category_id: null, tags: [], cover_image: null, before_image: null, after_image: null, gallery: [], palette: [], formats: [], compatibility: [], install_instructions: "", creator_name: "", creator_handle: "", creator_bio: "", status: "published", published_at: "2026-01-01T00:00:00Z", featured: false, downloads_count: 0, is_demo: true, created_at: "2026-01-01T00:00:00Z", updated_at: "", ...o }) as Product;

const list = [
  base({ slug: "neon-noir", name: "Neon Noir", product_type: "premium", access_mode: "purchase_only", price_cents: 2990, tags: ["cinematic", "street"], downloads_count: 5, published_at: "2026-03-01T00:00:00Z" }),
  base({ slug: "golden", name: "Golden Dunes", tags: ["landscape"], downloads_count: 50, published_at: "2026-02-01T00:00:00Z" }),
  base({ slug: "cafe", name: "Café Pálido", description: "luz de manhã", tags: ["clean"], published_at: "2026-04-01T00:00:00Z" }),
  base({ slug: "rascunho", name: "Rascunho", status: "draft" }),
];
const cats = new Map([["cinematic", "cat-cine"]]);

describe("catálogo", () => {
  it("esconde rascunhos", () => expect(applyProductQuery(list, {}, cats).map((p) => p.slug)).not.toContain("rascunho"));
  it("filtra gratuitos/premium", () => {
    expect(applyProductQuery(list, { access: "premium" }, cats).map((p) => p.slug)).toEqual(["neon-noir"]);
    expect(applyProductQuery(list, { access: "free" }, cats)).toHaveLength(2);
  });
  it("filtra por categoria (tag)", () => expect(applyProductQuery(list, { category: "street" }, cats).map((p) => p.slug)).toEqual(["neon-noir"]));
  it("busca sem acento e por vários termos", () => {
    expect(applyProductQuery(list, { q: "cafe palido" }, cats).map((p) => p.slug)).toEqual(["cafe"]);
    expect(applyProductQuery(list, { q: "MANHÃ" }, cats).map((p) => p.slug)).toEqual(["cafe"]);
  });
  it("ordena", () => {
    expect(applyProductQuery(list, { sort: "popular" }, cats)[0].slug).toBe("golden");
    expect(applyProductQuery(list, { sort: "recent" }, cats)[0].slug).toBe("cafe");
    expect(applyProductQuery(list, { sort: "price_desc" }, cats)[0].slug).toBe("neon-noir");
  });
  it("parseCatalogParams descarta valores inválidos", () => {
    expect(parseCatalogParams({ acesso: "hack", categoria: "../x", ordem: "drop table" })).toEqual({ q: undefined, category: undefined, access: undefined, sort: "recent" });
    expect(parseCatalogParams({ acesso: "free", categoria: "moody", q: " neon " })).toMatchObject({ access: "free", category: "moody", q: "neon" });
  });
});
