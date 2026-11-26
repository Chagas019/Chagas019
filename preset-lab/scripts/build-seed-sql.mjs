#!/usr/bin/env node
// Gera o SQL de semente (catálogo de DEMONSTRAÇÃO) a partir de src/content/demo-catalog.mjs.
// Uso: node scripts/build-seed-sql.mjs > supabase/seed.sql
import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_CATEGORIES, DEMO_PRODUCTS, DEMO_COLLECTIONS, DEMO_INSPIRATION, DEMO_BANNERS } from "../src/content/demo-catalog.mjs";
import { demoId } from "../src/content/demo-ids.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => `array[${a.map(q).join(",")}]::text[]`;
const out = ["-- Semente de DEMONSTRAÇÃO do PRESET LAB (gerada por scripts/build-seed-sql.mjs). Não edite à mão.", "begin;"];

DEMO_CATEGORIES.forEach((c, i) =>
  out.push(`insert into public.categories (id, slug, name, description, kind, cover_image, sort_order) values (${q(demoId("category", c.slug))}, ${q(c.slug)}, ${q(c.name)}, ${q(c.description)}, ${q(c.kind)}, ${q(`/demo/scenes/${c.scene}.webp`)}, ${i}) on conflict (slug) do nothing;`)
);

DEMO_PRODUCTS.forEach((p, i) => {
  const id = demoId("product", p.slug);
  const gallery = [`/demo/products/${p.slug}-after.webp`, ...(p.gallery || []).map((_, j) => `/demo/products/${p.slug}-g${j + 1}.webp`)];
  out.push(`insert into public.products (id, slug, name, short_description, description, price_cents, product_type, access_mode, category_id, tags, cover_image, before_image, after_image, gallery, palette, formats, compatibility, install_instructions, creator_name, creator_handle, creator_bio, status, published_at, featured, is_demo)
values (${q(id)}, ${q(p.slug)}, ${q(p.name)}, ${q(p.short)}, ${q(p.description)}, ${p.price}, ${q(p.type)}, ${q(p.access)}, ${q(demoId("category", p.category))}, ${arr(p.tags)}, ${q(`/demo/products/${p.slug}-after.webp`)}, ${q(`/demo/products/${p.slug}-before.webp`)}, ${q(`/demo/products/${p.slug}-after.webp`)}, ${arr(gallery)}, ${arr(p.palette)}, ${arr(p.formats)}, ${arr(p.compatibility)}, '', ${q(p.creator.name)}, ${q(p.creator.handle)}, ${q(p.creator.bio)}, 'published', now() - interval '${(DEMO_PRODUCTS.length - i) * 3} days', ${p.featured}, true) on conflict (slug) do nothing;`);
  for (const ext of ["xmp", "zip"]) {
    const rel = `demo/${p.slug}/${p.slug}.${ext}`;
    let size = 0;
    try { size = statSync(path.join(root, "private-files", rel)).size; } catch {}
    out.push(`insert into public.product_files (id, product_id, file_name, storage_path, format, size_bytes) values (${q(demoId("file", `${p.slug}.${ext}`))}, ${q(id)}, ${q(`${p.slug}.${ext}`)}, ${q(rel)}, ${q(ext)}, ${size}) on conflict (storage_path) do nothing;`);
  }
});

DEMO_COLLECTIONS.forEach((c, i) => {
  const id = demoId("collection", c.slug);
  out.push(`insert into public.collections (id, slug, title, description, cover_image, is_premium, price_cents, featured, sort_order, is_demo) values (${q(id)}, ${q(c.slug)}, ${q(c.title)}, ${q(c.description)}, ${q(`/demo/scenes/${c.scene}.webp`)}, ${c.premium}, ${c.price ?? "null"}, true, ${i}, true) on conflict (slug) do nothing;`);
  c.products.forEach((s, j) => out.push(`insert into public.collection_products (collection_id, product_id, position) values (${q(id)}, ${q(demoId("product", s))}, ${j}) on conflict do nothing;`));
});

DEMO_INSPIRATION.forEach((p, i) =>
  out.push(`insert into public.inspiration_posts (id, slug, title, style_name, image_url, palette, description, product_ids, sort_order, is_demo) values (${q(demoId("inspiration", p.slug))}, ${q(p.slug)}, ${q(p.title)}, ${q(p.style)}, ${q(`/demo/inspiration/${p.slug}.webp`)}, ${arr(p.palette)}, ${q(p.description)}, array[${p.products.map((s) => q(demoId("product", s))).join(",")}]::uuid[], ${i}, true) on conflict (slug) do nothing;`)
);

DEMO_BANNERS.forEach((b) =>
  out.push(`insert into public.banners (id, title, subtitle, image_url, link_url, link_label, position) values (${q(demoId("banner", String(b.position)))}, ${q(b.title)}, ${q(b.subtitle)}, ${q(b.image)}, ${q(b.link)}, ${q(b.label)}, ${b.position}) on conflict (id) do nothing;`)
);
out.push("commit;");
console.log(out.join("\n"));
