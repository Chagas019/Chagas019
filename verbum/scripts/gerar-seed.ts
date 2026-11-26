// Gera supabase/seed.sql a partir do catálogo verificado (fonte única: src/data).
// Uso: npm run db:seed-sql
import { writeFileSync } from "node:fs";
import { SOURCES, SONGS } from "../src/data/catalog";
import { PREACHERS } from "../src/data/preachers";
import { BIBLE_REFERENCES } from "../src/data/bible-references";
import { parseReference } from "../src/data/catalog";

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `array[${v.map(q).join(",")}]::text[]`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
const rows = (table: string, cols: string[], data: unknown[][], conflict = "id") =>
  `insert into public.${table} (${cols.join(", ")}) values\n` +
  data.map((r) => `  (${r.map(q).join(", ")})`).join(",\n") +
  `\non conflict (${conflict}) do update set ${cols.filter((c) => c !== conflict).map((c) => `${c} = excluded.${c}`).join(", ")};\n`;

let sql = "-- Gerado por scripts/gerar-seed.ts — não edite à mão.\n\n";
sql += rows("theological_sources", ["id", "title", "author", "kind", "year", "context", "themes", "url", "verified"],
  SOURCES.map((s) => [s.id, s.title, s.author, s.kind, s.year, s.context, [...s.themeIds, ...s.themes], s.url, s.verified]));
sql += "\n" + rows("songs", ["id", "title", "artist", "themes", "contexts", "spotify_url", "rationale", "verified", "source"],
  SONGS.map((s) => [s.id, s.title, s.artist, s.themes, s.contexts, s.spotifyUrl, s.rationale, true, "spotify"]));
sql += "\n" + rows("preachers", ["id", "name", "description", "official_url", "themes"],
  PREACHERS.map((p) => [p.id, p.name, p.description, p.officialUrl ?? null, p.themes]));
sql += "\n" + rows("bible_references", ["id", "reference", "book", "chapter", "verse_start", "verse_end", "title", "themes"],
  BIBLE_REFERENCES.map((b) => {
    const p = parseReference(b.reference)!;
    const v = p.verses?.match(/\d+/g)?.map(Number) ?? [];
    return [b.id, b.reference, p.book.abbr, p.chapter, v[0] ?? null, v.length > 1 ? v[v.length - 1] : v[0] ?? null, b.title, b.themes];
  }));
writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql);
console.log(`seed.sql: ${SOURCES.length} documentos, ${SONGS.length} músicas, ${PREACHERS.length} pregadores, ${BIBLE_REFERENCES.length} perícopes`);
