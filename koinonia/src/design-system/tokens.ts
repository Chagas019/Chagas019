/**
 * Tokens do Design System KOINONIA (tema escuro elegante: azul-marinho + dourado), espelho de src/styles/globals.css.
 * Use as classes Tailwind geradas (ex.: bg-gold-400, text-ink-muted) nos componentes;
 * este arquivo serve a documentação, testes de contraste e usos fora do CSS.
 */
export const brand = {
  navy: "#101C35",
  gold: "#D6AE62",
  canvas: "#0A1222",
  ink: "#F7F5F0",
} as const;

export const palette = {
  night: { 950: "#050A15", 900: "#0A1222", 800: "#101C35", 700: "#15233F", 600: "#22314F", 500: "#34466D" },
  gold: { 200: "#F1E0BC", 300: "#E4C68A", 400: "#D6AE62", 500: "#C29A4C" },
  navy: { 200: "#CFD8EE", 300: "#A9B8DC", 400: "#7F93C8", 500: "#4F67A6", 600: "#2E4580", 700: "#22365F" },
  text: { ink: "#F7F5F0", muted: "#C3C3CC", subtle: "#A0A3B4" },
  status: { success: "#5FE3A1", danger: "#FF7A70", warning: "#FFC44D", info: "#7CBCFF" },
} as const;

/** Pares texto/fundo usados na interface; validados por tests/unit/design-tokens.test.ts (WCAG AA ≥ 4.5). */
export const textPairs: ReadonlyArray<readonly [fg: string, bg: string, use: string]> = [
  [palette.text.ink, palette.night[900], "texto principal no canvas"],
  [palette.text.ink, palette.night[800], "texto principal em card"],
  [palette.text.muted, palette.night[800], "texto secundário em card"],
  [palette.text.subtle, palette.night[700], "texto sutil em campo"],
  [palette.gold[400], palette.night[900], "dourado no canvas"],
  [palette.gold[400], palette.night[800], "dourado em card"],
  [palette.gold[300], palette.night[800], "título dourado em card"],
  [palette.night[950], palette.gold[400], "texto em botão dourado"],
  ["#FFFFFF", palette.navy[600], "texto em botão azul"],
  [palette.navy[200], palette.night[800], "badge azul"],
  [palette.status.danger, palette.night[800], "erro"],
  [palette.status.success, palette.night[800], "sucesso"],
  [palette.status.warning, palette.night[800], "aviso"],
  [palette.status.info, palette.night[800], "informação"],
];

export const radius = { sm: "0.5rem", md: "0.75rem", lg: "1rem", xl: "1rem" } as const;
export const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;
