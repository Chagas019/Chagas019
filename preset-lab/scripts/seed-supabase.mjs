#!/usr/bin/env node
/**
 * Envia os ARQUIVOS de demonstração (presets .xmp/.zip) para o bucket privado "preset-files" do Supabase.
 * As linhas do catálogo vêm de supabase/seed.sql (rode antes no SQL Editor ou com `supabase db reset`).
 * As imagens de demonstração são servidas pelo próprio app (public/demo), não precisam de upload.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });
const base = path.join(process.cwd(), "private-files", "demo");
const types = { xmp: "application/rdf+xml", zip: "application/zip" };
let n = 0;
for (const slug of await readdir(base)) {
  for (const file of await readdir(path.join(base, slug))) {
    const ext = file.split(".").pop();
    const { error } = await sb.storage.from("preset-files").upload(`demo/${slug}/${file}`, await readFile(path.join(base, slug, file)), { contentType: types[ext] ?? "application/octet-stream", upsert: true });
    if (error) throw new Error(`${slug}/${file}: ${error.message}`);
    n++;
  }
}
console.log(`OK: ${n} arquivos enviados para preset-files/demo/.`);
