/**
 * Exporta os imóveis de demonstração como SQL para o Supabase.
 * Uso: node scripts/export-seed.mjs > supabase/seed-imoveis.sql
 * As imagens apontam para /media/... do próprio site; para usar o Storage, envie os arquivos e troque as URLs.
 */
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'silent' });
const { demoProperties } = await server.ssrLoadModule('/src/data/properties.ts');
const { toRow } = await server.ssrLoadModule('/src/services/properties.ts');
const q = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : Array.isArray(v) && v.every((x) => typeof x === 'string') ? `array[${v.map((x) => `'${x.replace(/'/g, "''")}'`).join(',')}]::text[]` : typeof v === 'object' ? `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb` : `'${String(v).replace(/'/g, "''")}'`);
console.log('-- Imóveis de demonstração (fictícios). Gerado por scripts/export-seed.mjs');
for (const p of demoProperties) {
  const row = { ...toRow(p), created_at: p.createdAt };
  const cols = Object.keys(row);
  console.log(`insert into public.properties (${cols.join(', ')}) values (${cols.map((c) => q(row[c])).join(', ')}) on conflict (slug) do nothing;`);
  for (const [i, d] of (p.documents ?? []).entries()) console.log(`insert into public.property_documents (property_id, label, value, sort) select id, ${q(d.label)}, ${q(d.value)}, ${i} from public.properties where slug = ${q(p.slug)};`);
}
await server.close();
