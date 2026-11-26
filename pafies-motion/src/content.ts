/**
 * content.ts — TODOS os textos exibidos no filme (lista fechada, docs/01 §8 e docs/02 §2).
 * Para trocar uma palavra, altere SOMENTE aqui. Não adicione datas, ano, horários, locais,
 * equipes, números (além de "10ª") ou informação institucional.
 */
export const TEXT = {
  /** Palavras-conceito (S01 e pilha rítmica do S03). */
  unir: 'UNIR',
  cuidar: 'CUIDAR',
  compartilhar: 'COMPARTILHAR',
  /** S02 e lockup final. */
  gincana: 'GINCANA',
  /** S03. */
  energia: 'ENERGIA',
  juntos: 'JUNTOS',
  /** S04 — texto do anel 3D ("✦" vira estrela vetorial dentro do AnelTexto). */
  ringText: 'SOLIDÁRIA ✦ ',
  /** S04 e lockup final (Yellowtail). */
  solidariaScript: 'Solidária',
  /** S05 — "10" + ordinal "ª" (desenhados separados para controlar o tamanho do ª). */
  dez: '10',
  ordinal: 'ª',
  edicao: 'EDIÇÃO',
  /** Lockup final. */
  pafies: 'PAFIES',
  dezEdicao: '10ª EDIÇÃO',
} as const;

export type TextKey = keyof typeof TEXT;
