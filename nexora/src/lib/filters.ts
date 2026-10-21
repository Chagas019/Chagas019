/** Busca, filtros e ordenação do catálogo. Funções puras: o estado vive na URL (?tipo=casa&quartos=3...). */
import type { LifestyleId, Property, PropertyType, Purpose } from '@/types/property';
import { TYPE_LABEL } from './format';

export type SortKey = 'relevancia' | 'preco-asc' | 'preco-desc' | 'recentes' | 'area-desc' | 'area-asc';

export interface Filters {
  q: string;
  local: string;
  tipo: PropertyType | '';
  finalidade: Purpose | '';
  precoMin?: number;
  precoMax?: number;
  quartos?: number;
  areaMin?: number;
  vagas?: number;
  estilo: LifestyleId | '';
  tour3d: boolean;
  ordem: SortKey;
}

export const EMPTY_FILTERS: Filters = { q: '', local: '', tipo: '', finalidade: '', estilo: '', tour3d: false, ordem: 'relevancia' };

const SORTS: SortKey[] = ['relevancia', 'preco-asc', 'preco-desc', 'recentes', 'area-desc', 'area-asc'];
const TYPES = Object.keys(TYPE_LABEL) as PropertyType[];
const STYLES: LifestyleId[] = ['contemporaneas', 'alto-padrao', 'piscina', 'compactos', 'condominio', 'terrenos', 'comerciais'];

const posNum = (v: string | null) => {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function parseFilters(sp: URLSearchParams): Filters {
  const tipo = sp.get('tipo') as PropertyType;
  const fin = sp.get('finalidade') as Purpose;
  const estilo = sp.get('estilo') as LifestyleId;
  const ordem = sp.get('ordem') as SortKey;
  return {
    q: (sp.get('q') ?? '').slice(0, 80),
    local: (sp.get('local') ?? '').slice(0, 80),
    tipo: TYPES.includes(tipo) ? tipo : '',
    finalidade: fin === 'venda' || fin === 'aluguel' ? fin : '',
    precoMin: posNum(sp.get('precoMin')),
    precoMax: posNum(sp.get('precoMax')),
    quartos: posNum(sp.get('quartos')),
    areaMin: posNum(sp.get('areaMin')),
    vagas: posNum(sp.get('vagas')),
    estilo: STYLES.includes(estilo) ? estilo : '',
    tour3d: sp.get('tour3d') === '1',
    ordem: SORTS.includes(ordem) ? ordem : 'relevancia',
  };
}

export function toSearchParams(f: Partial<Filters>): URLSearchParams {
  const sp = new URLSearchParams();
  const set = (k: string, v: unknown) => {
    if (v === undefined || v === '' || v === false || v === null) return;
    if (k === 'ordem' && v === 'relevancia') return;
    sp.set(k, v === true ? '1' : String(v));
  };
  (Object.keys(f) as (keyof Filters)[]).forEach((k) => set(k, f[k]));
  return sp;
}

export const activeFilterCount = (f: Filters) =>
  [f.q, f.local, f.tipo, f.finalidade, f.precoMin, f.precoMax, f.quartos, f.areaMin, f.vagas, f.estilo, f.tour3d || undefined].filter((v) => v !== undefined && v !== '').length;

export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Área usada em filtros e ordenação: construída ou, para terrenos, a do lote */
export const mainArea = (p: Property) => p.builtArea ?? p.landArea ?? 0;

function matchesText(p: Property, q: string) {
  const terms = normalize(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const hay = normalize([p.name, p.neighborhood, p.city, p.state, TYPE_LABEL[p.type], p.headline, p.purpose, ...p.internalFeatures, ...p.externalFeatures].join(' '));
  return terms.every((t) => hay.includes(t));
}

export function applyFilters(list: Property[], f: Filters): Property[] {
  const local = normalize(f.local);
  const out = list.filter((p) => {
    if (p.status !== 'publicado') return false;
    if (!matchesText(p, f.q)) return false;
    if (local && !normalize(`${p.neighborhood} ${p.city}`).includes(local)) return false;
    if (f.tipo && p.type !== f.tipo) return false;
    if (f.finalidade && p.purpose !== f.finalidade) return false;
    if (f.precoMin !== undefined && p.price < f.precoMin) return false;
    if (f.precoMax !== undefined && p.price > f.precoMax) return false;
    if (f.quartos !== undefined && p.bedrooms < f.quartos) return false;
    if (f.vagas !== undefined && p.parking < f.vagas) return false;
    if (f.areaMin !== undefined && mainArea(p) < f.areaMin) return false;
    if (f.estilo && !p.lifestyle.includes(f.estilo)) return false;
    if (f.tour3d && !p.model3d) return false;
    return true;
  });
  return sortProperties(out, f.ordem);
}

export function sortProperties(list: Property[], ordem: SortKey): Property[] {
  const l = [...list];
  switch (ordem) {
    case 'preco-asc': return l.sort((a, b) => a.price - b.price);
    case 'preco-desc': return l.sort((a, b) => b.price - a.price);
    case 'recentes': return l.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'area-desc': return l.sort((a, b) => mainArea(b) - mainArea(a));
    case 'area-asc': return l.sort((a, b) => mainArea(a) - mainArea(b));
    default:
      // relevância: destaques primeiro, depois os mais recentes
      return l.sort((a, b) => Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt));
  }
}

/** Cidades e bairros existentes, para sugestões no campo de localização */
export function locationOptions(list: Property[]): string[] {
  const set = new Set<string>();
  list.filter((p) => p.status === 'publicado').forEach((p) => { set.add(p.city); set.add(p.neighborhood); });
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Imóveis semelhantes: mesma finalidade, depois tipo/estilo em comum e faixa de preço próxima */
export function similarProperties(all: Property[], p: Property, n = 3): Property[] {
  return all
    .filter((o) => o.id !== p.id && o.status === 'publicado' && o.purpose === p.purpose)
    .map((o) => ({
      o,
      score: (o.type === p.type ? 3 : 0) + o.lifestyle.filter((l) => p.lifestyle.includes(l)).length + (Math.abs(Math.log(o.price / p.price)) < 0.5 ? 2 : 0) + (o.city === p.city ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.o);
}
