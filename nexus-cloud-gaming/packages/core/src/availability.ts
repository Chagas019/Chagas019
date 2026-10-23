import { getPlatform } from './platforms';
import type { Availability, Game } from './types';

export type CallToAction =
  | { kind: 'play'; label: 'Jogar'; href: string }
  | { kind: 'official'; label: string; href: string; serviceName: string }
  | { kind: 'soon'; label: 'Em breve' }
  | { kind: 'unavailable'; label: 'Indisponível' };

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  operacional: 'Disponível',
  'em-breve': 'Em breve',
  'servico-oficial': 'Serviço oficial',
  indisponivel: 'Indisponível',
};

/**
 * Decide o botão principal de um jogo.
 *
 * O botão "Jogar" só aparece quando o título está operacional **e** é
 * executado pelo NEXUS (no navegador ou por streaming próprio). Qualquer outro caso cai em "Em breve",
 * "Indisponível" ou no link do serviço oficial — nunca num botão que
 * aparenta funcionar sem existir integração.
 */
export function callToAction(game: Game): CallToAction {
  if (game.availability === 'operacional' && (game.access === 'navegador' || game.access === 'nexus-stream')) {
    return { kind: 'play', label: 'Jogar', href: `/jogar/${game.slug}` };
  }
  if (game.availability === 'servico-oficial' || game.access === 'servico-oficial') {
    const service = getPlatform(game.platform).officialServices[0];
    if (service) {
      return { kind: 'official', label: `Abrir ${service.name}`, href: service.url, serviceName: service.name };
    }
    return { kind: 'unavailable', label: 'Indisponível' };
  }
  if (game.availability === 'em-breve') return { kind: 'soon', label: 'Em breve' };
  return { kind: 'unavailable', label: 'Indisponível' };
}

export function isPlayable(game: Game): boolean {
  return callToAction(game).kind === 'play';
}
