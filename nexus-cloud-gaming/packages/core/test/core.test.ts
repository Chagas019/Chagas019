import { describe, expect, it } from 'vitest';
import {
  ACTIONS,
  DEFAULT_MAPPING,
  DEFAULT_PREFERENCES,
  EMPTY_FILTERS,
  GAMES,
  PLATFORMS,
  activeActions,
  allGenres,
  applyDeadzone,
  backoffDelay,
  callToAction,
  filterGames,
  getGame,
  gradeConnection,
  isPlayable,
  parseFilters,
  parseMapping,
  parsePreferences,
  recommendQuality,
  remap,
  serializeFilters,
  summarizeRtt,
  type Game,
} from '../src';

const base = getGame('supertuxkart')!;
const variant = (patch: Partial<Game>): Game => ({ ...base, ...patch });

describe('catálogo', () => {
  it('tem slugs únicos e plataformas conhecidas', () => {
    const slugs = GAMES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const ids = new Set(PLATFORMS.map((p) => p.id));
    for (const g of GAMES) expect(ids.has(g.platform)).toBe(true);
  });

  it('marca todos os títulos como demonstrativos e nenhum como operacional nesta fase', () => {
    expect(GAMES.every((g) => g.demo)).toBe(true);
    expect(GAMES.filter(isPlayable)).toHaveLength(0);
  });

  it('não inventa medições nem classificação indicativa', () => {
    for (const g of GAMES) {
      expect(g.bootSeconds).toBeNull();
      expect(g.maxQuality).toBeNull();
      expect(g.ageRating).toBeNull();
    }
  });

  it('não lista serviço oficial para Nintendo e lista para consoles com streaming oficial', () => {
    const byId = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));
    expect(byId.nintendo.officialServices).toHaveLength(0);
    expect(byId.nintendo.defaultAvailability).toBe('indisponivel');
    for (const id of ['ps5', 'xboxseries', 'steam'] as const) expect(byId[id].officialServices.length).toBeGreaterThan(0);
  });
});

describe('botão principal (callToAction)', () => {
  it('só oferece "Jogar" para títulos operacionais executados pelo NEXUS', () => {
    expect(callToAction(variant({ availability: 'operacional', access: 'nexus-stream' }))).toEqual({
      kind: 'play', label: 'Jogar', href: '/jogar/supertuxkart',
    });
    expect(callToAction(variant({ availability: 'operacional', access: 'nenhum' })).kind).toBe('unavailable');
  });

  it('mostra "Em breve" e "Indisponível" sem link', () => {
    expect(callToAction(variant({ availability: 'em-breve' }))).toEqual({ kind: 'soon', label: 'Em breve' });
    expect(callToAction(variant({ availability: 'indisponivel' }))).toEqual({ kind: 'unavailable', label: 'Indisponível' });
  });

  it('direciona ao serviço oficial quando existe e cai em indisponível quando não existe', () => {
    const xbox = callToAction(variant({ platform: 'xboxseries', availability: 'servico-oficial', access: 'servico-oficial' }));
    expect(xbox.kind).toBe('official');
    if (xbox.kind === 'official') expect(xbox.href).toMatch(/^https:\/\//);
    expect(callToAction(variant({ platform: 'nintendo', availability: 'servico-oficial' })).kind).toBe('unavailable');
  });
});

describe('pesquisa e filtros', () => {
  it('ignora acentos e caixa e exige todos os termos', () => {
    const r = filterGames(GAMES, { ...EMPTY_FILTERS, q: 'ESTRATEGIA turnos' });
    expect(r.map((g) => g.slug)).toEqual(['wesnoth']);
    expect(filterGames(GAMES, { ...EMPTY_FILTERS, q: 'kart' }).map((g) => g.slug)).toEqual(['supertuxkart']);
  });

  it('combina gênero, controle e toque', () => {
    const r = filterGames(GAMES, { ...EMPTY_FILTERS, controller: 'completo', touch: true });
    expect(r.map((g) => g.slug).sort()).toEqual(['supertux', 'supertuxkart']);
    expect(filterGames(GAMES, { ...EMPTY_FILTERS, genre: 'estrategia' }).every((g) => g.genres.includes('Estratégia'))).toBe(true);
  });

  it('devolve lista vazia para disponibilidade operacional nesta fase', () => {
    expect(filterGames(GAMES, { ...EMPTY_FILTERS, availability: 'operacional' })).toEqual([]);
  });

  it('descarta parâmetros desconhecidos e limita o texto', () => {
    const f = parseFilters(new URLSearchParams({ plataforma: 'dreamcast', disponibilidade: 'x', controle: 'completo', q: 'a'.repeat(500) }));
    expect(f.platform).toBeNull();
    expect(f.availability).toBeNull();
    expect(f.controller).toBe('completo');
    expect(f.q).toHaveLength(80);
  });

  it('serializa e lê de volta os mesmos filtros', () => {
    const f = { ...EMPTY_FILTERS, q: 'corrida', platform: 'livre' as const, touch: true };
    expect(parseFilters(new URLSearchParams(serializeFilters(f)))).toEqual(f);
    expect(serializeFilters(EMPTY_FILTERS)).toBe('');
  });

  it('lista gêneros únicos em ordem alfabética', () => {
    const g = allGenres(GAMES);
    expect(new Set(g).size).toBe(g.length);
    expect([...g].sort((a, b) => a.localeCompare(b, 'pt-BR'))).toEqual(g);
  });
});

describe('mapeamento de controle', () => {
  it('troca os botões ao reatribuir um já usado', () => {
    const m = remap(DEFAULT_MAPPING, 'confirmar', 1);
    expect(m.confirmar).toBe(1);
    expect(m.voltar).toBe(0);
    expect(new Set(Object.values(m)).size).toBe(ACTIONS.length);
  });

  it('rejeita índices inválidos', () => {
    expect(() => remap(DEFAULT_MAPPING, 'confirmar', -1)).toThrow(RangeError);
    expect(() => remap(DEFAULT_MAPPING, 'confirmar', 1.5)).toThrow(RangeError);
  });

  it('traduz botões pressionados em ações', () => {
    const pressed = Array(17).fill(false);
    pressed[0] = true;
    pressed[12] = true;
    expect(activeActions(pressed, DEFAULT_MAPPING)).toEqual(['confirmar', 'cima']);
  });

  it('recusa mapeamentos corrompidos ou duplicados', () => {
    expect(parseMapping(null)).toEqual(DEFAULT_MAPPING);
    expect(parseMapping({ ...DEFAULT_MAPPING, voltar: 0 })).toEqual(DEFAULT_MAPPING);
    const custom = remap(DEFAULT_MAPPING, 'iniciar', 16);
    expect(parseMapping(JSON.parse(JSON.stringify(custom)))).toEqual(custom);
  });

  it('aplica zona morta e reescala', () => {
    expect(applyDeadzone(0.1, 0.05)).toEqual([0, 0]);
    const [x, y] = applyDeadzone(1, 0);
    expect(x).toBeCloseTo(1);
    expect(y).toBe(0);
  });
});

describe('rede e reconexão', () => {
  it('classifica a conexão', () => {
    expect(gradeConnection({ rttMs: null })).toBe('offline');
    expect(gradeConnection({ rttMs: 20 })).toBe('excelente');
    expect(gradeConnection({ rttMs: 60 })).toBe('boa');
    expect(gradeConnection({ rttMs: 60, lossPct: 3 })).toBe('instavel');
    expect(gradeConnection({ rttMs: 300 })).toBe('ruim');
  });

  it('recomenda qualidade conforme conexão e banda', () => {
    expect(recommendQuality('offline')).toBeNull();
    expect(recommendQuality('excelente')).toBe('1080p60');
    expect(recommendQuality('excelente', 10)).toBe('720p60');
    expect(recommendQuality('boa', 5)).toBe('720p30');
  });

  it('cresce o atraso de reconexão até o teto', () => {
    const mid = () => 1;
    expect(backoffDelay(0, 500, 8000, mid)).toBe(500);
    expect(backoffDelay(3, 500, 8000, mid)).toBe(4000);
    expect(backoffDelay(10, 500, 8000, mid)).toBe(8000);
    expect(backoffDelay(10, 500, 8000, () => 0)).toBe(4000);
  });

  it('resume RTT com jitter', () => {
    expect(summarizeRtt([])).toBeNull();
    expect(summarizeRtt([40, 60, 50])).toEqual({ avg: 50, jitter: 15 });
  });
});

describe('preferências', () => {
  it('usa padrões para dados ausentes ou inválidos', () => {
    expect(parsePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences({ quality: '8k', touchOverlay: 'sim' })).toEqual(DEFAULT_PREFERENCES);
  });

  it('mantém valores válidos', () => {
    const p = parsePreferences({ quality: '720p60', vibration: false });
    expect(p.quality).toBe('720p60');
    expect(p.vibration).toBe(false);
  });
});
