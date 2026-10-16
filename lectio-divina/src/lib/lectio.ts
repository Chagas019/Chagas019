import { normalizeLiturgia, type Liturgia } from '../../lib/normalize.js';

export type { Liturgia, Leitura } from '../../lib/normalize.js';

const UPSTREAM = import.meta.env.VITE_LITURGIA_API || 'https://liturgia.up.railway.app/v2/';
const CACHE_KEY = (iso: string) => `lectio:v1:${iso}`;

function readCache(iso: string): Liturgia | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY(iso));
    return raw ? (JSON.parse(raw) as Liturgia) : null;
  } catch {
    return null;
  }
}

function writeCache(iso: string, l: Liturgia) {
  try {
    localStorage.setItem(CACHE_KEY(iso), JSON.stringify(l));
  } catch {
    /* sem espaço ou modo privado: segue sem cache */
  }
}

async function fromOwnApi(iso: string): Promise<Liturgia> {
  const r = await fetch(`/api/lectio?data=${iso}`, { headers: { accept: 'application/json' } });
  if (!r.ok || !r.headers.get('content-type')?.includes('json')) throw new Error(`api ${r.status}`);
  return (await r.json()) as Liturgia;
}

async function fromUpstream(iso: string): Promise<Liturgia> {
  const [ano, mes, dia] = iso.split('-');
  const url = new URL(UPSTREAM);
  url.searchParams.set('dia', String(Number(dia)));
  url.searchParams.set('mes', String(Number(mes)));
  url.searchParams.set('ano', ano);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fonte ${r.status}`);
  return normalizeLiturgia(await r.json(), iso);
}

/** Liturgia do dia: cache local → função /api do site → API pública direto. */
export async function fetchLectio(iso: string): Promise<Liturgia> {
  const cached = readCache(iso);
  if (cached) return cached;
  let l: Liturgia;
  try {
    l = await fromOwnApi(iso);
  } catch {
    l = await fromUpstream(iso);
  }
  writeCache(iso, l);
  return l;
}

/** Cor litúrgica → cor para a bolinha. */
export function liturgicalColor(cor: string): string {
  const c = cor.toLowerCase();
  if (c.includes('verde')) return '#2f9e57';
  if (c.includes('roxo') || c.includes('violeta')) return '#7b3fa0';
  if (c.includes('rosa')) return '#e48aa8';
  if (c.includes('vermelh')) return '#d1323a';
  if (c.includes('branc')) return '#f5f5f5';
  if (c.includes('preto')) return '#111111';
  return '#9ca3af';
}
