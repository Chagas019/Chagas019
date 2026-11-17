/**
 * Tokens do Design System KOINONIA (estilo "pôster editorial": grafite + verde neon), espelho de src/styles/globals.css.
 */
export const brand = {
  graphite: "#2B2B2B",
  neon: "#8CFF5A",
  card: "#1C1C1C",
  ink: "#F5F5F5",
} as const;

export const palette = {
  night: { 950: "#141414", 900: "#2B2B2B", 800: "#1C1C1C", 700: "#242424", 600: "#3A3A3A", 500: "#555555" },
  neon: { 200: "#D9FFC4", 300: "#B6FF8F", 400: "#8CFF5A", 500: "#6FE23D" },
  graphite: { 200: "#E5E5E5", 300: "#CFCFCF", 400: "#A3A3A3", 500: "#6B6B6B", 600: "#4A4A4A", 700: "#333333" },
  text: { ink: "#F5F5F5", muted: "#CBCBCB", subtle: "#ABABAB" },
  status: { success: "#5FE3A1", danger: "#FF7A70", warning: "#FFC44D", info: "#7CBCFF" },
} as const;

/** Pares texto/fundo validados por tests/unit/design-tokens.test.ts (WCAG AA ≥ 4.5). */
export const textPairs: ReadonlyArray<readonly [fg: string, bg: string, use: string]> = [
  [palette.text.ink, palette.night[900], "texto principal no fundo"],
  [palette.text.ink, palette.night[800], "texto em card"],
  [palette.text.muted, palette.night[800], "texto secundário em card"],
  [palette.text.muted, palette.night[900], "texto secundário no fundo"],
  [palette.text.subtle, palette.night[900], "texto sutil no fundo"],
  [palette.text.subtle, palette.night[700], "texto sutil em campo"],
  [palette.neon[400], palette.night[800], "destaque neon em card"],
  [palette.neon[400], palette.night[900], "destaque neon no fundo"],
  [palette.night[950], palette.neon[400], "texto em botão neon"],
  ["#FFFFFF", palette.graphite[600], "texto em botão grafite"],
  [palette.graphite[200], palette.night[800], "badge"],
  [palette.status.danger, palette.night[800], "erro"],
  [palette.status.success, palette.night[800], "sucesso"],
  [palette.status.warning, palette.night[800], "aviso"],
  [palette.status.info, palette.night[800], "informação"],
];

export const radius = { sm: "0.5rem", md: "0.75rem", lg: "1rem", xl: "1.1rem" } as const;
export const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;
