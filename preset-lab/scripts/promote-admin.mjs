#!/usr/bin/env node
/**
 * Promove um usuário JÁ CADASTRADO a administrador. Não existe senha padrão nem admin pré-criado.
 *
 *   Supabase:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/promote-admin.mjs voce@exemplo.com
 *   Local:     node scripts/promote-admin.mjs voce@exemplo.com      (edita .data/db.json)
 *
 * Alternativa no Supabase: SQL Editor →
 *   update public.profiles set role = 'admin' where email = 'voce@exemplo.com';
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email.includes("@")) {
  console.error("Uso: node scripts/promote-admin.mjs <email>");
  process.exit(1);
}
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (url && key) {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb.from("profiles").update({ role: "admin" }).eq("email", email).select("id, email");
  if (error) throw error;
  if (!data.length) {
    console.error(`Nenhum perfil com o e-mail ${email}. Cadastre-se no site primeiro.`);
    process.exit(1);
  }
  console.log(`OK: ${email} agora é administrador (Supabase).`);
} else {
  const file = path.join(process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".data"), "db.json");
  const db = JSON.parse(await readFile(file, "utf8"));
  const p = db.profiles.find((x) => x.email === email);
  if (!p) {
    console.error(`Nenhum usuário local com o e-mail ${email}. Cadastre-se em /cadastro primeiro.`);
    process.exit(1);
  }
  p.role = "admin";
  await writeFile(file, JSON.stringify(db));
  console.log(`OK: ${email} agora é administrador (modo local).`);
}
