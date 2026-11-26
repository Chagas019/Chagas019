/**
 * Design tokens — Gincana Solidária PAFIES · 10ª edição.
 * Fonte de verdade: docs/01-direcao-criativa.md (§2 paleta, §3 tipografia).
 */

export const COLORS = {
  navyNight: "#060F2E",
  navy: "#0B1A4A",
  navySoft: "#16296B",
  electric: "#1F5BFF",
  electricLight: "#5C8BFF",
  teal: "#2EC4D6",
  tealLight: "#8FEAF0",
  tealDeep: "#1A86B8",
  orange: "#FF7A00",
  amber: "#FFB547",
  hotOrange: "#FF5A1F",
  coral: "#FF7B6B",
  gold: "#E9B949",
  goldLight: "#FFE08A",
  goldDeep: "#A8741A",
  cream: "#FFF6E5",
  white: "#FFFFFF",
} as const;

export type ColorToken = keyof typeof COLORS;

/** Tons de pele dos personagens (doc 01 §5.6). */
export const SKIN = {
  light: "#F2C9A0",
  medium: "#C68A5E",
} as const;

export type GradientStop = { readonly offset: number; readonly color: string };

/** Stops para <linearGradient>/<radialGradient> em SVG (offset 0..1). */
export const GRADIENT_STOPS = {
  ribbon: [
    { offset: 0, color: COLORS.orange },
    { offset: 1, color: COLORS.amber },
  ],
  warm: [
    { offset: 0, color: COLORS.hotOrange },
    { offset: 1, color: COLORS.coral },
  ],
  heart: [
    { offset: 0, color: COLORS.tealLight },
    { offset: 0.45, color: COLORS.teal },
    { offset: 1, color: COLORS.tealDeep },
  ],
  gold: [
    { offset: 0, color: COLORS.goldLight },
    { offset: 0.45, color: COLORS.gold },
    { offset: 1, color: COLORS.goldDeep },
  ],
  bg: [
    { offset: 0, color: COLORS.navySoft },
    { offset: 0.55, color: COLORS.navy },
    { offset: 1, color: COLORS.navyNight },
  ],
  electric: [
    { offset: 0, color: COLORS.electricLight },
    { offset: 0.5, color: COLORS.electric },
    { offset: 1, color: COLORS.navy },
  ],
} as const satisfies Record<string, readonly GradientStop[]>;

export type GradientName = keyof typeof GRADIENT_STOPS;

/** Centros dos radiais (cx, cy em 0..1). */
export const GRADIENT_CENTERS = {
  heart: { cx: 0.35, cy: 0.3 },
  bg: { cx: 0.5, cy: 0.45 },
  electric: { cx: 0.5, cy: 0.5 },
} as const;

/** Degradês como strings CSS (para `background`). */
export const GRADIENTS = {
  ribbon: `linear-gradient(90deg, ${COLORS.orange} 0%, ${COLORS.amber} 100%)`,
  warm: `linear-gradient(135deg, ${COLORS.hotOrange} 0%, ${COLORS.coral} 100%)`,
  heart: `radial-gradient(circle at 35% 30%, ${COLORS.tealLight} 0%, ${COLORS.teal} 45%, ${COLORS.tealDeep} 100%)`,
  gold: `linear-gradient(180deg, ${COLORS.goldLight} 0%, ${COLORS.gold} 45%, ${COLORS.goldDeep} 100%)`,
  bg: `radial-gradient(ellipse at 50% 45%, ${COLORS.navySoft} 0%, ${COLORS.navy} 55%, ${COLORS.navyNight} 100%)`,
  electric: `radial-gradient(ellipse at 50% 50%, ${COLORS.electricLight} 0%, ${COLORS.electric} 50%, ${COLORS.navy} 100%)`,
} as const;

/** Escala tipográfica (px, base 1920×1080) — doc 01 §3 / doc 02 §S06. */
export const TYPE_SCALE = {
  hero: 300, // 260–340
  heroMin: 260,
  heroMax: 340,
  impact: 200, // 180–220
  impactMax: 220,
  script: 230, // 200–240
  ring: 110,
  support: 80, // 64–96
  sealGincana: 124,
  sealSolidaria: 150,
  sealPafies: 72,
  sealEdicao: 44,
  min: 48,
} as const;

export const TRACKING = {
  display900: "-0.02em",
  displayTight: "-0.03em",
  condensed: "0.04em",
  pafies: "0.12em",
  edicao: "0.25em",
  edicaoSeal: "0.2em",
} as const;

/** Sombras / brilhos. Estilo "esmalte do pin": sólidas, sem blur. */
export const SHADOWS = {
  text: `0 6px 0 ${COLORS.navyNight}`,
  textLarge: `0 8px 0 ${COLORS.navyNight}`,
  /** Borda interna opcional (use como WebkitTextStroke). */
  textInnerStroke: `2px ${COLORS.navySoft}`,
  ribbonShadow: { color: COLORS.navyNight, dy: 10, opacity: 0.3 },
  glowAmber: `drop-shadow(0 0 18px ${COLORS.amber}99)`,
  glowTeal: `drop-shadow(0 0 24px ${COLORS.teal}80)`,
  glowGold: `drop-shadow(0 0 20px ${COLORS.goldLight}88)`,
} as const;

/** Flash de impacto (2 frames). */
export const FLASH = {
  white: { color: COLORS.white, opacity: 0.35 },
  amber: { color: COLORS.amber, opacity: 0.35 },
  gold: { color: COLORS.goldLight, opacity: 0.25 },
} as const;

export const GRAIN = { opacity: 0.06, opacityBreak: 0.08, baseFrequency: 0.9 } as const;
