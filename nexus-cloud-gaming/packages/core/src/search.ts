import { isPlatformId } from './platforms';
import type { Availability, ControllerSupport, Game, PlatformId } from './types';

export interface CatalogFilters {
  q: string;
  platform: PlatformId | null;
  genre: string | null;
  availability: Availability | null;
  controller: ControllerSupport | null;
  touch: boolean;
}

export const EMPTY_FILTERS: CatalogFilters = {
  q: '',
  platform: null,
  genre: null,
  availability: null,
  controller: null,
  touch: false,
};

const AVAILABILITIES: Availability[] = ['operacional', 'em-breve', 'servico-oficial', 'indisponivel'];
const CONTROLLERS: ControllerSupport[] = ['completo', 'parcial', 'teclado-mouse'];

/** Remove acentos e caixa para comparar "estrategia" com "Estratégia". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Lê filtros de uma query string sem confiar nela: valores desconhecidos
 * são descartados e o texto é limitado em tamanho.
 */
export function parseFilters(params: URLSearchParams): CatalogFilters {
  const platform = params.get('plataforma');
  const availability = params.get('disponibilidade');
  const controller = params.get('controle');
  return {
    q: (params.get('q') ?? '').slice(0, 80),
    platform: platform && isPlatformId(platform) ? platform : null,
    genre: params.get('genero')?.slice(0, 40) || null,
    availability: AVAILABILITIES.includes(availability as Availability) ? (availability as Availability) : null,
    controller: CONTROLLERS.includes(controller as ControllerSupport) ? (controller as ControllerSupport) : null,
    touch: params.get('toque') === '1',
  };
}

export function serializeFilters(f: CatalogFilters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.platform) p.set('plataforma', f.platform);
  if (f.genre) p.set('genero', f.genre);
  if (f.availability) p.set('disponibilidade', f.availability);
  if (f.controller) p.set('controle', f.controller);
  if (f.touch) p.set('toque', '1');
  return p.toString();
}

function matchesText(game: Game, q: string): boolean {
  if (!q) return true;
  const haystack = normalize([game.name, game.tagline, game.developer, ...game.genres].join(' '));
  return normalize(q)
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

export function filterGames(games: Game[], f: CatalogFilters): Game[] {
  const genre = f.genre ? normalize(f.genre) : null;
  return games.filter(
    (g) =>
      matchesText(g, f.q) &&
      (!f.platform || g.platform === f.platform) &&
      (!genre || g.genres.some((x) => normalize(x) === genre)) &&
      (!f.availability || g.availability === f.availability) &&
      (!f.controller || g.controller === f.controller) &&
      (!f.touch || g.touchControls),
  );
}

export function allGenres(games: Game[]): string[] {
  return [...new Set(games.flatMap((g) => g.genres))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
