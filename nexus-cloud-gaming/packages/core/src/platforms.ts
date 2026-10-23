import type { Platform, PlatformFamily, PlatformId } from './types';

/**
 * Plataformas exibidas no catálogo.
 *
 * Nenhuma plataforma de console é executada pelo NEXUS: não há licença nem
 * hardware para isso. Para elas, o catálogo aponta apenas para serviços
 * oficiais, sem afiliação, e descreve as limitações conhecidas.
 */
const SONY = {
  name: 'PlayStation Plus Premium',
  url: 'https://www.playstation.com/ps-plus/',
  note: 'Streaming oficial da Sony, por assinatura. Funciona em console, PlayStation Portal e app para PC; não roda no navegador do celular.',
};
const XBOX = {
  name: 'Xbox Cloud Gaming',
  url: 'https://www.xbox.com/play',
  note: 'Streaming oficial da Microsoft, incluído em planos específicos do Game Pass. Funciona no navegador, inclusive Safari no iPhone.',
};
const GFN = {
  name: 'GeForce NOW',
  url: 'https://www.nvidia.com/geforce-now/',
  note: 'Streaming de jogos que você já possui na Steam e em outras lojas, apenas títulos habilitados pelas publicadoras. Funciona no navegador.',
};
const STEAM_LINK = {
  name: 'Steam Link / Remote Play',
  url: 'https://store.steampowered.com/remoteplay',
  note: 'Transmite jogos do seu próprio PC com Steam. Requer o app Steam Link no celular.',
};

export const PLATFORMS: Platform[] = [
  { id: 'ps3', name: 'PlayStation 3', short: 'PS3', family: 'playstation', defaultAvailability: 'servico-oficial',
    summary: 'Parte do catálogo clássico é transmitida pela própria Sony. O NEXUS não executa nem emula jogos de PS3.',
    officialServices: [SONY] },
  { id: 'ps4', name: 'PlayStation 4', short: 'PS4', family: 'playstation', defaultAvailability: 'servico-oficial',
    summary: 'Acesso somente pelo serviço oficial da Sony, dentro do catálogo que ela disponibiliza.',
    officialServices: [SONY] },
  { id: 'ps5', name: 'PlayStation 5', short: 'PS5', family: 'playstation', defaultAvailability: 'servico-oficial',
    summary: 'Streaming de títulos de PS5 apenas pelo serviço oficial da Sony.',
    officialServices: [SONY] },
  { id: 'xbox', name: 'Xbox original', short: 'Xbox', family: 'xbox', defaultAvailability: 'servico-oficial',
    summary: 'Apenas alguns títulos retrocompatíveis aparecem no streaming oficial da Microsoft.',
    officialServices: [XBOX] },
  { id: 'xbox360', name: 'Xbox 360', short: 'X360', family: 'xbox', defaultAvailability: 'servico-oficial',
    summary: 'Seleção limitada de títulos retrocompatíveis no streaming oficial da Microsoft.',
    officialServices: [XBOX] },
  { id: 'xboxone', name: 'Xbox One', short: 'XB1', family: 'xbox', defaultAvailability: 'servico-oficial',
    summary: 'Títulos do catálogo do Game Pass com streaming, pelo serviço oficial.',
    officialServices: [XBOX] },
  { id: 'xboxseries', name: 'Xbox Series X|S', short: 'XSX', family: 'xbox', defaultAvailability: 'servico-oficial',
    summary: 'Títulos atuais com streaming habilitado, pelo serviço oficial da Microsoft.',
    officialServices: [XBOX] },
  { id: 'nintendo', name: 'Nintendo', short: 'NIN', family: 'nintendo', defaultAvailability: 'indisponivel',
    summary: 'Não há serviço oficial de streaming no navegador para o Brasil. O NEXUS não distribui ROMs nem BIOS.',
    officialServices: [] },
  { id: 'pc', name: 'PC', short: 'PC', family: 'pc', defaultAvailability: 'em-breve',
    summary: 'Jogos de PC com licença que permita execução em servidor serão transmitidos pelo NEXUS a partir da Fase 5.',
    officialServices: [GFN] },
  { id: 'steam', name: 'Steam', short: 'STM', family: 'pc', defaultAvailability: 'servico-oficial',
    summary: 'Conexão da conta pelo login oficial da Steam (sem pedir senha) está prevista. Streaming da sua biblioteca só por serviços autorizados.',
    officialServices: [GFN, STEAM_LINK] },
  { id: 'livre', name: 'Gratuitos e independentes', short: 'FREE', family: 'livre', defaultAvailability: 'em-breve',
    summary: 'Jogos de código aberto cuja licença permite execução e transmissão. São os primeiros candidatos ao streaming próprio.',
    officialServices: [] },
];

const BY_ID = new Map(PLATFORMS.map((p) => [p.id, p]));

export function getPlatform(id: PlatformId): Platform {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Plataforma desconhecida: ${id}`);
  return p;
}

export function isPlatformId(value: string): value is PlatformId {
  return BY_ID.has(value as PlatformId);
}

export const FAMILY_LABEL: Record<PlatformFamily, string> = {
  playstation: 'PlayStation',
  xbox: 'Xbox',
  nintendo: 'Nintendo',
  pc: 'PC e Steam',
  livre: 'Gratuitos',
};
