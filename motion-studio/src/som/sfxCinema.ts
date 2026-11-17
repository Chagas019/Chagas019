// Catálogo de SFX cinematográficos + regras de mixagem "cinema". Dono: agente SOM.
// Arquivos gerados por scripts/gerar-sfx-cinema.mjs (síntese própria, seeds fixas → licença do estúdio).
// Todos normalizados a -20 LUFS integrados (true peak ≤ -4 dBTP); o `volume` abaixo é o ganho padrão de mix.
import type {NomeSfx} from './biblioteca';

export const SFX_CINEMA = {
  /** ar passando 1,1 s (+cauda). Pico de energia em 0,62 s. */
  whoosh_suave: {arquivo: 'audio/sfx/whoosh_suave.wav', volume: 0.35, duracaoS: 1.7, picoS: 0.62},
  /** sub 58→40 Hz + corpo grave, ataque arredondado de 4 ms. Pico no início. */
  impacto_suave: {arquivo: 'audio/sfx/impacto_suave.wav', volume: 0.5, duracaoS: 3.2, picoS: 0},
  /** sobe 2,6 s (ruído 400→6500 Hz + Ré agudo com trêmolo) e TERMINA no pico; cauda de reverb depois. */
  riser_luz: {arquivo: 'audio/sfx/riser_luz.wav', volume: 0.38, duracaoS: 4, picoS: 2.6},
  /** shimmer agudo (parciais de Ré maior 1,2–5,9 kHz). Ataque ~0,18 s. */
  brilho: {arquivo: 'audio/sfx/brilho.wav', volume: 0.28, duracaoS: 4, picoS: 0.18},
  /** inspiração suave (ruído 500→1400 Hz), sem tom. Pico em ~0,8 s. */
  respiro: {arquivo: 'audio/sfx/respiro.wav', volume: 0.25, duracaoS: 2.1, picoS: 0.8},
} as const;

export type NomeSfxCinema = keyof typeof SFX_CINEMA;

/** Cue em frames ABSOLUTOS. Aceita SFX cinema e os da biblioteca base. */
export type CueCinema = {
  som: NomeSfxCinema | NomeSfx;
  frame: number;
  volume?: number;
  /** frames do início do arquivo a pular (ex.: encurtar a subida do riser) */
  trimInicio?: number;
  /** duração máxima em frames (corta com fade-out, sem clique) */
  duracao?: number;
  /** fade-out em frames aplicado no fim de `duracao` (padrão 8) */
  fadeOut?: number;
  /** descrição do evento visual (documentação/QA) */
  evento?: string;
};

/**
 * Mix "cinema" — calibrado para a trilha masterizada a -20 LUFS (public/audio/trilha/confie-em-cristo.wav):
 * valores PADRÃO (usados quando a trilha não traz mapa de níveis por seção). Projetos com trilha de dinâmica larga
 * devem passar `TrilhaComNiveis` (ex.: trilhaConfie em src/projetos/confie-em-cristo/som.ts) para manter a trilha
 * 14–18 dB abaixo da voz (-16 LUFS) em TODO o vídeo, inclusive nos trechos esparsos.
 */
export const MIX_CINEMA = {
  narracao: 1,
  sfx: 1,
  trilha: 0.6,
  trilhaSobVoz: 0.19,
  /** rampa do ducking (descida e subida) */
  rampaMs: 250,
  /** a trilha já está baixa este tempo ANTES da 1ª sílaba */
  preMs: 80,
  /** segura abaixada após a última sílaba antes de subir */
  posMs: 180,
  /** palavras separadas por menos que isto contam como fala contínua (não "bombeia") */
  juntarMs: 450,
  /** crossfade entre os níveis de seções vizinhas (ver NivelSecao em ducking.ts) */
  transicaoSecaoFrames: 45,
  /** fade de entrada/saída da trilha na composição */
  fadeInFrames: 30,
  fadeOutFrames: 45,
} as const;
