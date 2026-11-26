/**
 * Tokens V2 — linguagem das referências (docs/04-briefing-v2.md).
 * Fundos CHAPADOS (sem degradê/vinheta/grão), figuras em 3–4 cores, sem contorno.
 */

/** Fundos de cena — uma cor sólida por cena, troca por corte seco. */
export const BG_V2 = {
  electric: "#1F5BFF",
  orange: "#FF6A13",
  navy: "#0B1A4A",
  turquoise: "#2EC4D6",
} as const;

/** Paleta das figuras. */
export const INK_V2 = {
  orange: "#FF7A00",
  amber: "#FFB547",
  blue: "#1F5BFF",
  blueLight: "#2E86FF",
  white: "#FFFFFF",
  gold: "#FFD23F",
  navy: "#0B1A4A",
} as const;

/** Tons derivados (sombras em forma, chão, faixa) — ainda chapados. */
export const TONE_V2 = {
  /** Sombra em forma do corpo laranja/âmbar. */
  amberShade: "#FF8C1A",
  orangeDeep: "#E2530A",
  /** Faixa da cintura (cinza azulado, ref 1). */
  sash: "#C9C3D6",
  sashShade: "#A49DB6",
  /** Azul dos respingos mais profundo (sombra). */
  blueDeep: "#1440C8",
  /** Sombras de chão chapadas por fundo (tom escuro do próprio fundo). */
  groundOnOrange: "#E8560A",
  groundOnElectric: "#1A4BD6",
  groundOnNavy: "#071234",
  groundOnTurquoise: "#22A6B8",
  /** Pinceladas: tom claro/escuro de cada fundo. */
  strokeOnOrangeLight: "#FF8A3D",
  strokeOnOrangeDark: "#F2560A",
  strokeOnElectricLight: "#3D74FF",
  strokeOnElectricDark: "#1747D9",
  strokeOnNavyLight: "#16296B",
  strokeOnTurquoiseLight: "#5ED6E3",
} as const;

export type BgV2 = keyof typeof BG_V2;

/** Tipografia V2: Anton (anel/frases), Unbounded 900 (slams), Yellowtail (só "Solidária"). */
export const TYPE_V2 = {
  ringFont: 150,
  slam: 260,
  phrase: 180,
} as const;

/** Ritmo: 30 fps, 120 BPM → beat = 15 f; animação "on twos". */
export const RHYTHM_V2 = { fps: 30, beat: 15, twos: 2 } as const;
