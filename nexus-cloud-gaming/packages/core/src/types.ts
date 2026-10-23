/**
 * Tipos do domínio do catálogo.
 *
 * Regra central do produto: o estado de disponibilidade de um título decide
 * o que a interface pode oferecer. Só existe botão "Jogar" quando há uma
 * integração operacional e validada para aquele título.
 */

export type PlatformId =
  | 'ps3'
  | 'ps4'
  | 'ps5'
  | 'xbox'
  | 'xbox360'
  | 'xboxone'
  | 'xboxseries'
  | 'nintendo'
  | 'pc'
  | 'steam'
  | 'livre';

export type PlatformFamily = 'playstation' | 'xbox' | 'nintendo' | 'pc' | 'livre';

/**
 * Como o usuário chega ao jogo.
 * - `nexus-stream`: executado em servidor próprio do NEXUS e transmitido por WebRTC.
 * - `servico-oficial`: o jogo roda num serviço de terceiros autorizado; o NEXUS só direciona.
 * - `nenhum`: ainda não existe caminho legítimo e validado.
 */
export type AccessMethod = 'nexus-stream' | 'servico-oficial' | 'nenhum';

/**
 * - `operacional`: integração real, testada, com capacidade disponível. Único estado com "Jogar".
 * - `em-breve`: tecnicamente viável e legalmente liberado, mas ainda não implantado.
 * - `servico-oficial`: acesso apenas pelo serviço oficial externo.
 * - `indisponivel`: sem caminho legítimo hoje.
 */
export type Availability = 'operacional' | 'em-breve' | 'servico-oficial' | 'indisponivel';

export type ControllerSupport = 'completo' | 'parcial' | 'teclado-mouse';

export type StreamQuality = '720p30' | '720p60' | '1080p60' | '1440p60' | '4k60';

export interface OfficialService {
  name: string;
  url: string;
  /** Observação honesta sobre requisitos, assinatura ou limitações do serviço. */
  note: string;
}

export interface Platform {
  id: PlatformId;
  name: string;
  short: string;
  family: PlatformFamily;
  /** Texto que explica, sem promessas, como esta plataforma pode ser acessada. */
  summary: string;
  defaultAvailability: Availability;
  officialServices: OfficialService[];
}

export interface Game {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  developer: string;
  publisher: string;
  /** Licença do código e, quando diferente, dos assets. */
  license: string;
  sourceUrl: string;
  platform: PlatformId;
  genres: string[];
  /** Ano da primeira versão pública. `null` quando não confirmado. */
  releaseYear: number | null;
  /** Classificação indicativa (ClassInd). `null` quando não houver classificação oficial confirmada. */
  ageRating: string | null;
  /** Requisitos do servidor de execução. `null` até o benchmark da Fase 4. */
  serverRequirements: string | null;
  access: AccessMethod;
  availability: Availability;
  controller: ControllerSupport;
  touchControls: boolean;
  maxQuality: StreamQuality | null;
  /** Tempo estimado de inicialização em segundos, apenas quando medido. */
  bootSeconds: number | null;
  /** Paleta da capa gerada (arte original, sem imagens de terceiros). */
  cover: { from: string; to: string; glyph: string };
  featured?: boolean;
  popular?: boolean;
  /** Dado demonstrativo: entrou no catálogo, mas não há servidor executando. */
  demo: true;
}
