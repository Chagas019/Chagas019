/**
 * content-v2.ts — TODOS os textos da V2 (roteiro obrigatório, docs/04-briefing-v2.md).
 * Lista fechada: nada de datas, ano, locais, equipes. Altere SOMENTE aqui.
 */
export const TEXT_V2 = {
  /** V1 */
  eAi: 'E AÍ,',
  /** V2 — o anel repete a frase; "✦" vira estrela vetorial no AnelFrase. */
  preparados: 'ESTÃO PREPARADOS',
  preparadosRing: 'ESTÃO PREPARADOS ✦ ',
  /** V3 — "PARA A" + "10ª" (ouro gigante; "10" e "ª" separados p/ controlar o ordinal) + "GINCANA?" */
  paraA: 'PARA A',
  dez: '10',
  ordinal: 'ª',
  gincanaQ: 'GINCANA?',
  /** V4 */
  chegando: 'TÁ CHEGANDO,',
  hein: 'HEIN?',
  /** V5 — selo final */
  seloGincana: 'GINCANA',
  seloSolidaria: 'Solidária',
  seloPafies: 'PAFIES',
  seloEdicao: '10ª EDIÇÃO',
} as const;

export type TextKeyV2 = keyof typeof TEXT_V2;
