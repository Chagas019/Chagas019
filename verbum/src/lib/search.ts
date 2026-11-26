// Motor de busca do catálogo (funciona sem nenhuma integração externa).
// Arquitetura por provedores: o catálogo local responde sempre; provedores externos
// (YouTube, futuramente Supabase full-text / vetorial) somam resultados quando configurados.
import { THEMES, THEME_BY_ID, themeLabel } from "@/data/themes";
import { BIBLE_REFERENCES } from "@/data/bible-references";
import { CATECHISM_REFS } from "@/data/catechism";
import { FIXED_CELEBRATIONS } from "@/data/saints";
import { PREACHERS } from "@/data/preachers";
import {
  SOURCES, SONGS, KIND_LABEL, CATECHISM_URL, parseReference, bibleChapterUrl, youtubeSearchUrl, BIBLE_SITE_NAME,
} from "@/data/catalog";

export type Category = "biblia" | "musica" | "pregacao" | "santo" | "documento" | "catecismo" | "tema";

export const CATEGORY_LABEL: Record<Category, string> = {
  biblia: "Bíblia",
  musica: "Músicas",
  pregacao: "Pregações",
  santo: "Santos",
  documento: "Documentos da Igreja",
  catecismo: "Catecismo",
  tema: "Temas",
};

export type SearchResult = {
  id: string;
  category: Category;
  title: string;
  description: string;
  source: string;
  url: string | null;
  urlLabel?: string;
  themes: string[];
  score: number;
  verified: boolean;
  meta?: Record<string, string>;
};

export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

const STOP = new Set(["a", "o", "e", "de", "da", "do", "das", "dos", "em", "na", "no", "nas", "nos", "um", "uma", "para", "por", "com", "sobre", "que", "as", "os", "ao", "pregacao", "pregacoes", "tema"]);

export function tokens(q: string): string[] {
  return normalize(q).split(" ").filter((t) => t.length > 1 && !STOP.has(t));
}

/** Temas da plataforma que a consulta evoca (por rótulo ou palavra-chave). */
export function matchThemes(q: string): string[] {
  const nq = ` ${normalize(q)} `;
  const toks = tokens(q);
  const hits: string[] = [];
  for (const t of THEMES) {
    const label = normalize(t.label);
    const kw = t.keywords.map(normalize);
    if (nq.includes(` ${label} `) || kw.some((k) => (k.includes(" ") ? nq.includes(` ${k} `) : toks.includes(k)))) hits.push(t.id);
  }
  return hits;
}

function textScore(haystack: string, toks: string[], phrase: string): number {
  const h = ` ${normalize(haystack)} `;
  let s = 0;
  for (const t of toks) {
    if (h.includes(` ${t} `)) s += 3;
    else if (t.length >= 4 && h.includes(t.slice(0, Math.max(4, t.length - 2)))) s += 1.5; // radical: "perdoar" ~ "perdao"
  }
  if (phrase.length > 3 && h.includes(phrase)) s += 4;
  return s;
}

type Doc = Omit<SearchResult, "score"> & { text: string; titleText: string };

let INDEX: Doc[] | null = null;

function buildIndex(): Doc[] {
  const docs: Doc[] = [];
  for (const b of BIBLE_REFERENCES) {
    const parsed = parseReference(b.reference);
    const url = parsed ? bibleChapterUrl(parsed) : null;
    docs.push({
      id: `biblia:${b.id}`, category: "biblia", title: b.reference, description: b.title,
      source: "Sagrada Escritura", url, urlLabel: url ? `Ler o capítulo (${BIBLE_SITE_NAME || "Bíblia online"})` : undefined,
      themes: b.themes, verified: true, titleText: `${b.reference} ${b.title}`,
      text: `${b.reference} ${b.title} ${b.themes.map(themeLabel).join(" ")} ${parsed?.book.name ?? ""}`,
    });
  }
  for (const s of SONGS) {
    docs.push({
      id: `musica:${s.id}`, category: "musica", title: s.title, description: s.rationale,
      source: s.artist, url: s.spotifyUrl, urlLabel: "Ouvir no Spotify",
      themes: s.themes, verified: true, titleText: `${s.title} ${s.artist}`,
      text: `${s.title} ${s.artist} ${s.themes.map(themeLabel).join(" ")} ${s.contexts.join(" ")} ${s.rationale}`,
      meta: { youtube: youtubeSearchUrl(`${s.title} ${s.artist}`), contexts: s.contexts.join(", ") },
    });
  }
  for (const d of SOURCES) {
    docs.push({
      id: `documento:${d.id}`, category: d.kind === "catecismo" ? "catecismo" : "documento", title: d.title,
      description: d.context, source: `${d.author} · ${KIND_LABEL[d.kind]} · ${d.year}`, url: d.url,
      urlLabel: "Abrir texto oficial", themes: d.themeIds, verified: d.verified, titleText: d.title,
      text: `${d.title} ${d.author} ${KIND_LABEL[d.kind]} ${d.context} ${d.themes.join(" ")} ${d.themeIds.map(themeLabel).join(" ")}`,
    });
  }
  for (const c of CATECHISM_REFS) {
    docs.push({
      id: `catecismo:${c.id}`, category: "catecismo", title: `Catecismo §§ ${c.paragraphs}`, description: c.title,
      source: "Catecismo da Igreja Católica", url: CATECHISM_URL, urlLabel: "Consultar o Catecismo (vatican.va)",
      themes: c.themes, verified: true, titleText: `${c.title} catecismo ${c.paragraphs}`,
      text: `catecismo ${c.paragraphs} ${c.title} ${c.themes.map(themeLabel).join(" ")}`,
    });
  }
  for (const f of FIXED_CELEBRATIONS) {
    const [m, d] = f.date.split("-");
    const rank = { S: "Solenidade", F: "Festa", M: "Memória", m: "Memória facultativa" }[f.rank];
    docs.push({
      id: `santo:${f.date}:${normalize(f.name).slice(0, 40)}`, category: "santo", title: f.name,
      description: `${rank} · celebrada em ${d}/${m}${f.brazil ? " (calendário próprio do Brasil)" : ""}`,
      source: "Calendário Romano Geral", url: null, themes: /Maria|Nossa Senhora|Mãe de Deus/i.test(f.name) ? ["maria", "santidade"] : ["santidade"],
      verified: true, titleText: f.name, text: `${f.name} ${rank}`,
    });
  }
  for (const p of PREACHERS) {
    docs.push({
      id: `pregacao:${p.id}`, category: "pregacao", title: p.name, description: p.description,
      source: p.officialUrl ? new URL(p.officialUrl).hostname.replace("www.", "") : "Pregador católico",
      url: youtubeSearchUrl(`${p.name} pregação`), urlLabel: "Buscar pregações no YouTube",
      themes: p.themes, verified: true, titleText: p.name,
      text: `${p.name} ${p.description} pregador pregacao ${p.themes.map(themeLabel).join(" ")}`,
      meta: p.officialUrl ? { official: p.officialUrl } : undefined,
    });
  }
  for (const t of THEMES) {
    docs.push({
      id: `tema:${t.id}`, category: "tema", title: t.label, description: t.short, source: "Temas do VERBUM",
      url: `/assistente?tema=${encodeURIComponent(t.label)}`, urlLabel: "Preparar pregação com este tema",
      themes: [t.id], verified: true, titleText: t.label, text: `${t.label} ${t.short} ${t.keywords.join(" ")}`,
    });
  }
  return docs;
}

export function getIndex(): Doc[] {
  if (!INDEX) INDEX = buildIndex();
  return INDEX;
}

export type SearchOptions = { categories?: Category[]; limit?: number; themes?: string[] };

export function searchCatalog(query: string, opts: SearchOptions = {}): { results: SearchResult[]; matchedThemes: string[]; reference: SearchResult | null } {
  const q = query.trim().slice(0, 200);
  const phrase = normalize(q);
  // Expressões compostas de temas ("espírito santo", "nossa senhora") contam como tema, não como palavras soltas.
  let rest = ` ${phrase} `;
  for (const t of THEMES) for (const k of [t.label, ...t.keywords].map(normalize)) if (k.includes(" ") && rest.includes(` ${k} `)) rest = rest.replace(` ${k} `, " ");
  const toks = tokens(rest);
  const themeHits = [...new Set([...(opts.themes ?? []), ...matchThemes(q)])];
  const cats = opts.categories?.length ? new Set(opts.categories) : null;

  // Referência bíblica digitada diretamente ("Jo 3,16")
  let reference: SearchResult | null = null;
  const parsed = parseReference(q);
  if (parsed) {
    const url = bibleChapterUrl(parsed);
    reference = {
      id: `ref:${parsed.display}`, category: "biblia", title: parsed.display,
      description: `${parsed.book.name}, capítulo ${parsed.chapter}${parsed.verses ? `, versículos ${parsed.verses}` : ""}. Referência válida no cânon católico.`,
      source: "Sagrada Escritura", url, urlLabel: url ? `Ler o capítulo (${BIBLE_SITE_NAME})` : undefined,
      themes: [], score: 100, verified: true,
    };
  }

  const results: SearchResult[] = [];
  for (const d of getIndex()) {
    if (cats && !cats.has(d.category)) continue;
    if (parsed) {
      // Busca por referência: mostra as perícopes do mesmo livro, priorizando o mesmo capítulo.
      if (d.category !== "biblia") continue;
      const p2 = parseReference(d.title);
      if (!p2 || p2.book.abbr !== parsed.book.abbr) continue;
      const { text: _t, titleText: _tt, ...rest } = d;
      results.push({ ...rest, score: p2.chapter === parsed.chapter ? 20 : 5 });
      continue;
    }
    let score = textScore(d.text, toks, phrase) + textScore(d.titleText, toks, phrase) * 1.5;
    const shared = d.themes.filter((t) => themeHits.includes(t)).length;
    score += shared * 5;
    if (!q && opts.themes?.length) score = shared * 5;
    if (score <= 0) continue;
    const { text: _t, titleText: _tt, ...rest } = d;
    results.push({ ...rest, score: Math.round(score * 10) / 10 });
  }
  results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return { results: results.slice(0, opts.limit ?? 60), matchedThemes: themeHits, reference };
}

/** Recupera o contexto verificado para o assistente (RAG sobre o catálogo). */
export function retrieveForTheme(theme: string, passage?: string) {
  const { results, matchedThemes } = searchCatalog(`${theme} ${passage ?? ""}`, { limit: 200 });
  const pick = (c: Category, n: number) => results.filter((r) => r.category === c).slice(0, n);
  return {
    matchedThemes,
    bible: pick("biblia", 8),
    catechism: pick("catecismo", 6),
    documents: pick("documento", 6),
    songs: pick("musica", 8),
    saints: pick("santo", 4),
  };
}

export { THEME_BY_ID };
