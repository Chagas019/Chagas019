/**
 * Fontes do filme (doc 01 §3). Importar este módulo uma vez (em qualquer cena)
 * já dispara o carregamento com delayRender.
 */
import { loadFont as loadUnbounded } from "@remotion/google-fonts/Unbounded";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadYellowtail } from "@remotion/google-fonts/Yellowtail";
import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";

const unbounded = loadUnbounded("normal", {
  weights: ["700", "900"],
  subsets: ["latin", "latin-ext"],
});
const anton = loadAnton("normal", {
  weights: ["400"],
  subsets: ["latin", "latin-ext"],
});
// Yellowtail só publica o subset "latin" (U+0000–00FF já cobre Á, ª, Ç, Ã).
const yellowtail = loadYellowtail("normal", {
  weights: ["400"],
  subsets: ["latin"],
});
const bricolage = loadBricolage("normal", {
  weights: ["600", "800"],
  subsets: ["latin", "latin-ext"],
});

/** Unbounded 700/900 — GINCANA, UNIR, CUIDAR, 10ª… */
export const FONT_DISPLAY = unbounded.fontFamily;
/** Anton 400 — anel 3D, pilhas tipográficas. */
export const FONT_CONDENSED = anton.fontFamily;
/** Yellowtail 400 — somente "Solidária". */
export const FONT_SCRIPT = yellowtail.fontFamily;
/** Bricolage Grotesque 600/800 — PAFIES, EDIÇÃO. */
export const FONT_SANS = bricolage.fontFamily;

export const FONTS = {
  display: FONT_DISPLAY,
  condensed: FONT_CONDENSED,
  script: FONT_SCRIPT,
  sans: FONT_SANS,
} as const;

export const WEIGHTS = {
  display: { bold: 700, black: 900 },
  condensed: { regular: 400 },
  script: { regular: 400 },
  sans: { semibold: 600, extrabold: 800 },
} as const;

/** Promise que resolve quando todas as fontes carregaram (útil p/ medir texto). */
export const fontsReady = Promise.all([
  unbounded.waitUntilDone(),
  anton.waitUntilDone(),
  yellowtail.waitUntilDone(),
  bricolage.waitUntilDone(),
]);
