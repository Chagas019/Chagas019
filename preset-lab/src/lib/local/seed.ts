import { statSync } from "node:fs";
import path from "node:path";
import { DEMO_BANNERS, DEMO_CATEGORIES, DEMO_COLLECTIONS, DEMO_INSPIRATION, DEMO_PRODUCTS } from "@/content/demo-catalog.mjs";
import { demoId } from "@/content/demo-ids.mjs";
import type { AccessMode, FileFormat, Product, ProductType } from "@/lib/types";
import type { LocalDB } from "./store";

/** Banco inicial do modo local: só o catálogo de demonstração. Nenhum usuário, compra ou venda. */
export function buildDemoSeed(): LocalDB {
  const t0 = Date.now();
  const iso = (daysAgo: number) => new Date(t0 - daysAgo * 86400000).toISOString();
  const products: Product[] = DEMO_PRODUCTS.map((p, i) => ({
    id: demoId("product", p.slug),
    slug: p.slug,
    name: p.name,
    short_description: p.short,
    description: p.description,
    price_cents: p.price,
    currency: "BRL",
    product_type: p.type as ProductType,
    access_mode: p.access as AccessMode,
    category_id: demoId("category", p.category),
    tags: p.tags,
    cover_image: `/demo/products/${p.slug}-after.webp`,
    before_image: `/demo/products/${p.slug}-before.webp`,
    after_image: `/demo/products/${p.slug}-after.webp`,
    gallery: [`/demo/products/${p.slug}-after.webp`, ...(p.gallery || []).map((_: string, j: number) => `/demo/products/${p.slug}-g${j + 1}.webp`)],
    palette: p.palette,
    formats: p.formats,
    compatibility: p.compatibility,
    install_instructions: "",
    creator_name: p.creator.name,
    creator_handle: p.creator.handle,
    creator_bio: p.creator.bio,
    status: "published",
    published_at: iso((DEMO_PRODUCTS.length - i) * 3),
    featured: p.featured,
    downloads_count: 0,
    is_demo: true,
    created_at: iso(60),
    updated_at: iso(60),
  }));

  const files = DEMO_PRODUCTS.flatMap((p) =>
    (["xmp", "zip"] as FileFormat[]).map((ext) => {
      const rel = `demo/${p.slug}/${p.slug}.${ext}`;
      let size = 0;
      try {
        size = statSync(path.join(process.cwd(), "private-files", rel)).size;
      } catch {}
      return { id: demoId("file", `${p.slug}.${ext}`), product_id: demoId("product", p.slug), file_name: `${p.slug}.${ext}`, storage_path: rel, format: ext, size_bytes: size, created_at: iso(60) };
    })
  );

  return {
    version: 1,
    users: [],
    sessions: [],
    auth_tokens: [],
    outbox: [],
    profiles: [],
    categories: DEMO_CATEGORIES.map((c, i) => ({ id: demoId("category", c.slug), slug: c.slug, name: c.name, description: c.description, kind: c.kind as "style" | "subject", cover_image: `/demo/scenes/${c.scene}.webp`, sort_order: i })),
    products,
    product_files: files,
    collections: DEMO_COLLECTIONS.map((c, i) => ({
      id: demoId("collection", c.slug),
      slug: c.slug,
      title: c.title,
      description: c.description,
      cover_image: `/demo/scenes/${c.scene}.webp`,
      is_premium: c.premium,
      price_cents: c.price,
      featured: true,
      status: "published",
      sort_order: i,
      is_demo: true,
      product_ids: c.products.map((s: string) => demoId("product", s)),
    })),
    favorites: [],
    purchases: [],
    subscriptions: [],
    downloads: [],
    inspiration_posts: DEMO_INSPIRATION.map((p, i) => ({
      id: demoId("inspiration", p.slug),
      slug: p.slug,
      title: p.title,
      style_name: p.style,
      image_url: `/demo/inspiration/${p.slug}.webp`,
      palette: p.palette,
      description: p.description,
      product_ids: p.products.map((s: string) => demoId("product", s)),
      status: "published",
      sort_order: i,
      is_demo: true,
    })),
    banners: DEMO_BANNERS.map((b) => ({ id: demoId("banner", String(b.position)), title: b.title, subtitle: b.subtitle, image_url: b.image, link_url: b.link, link_label: b.label, active: true, position: b.position })),
    payment_events: [],
    rate_limits: {},
  };
}
