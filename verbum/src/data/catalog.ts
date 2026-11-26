// Catálogo verificado do VERBUM.
// - verified/sources.json: documentos da Igreja; cada URL foi conferida em resultado de busca (vatican.va, cnbb.org.br, celam.org).
// - verified/songs.json: faixas conferidas no Spotify (título, artista e link copiados do resultado).
// - verified/bible-site.json: padrão de links da Bíblia Ave-Maria online (só livros com endereço confirmado).
import sourcesJson from "./verified/sources.json";
import songsJson from "./verified/songs.json";
import bibleSite from "./verified/bible-site.json";
import { BIBLE_BOOKS } from "./bible-books";

export type SourceKind =
  | "catecismo" | "concilio" | "enciclica" | "exortacao" | "carta-apostolica" | "bula" | "instrucao" | "direito" | "cnbb" | "celam";

export type TheologicalSource = {
  id: string;
  title: string;
  author: string;
  kind: SourceKind;
  year: number;
  context: string;
  themes: string[]; // termos livres do documento
  themeIds: string[]; // temas da plataforma (curadoria editorial)
  url: string;
  verified: boolean;
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  themes: string[];
  contexts: string[];
  spotifyUrl: string;
  rationale: string;
};

export const KIND_LABEL: Record<SourceKind, string> = {
  catecismo: "Catecismo",
  concilio: "Concílio Vaticano II",
  enciclica: "Encíclica",
  exortacao: "Exortação apostólica",
  "carta-apostolica": "Carta apostólica",
  bula: "Bula",
  instrucao: "Instrução",
  direito: "Direito Canônico",
  cnbb: "CNBB",
  celam: "CELAM",
};

// Relação editorial documento → temas da plataforma (interpretação da curadoria, não do documento).
const SOURCE_THEMES: Record<string, string[]> = {
  "catecismo-igreja-catolica": ["fe-e-esperanca", "oracao", "eucaristia", "santidade"],
  "compendio-catecismo": ["fe-e-esperanca"],
  "dei-verbum": ["palavra-de-deus"],
  "lumen-gentium": ["santidade", "maria", "missao"],
  "sacrosanctum-concilium": ["eucaristia", "adoracao"],
  "gaudium-et-spes": ["familia", "missao"],
  "apostolicam-actuositatem": ["missao"],
  "ad-gentes": ["missao"],
  "evangelii-nuntiandi": ["missao", "palavra-de-deus"],
  "redemptor-hominis": ["amor-de-deus"],
  "dives-in-misericordia": ["misericordia", "perdao", "conversao"],
  "redemptoris-missio": ["missao"],
  "veritatis-splendor": ["santidade", "conversao"],
  "evangelium-vitae": ["familia", "amor-de-deus"],
  "fides-et-ratio": ["fe-e-esperanca"],
  "ecclesia-de-eucharistia": ["eucaristia", "adoracao"],
  "rosarium-virginis-mariae": ["maria", "oracao"],
  "novo-millennio-ineunte": ["santidade", "oracao", "missao"],
  "christifideles-laici": ["missao", "santidade"],
  "familiaris-consortio": ["familia"],
  "salvifici-doloris": ["sofrimento-e-cruz", "cura-e-libertacao"],
  "dominum-et-vivificantem": ["espirito-santo"],
  "redemptoris-mater": ["maria"],
  "deus-caritas-est": ["amor-de-deus"],
  "spe-salvi": ["fe-e-esperanca", "sofrimento-e-cruz"],
  "caritas-in-veritate": ["amor-de-deus", "missao"],
  "sacramentum-caritatis": ["eucaristia", "adoracao"],
  "verbum-domini": ["palavra-de-deus", "missao"],
  "porta-fidei": ["fe-e-esperanca"],
  "evangelii-gaudium": ["missao", "louvor"],
  "lumen-fidei": ["fe-e-esperanca"],
  "amoris-laetitia": ["familia", "misericordia"],
  "gaudete-et-exsultate": ["santidade"],
  "christus-vivit": ["missao", "santidade"],
  "misericordiae-vultus": ["misericordia", "perdao", "conversao"],
  "desiderio-desideravi": ["eucaristia"],
  "spes-non-confundit": ["fe-e-esperanca"],
  "dilexit-nos": ["amor-de-deus", "misericordia"],
  "dilexi-te": ["missao", "misericordia"],
  "redemptionis-sacramentum": ["eucaristia"],
  "dgae-2026-2032": ["missao"],
  "documento-de-aparecida": ["missao"],
};

export const SOURCES: TheologicalSource[] = (sourcesJson as Omit<TheologicalSource, "themeIds">[]).map((s) => ({
  ...s,
  themeIds: SOURCE_THEMES[s.id] ?? [],
}));

export const SOURCE_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s])) as Record<string, TheologicalSource>;

export const CATECHISM_URL = SOURCE_BY_ID["catecismo-igreja-catolica"]?.url ?? null;

export const SONGS: Song[] = songsJson as Song[];
export const SONG_BY_ID = Object.fromEntries(SONGS.map((s) => [s.id, s])) as Record<string, Song>;

export function youtubeSearchUrl(q: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

export function spotifySearchUrl(q: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(q)}`;
}

// ── Bíblia ────────────────────────────────────────────────────────────────
export type ParsedReference = { book: (typeof BIBLE_BOOKS)[number]; chapter: number; verses: string | null; display: string };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, "");

const BOOK_INDEX = new Map<string, (typeof BIBLE_BOOKS)[number]>();
for (const b of BIBLE_BOOKS) {
  BOOK_INDEX.set(norm(b.abbr), b);
  BOOK_INDEX.set(norm(b.name), b);
  for (const a of b.aliases ?? []) BOOK_INDEX.set(norm(a), b);
}

/** Interpreta referências como "Jo 3,16", "Lc 15,11-32", "Sl 51(50)", "1 Coríntios 13". */
export function parseReference(input: string): ParsedReference | null {
  const m = input.trim().match(/^([1-3]?\s?[A-Za-zÀ-ÿ]+(?:\s(?:dos|de)\s[A-Za-zÀ-ÿ]+)?)\.?\s*(\d{1,3})(?:\s*\(\d{1,3}\))?(?:\s*[,:]\s*([\d\s.,;\-–a-z]+))?$/i);
  if (!m) return null;
  const book = BOOK_INDEX.get(norm(m[1]));
  if (!book) return null;
  const chapter = Number(m[2]);
  if (chapter < 1 || chapter > book.chapters) return null;
  const verses = m[3]?.trim().replace(/–/g, "-") || null;
  return { book, chapter, verses, display: `${book.abbr} ${chapter}${verses ? "," + verses : ""}` };
}

const SLUGS = (bibleSite as { slugs?: Record<string, string> }).slugs ?? {};
const PATTERN = (bibleSite as { pattern?: string }).pattern ?? "";

/** Link para o capítulo na Bíblia Ave-Maria online, apenas para livros com endereço verificado. */
export function bibleChapterUrl(ref: ParsedReference): string | null {
  const slug = SLUGS[ref.book.abbr];
  if (!slug || !PATTERN) return null;
  return PATTERN.replace("{slug}", slug).replace("{chapter}", String(ref.chapter));
}

export const BIBLE_SITE_NAME = ((bibleSite as { site?: string }).site ?? "").replace(/\s*\(.*\)\s*$/, "");
