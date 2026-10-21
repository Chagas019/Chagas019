import { applyFilters, EMPTY_FILTERS, parseFilters, similarProperties, toSearchParams, mainArea } from '../filters';
import { demoProperties } from '@/data/properties';

const published = demoProperties.filter((p) => p.status === 'publicado');
const run = (q: string) => applyFilters(demoProperties, parseFilters(new URLSearchParams(q)));

describe('filtros do catálogo', () => {
  it('nunca mostra rascunhos', () => {
    expect(run('').map((p) => p.status)).not.toContain('rascunho');
    expect(run('')).toHaveLength(published.length);
  });
  it('filtra por finalidade, tipo e quartos combinados', () => {
    expect(run('finalidade=aluguel').every((p) => p.purpose === 'aluguel')).toBe(true);
    expect(run('tipo=casa&quartos=3').map((p) => p.slug)).toEqual(['casa-contemporanea-001']);
  });
  it('faixa de preço e área mínima (terreno usa a área do lote)', () => {
    expect(run('precoMin=1000000&precoMax=3000000').every((p) => p.price >= 1e6 && p.price <= 3e6)).toBe(true);
    expect(run('areaMin=1000').map((p) => p.slug)).toEqual(['terreno-005']);
  });
  it('busca por texto ignora acentos e maiúsculas', () => {
    expect(run('q=AGUAS').map((p) => p.slug)).toContain('casa-condominio-003');
  });
  it('bairro ou cidade', () => {
    expect(run('local=porto lume').every((p) => p.city === 'Porto Lume')).toBe(true);
  });
  it('estilo de vida e tour 3D', () => {
    expect(run('estilo=piscina').every((p) => p.lifestyle.includes('piscina'))).toBe(true);
    expect(run('tour3d=1').every((p) => !!p.model3d)).toBe(true);
  });
  it('ordena por preço, área e data', () => {
    const asc = run('ordem=preco-asc').map((p) => p.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const area = run('ordem=area-desc').map(mainArea);
    expect(area).toEqual([...area].sort((a, b) => b - a));
    const rec = run('ordem=recentes').map((p) => p.createdAt);
    expect(rec).toEqual([...rec].sort().reverse());
  });
  it('ignora parâmetros inválidos na URL', () => {
    const f = parseFilters(new URLSearchParams('tipo=castelo&quartos=-2&ordem=xyz&precoMin=abc'));
    expect(f).toEqual({ ...EMPTY_FILTERS });
  });
  it('ida e volta pela URL preserva os filtros', () => {
    const f = { ...EMPTY_FILTERS, tipo: 'casa' as const, quartos: 2, tour3d: true, ordem: 'preco-desc' as const };
    expect(parseFilters(toSearchParams(f))).toEqual(f);
  });
  it('semelhantes têm a mesma finalidade e excluem o próprio imóvel', () => {
    const p = published[0];
    const s = similarProperties(demoProperties, p);
    expect(s.every((x) => x.purpose === p.purpose && x.id !== p.id && x.status === 'publicado')).toBe(true);
  });
});
