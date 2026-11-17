// Aplica as migrations do Supabase durante o build da Vercel, uma única vez cada.
// Só roda quando a integração Supabase da Vercel fornece POSTGRES_URL_NON_POOLING;
// sem essa variável (ou localmente), não faz nada. Nenhum segredo é impresso.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] sem conexão de banco configurada — pulando.");
  process.exit(0);
}

const root = new URL("..", import.meta.url).pathname;
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const sql = postgres(url, { ssl: local ? false : "require", max: 1, onnotice: () => {} });

try {
  await sql`create table if not exists public.koinonia_migrations (name text primary key, applied_at timestamptz not null default now())`;
  await sql`alter table public.koinonia_migrations enable row level security`;
  const done = new Set((await sql`select name from public.koinonia_migrations`).map((r) => r.name));
  const files = readdirSync(join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    const body = readFileSync(join(root, "supabase/migrations", file), "utf8");
    // ALTER TYPE ... ADD VALUE não pode rodar dentro de transação junto com outros comandos
    const needsNoTx = /alter type .* add value/i.test(body);
    if (needsNoTx) {
      await sql.unsafe(body);
      await sql`insert into public.koinonia_migrations (name) values (${file})`;
    } else {
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`insert into public.koinonia_migrations (name) values (${file})`;
      });
    }
    console.log(`[migrate] aplicada: ${file}`);
  }
  // catálogo de talentos (idempotente: on conflict do nothing)
  await sql.unsafe(readFileSync(join(root, "supabase/seed/01_catalog.sql"), "utf8"));
  console.log("[migrate] banco pronto.");
} catch (error) {
  console.error("[migrate] falhou:", error.message);
  process.exit(1);
} finally {
  await sql.end();
}
