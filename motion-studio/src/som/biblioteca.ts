// Catálogo de efeitos e regras de mixagem. Dono: agente SOM.
export const SFX = {
  whoosh: {arquivo: 'audio/sfx/whoosh.wav', volume: 0.45},
  pop: {arquivo: 'audio/sfx/pop.wav', volume: 0.5},
  click: {arquivo: 'audio/sfx/click.wav', volume: 0.4},
  notificacao: {arquivo: 'audio/sfx/notificacao.wav', volume: 0.45},
  impacto: {arquivo: 'audio/sfx/impacto.wav', volume: 0.55},
} as const;

export type NomeSfx = keyof typeof SFX;
export type Cue = {som: NomeSfx; frame: number; volume?: number};

/** Níveis de referência (ganho linear). Narração sempre manda. */
export const MIX = {narracao: 1, sfx: 1, trilha: 0.22, trilhaSobVoz: 0.08} as const;
