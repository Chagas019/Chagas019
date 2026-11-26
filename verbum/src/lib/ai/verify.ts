// Verificação pós-geração: cada referência devolvida pela IA é conferida no catálogo.
// O que não pode ser conferido é marcado como "não verificada" ou descartado, com aviso ao usuário.
import { SOURCE_BY_ID, SONG_BY_ID, CATECHISM_URL, parseReference, bibleChapterUrl, youtubeSearchUrl } from "@/data/catalog";
import { CATECHISM_REFS } from "@/data/catechism";
import { BIBLE_REFERENCES } from "@/data/bible-references";
import { FIXED_CELEBRATIONS } from "@/data/saints";
import { normalize } from "@/lib/search";
import type { Brief, RawOutline, SermonOutline, VerifiedRef } from "./schema";

export function verifyBible(reference: string, note: string): VerifiedRef {
  const parsed = parseReference(reference.replace(/^\s*cf\.?\s*/i, ""));
  if (!parsed) {
    return { label: reference, note, status: "nao-verificada", url: null, detail: "Não reconhecemos esta referência no cânon católico. Confira antes de usar." };
  }
  const label = parsed.display + (/\(\d+\)/.test(reference) ? reference.match(/\(\d+\)/)![0] : "");
  const verses = parsed.verses?.match(/\d+/g)?.map(Number) ?? [];
  // O maior capítulo da Bíblia (Sl 119) tem 176 versículos.
  if (verses.some((v) => v < 1 || v > 176) || (verses.length > 1 && verses[verses.length - 1] < verses[0] && !/[.;]/.test(parsed.verses ?? ""))) {
    return { label, note, status: "nao-verificada", url: bibleChapterUrl(parsed), detail: "Os versículos indicados não parecem existir. Confira antes de usar." };
  }
  const curated = BIBLE_REFERENCES.some((b) => b.reference.replace(/\(\d+\)/, "") === parsed.display);
  if (!parsed.verses || curated) {
    return { label, note, status: "verificada", url: bibleChapterUrl(parsed), detail: `${parsed.book.name} ${parsed.chapter}${curated ? " — perícope do catálogo do VERBUM" : ""}. Leia o texto na sua Bíblia antes de pregar.` };
  }
  return { label, note, status: "capitulo", url: bibleChapterUrl(parsed), detail: `Livro e capítulo conferidos (${parsed.book.name} ${parsed.chapter}); os versículos não foram conferidos automaticamente.` };
}

const range = (s: string): [number, number] | null => {
  const nums = s.match(/\d+/g)?.map(Number);
  if (!nums?.length) return null;
  const a = nums[0], b = nums.length > 1 ? nums[nums.length - 1] : nums[0];
  if (a < 1 || b > 2865 || b < a) return null;
  return [a, b];
};

export function verifyCatechism(paragraphs: string, note: string): VerifiedRef {
  const r = range(paragraphs);
  if (!r) return { label: `CIC ${paragraphs}`, note, status: "nao-verificada", url: CATECHISM_URL, detail: "Numeração fora do Catecismo (§§ 1–2865)." };
  const known = CATECHISM_REFS.find((c) => {
    const k = range(c.paragraphs)!;
    return r[0] <= k[1] && r[1] >= k[0];
  });
  const label = `CIC §§ ${r[0] === r[1] ? r[0] : `${r[0]}–${r[1]}`}`;
  return known
    ? { label, note, status: "verificada", url: CATECHISM_URL, detail: `Seção: “${known.title}” (§§ ${known.paragraphs}).` }
    : { label, note, status: "nao-verificada", url: CATECHISM_URL, detail: "Numeração válida, mas o conteúdo não está no nosso índice temático. Confira o texto no Catecismo." };
}

export function verifySaint(name: string, note: string): VerifiedRef {
  const core = (s: string) => normalize(s.split(",")[0]).replace(/^(sao|santo|santa|santos|santas|beato|beata) /, "").replace(/\s+/g, " ").trim();
  const n = core(name);
  if (/^(maria|virgem maria|nossa senhora|maria santissima|mae de deus|bem-aventurada virgem maria)$/.test(normalize(name).trim())) {
    return { label: name, note, status: "verificada", url: null, detail: "A Bem-aventurada Virgem Maria, Mãe de Deus. O uso indicado é sugestão da IA." };
  }
  const hit = n.length < 4 ? undefined : FIXED_CELEBRATIONS.find((f) => {
    // nome principal exato; celebrações com vários santos ("São Filipe e São Tiago") aceitam cada nome completo
    const parts = normalize(f.name.split(",")[0]).split(/ e (?=sao |santo |santa |santas |santos )/).map((x) => core(x));
    return core(f.name) === n || parts.includes(n);
  });
  return hit
    ? { label: name, note, status: "verificada", url: null, detail: `Consta no calendário litúrgico: ${hit.name} (${hit.date.split("-").reverse().join("/")}). O uso indicado é sugestão da IA.` }
    : { label: name, note, status: "nao-verificada", url: `https://www.google.com/search?q=${encodeURIComponent(`${name} santo católico biografia`)}`, detail: "Não encontramos este nome no calendário litúrgico da plataforma. Confira a biografia em fonte confiável antes de citar." };
}

export function verifyOutline(raw: RawOutline, brief: Brief, model: string): SermonOutline {
  const avisos = [...raw.avisos];
  const documentos: VerifiedRef[] = [];
  for (const d of raw.documentos) {
    const src = SOURCE_BY_ID[d.id];
    if (!src) { avisos.push(`A IA sugeriu um documento fora da biblioteca verificada (“${d.id}”); ele foi removido.`); continue; }
    documentos.push({ label: `${src.title} — ${src.author} (${src.year})`, note: d.como_usar, status: "verificada", url: src.url, detail: "Link oficial. A forma de uso é sugestão da IA; cite o documento lendo o texto original." });
  }
  const musicas: VerifiedRef[] = [];
  for (const m of raw.musicas) {
    const song = SONG_BY_ID[m.id];
    if (!song) { avisos.push(`Uma música sugerida (“${m.id}”) não está no catálogo verificado e foi removida.`); continue; }
    musicas.push({ label: `${song.title} — ${song.artist}`, note: `${m.momento}: ${m.por_que}`, status: "verificada", url: song.spotifyUrl, detail: youtubeSearchUrl(`${song.title} ${song.artist}`) });
  }
  const outline: SermonOutline = {
    brief,
    generatedAt: new Date().toISOString(),
    model,
    titulo: raw.titulo,
    titulos_alternativos: raw.titulos_alternativos.slice(0, 3),
    objetivo_central: raw.objetivo_central,
    introducao: raw.introducao,
    fundamentacao_biblica: raw.fundamentacao_biblica.map((b) => verifyBible(b.referencia, b.por_que)),
    contextualizacao: raw.contextualizacao,
    desenvolvimento: raw.desenvolvimento.map((t) => ({ topico: t.topico, conteudo: t.conteudo, referencias: t.referencias.map((r) => verifyBible(r, "")) })),
    catecismo: raw.catecismo.map((c) => verifyCatechism(c.paragrafos, c.como_usar)),
    documentos,
    santos: raw.santos.map((s) => verifySaint(s.nome, s.como_usar)),
    aplicacoes_praticas: raw.aplicacoes_praticas,
    perguntas_reflexao: raw.perguntas_reflexao,
    conclusao: raw.conclusao,
    musicas,
    avisos,
  };
  const unverified = [...outline.fundamentacao_biblica, ...outline.catecismo, ...outline.santos, ...outline.desenvolvimento.flatMap((d) => d.referencias)].filter((r) => r.status === "nao-verificada").length;
  if (unverified) outline.avisos.push(`${unverified} referência(s) não puderam ser verificadas automaticamente e estão sinalizadas.`);
  return outline;
}
