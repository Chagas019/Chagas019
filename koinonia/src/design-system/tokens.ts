/**
 * Tokens do Design System KOINONIA (tema escuro "sticker"), espelho de src/styles/globals.css.
 * Use as classes Tailwind geradas (ex.: bg-lime-400, text-ink-muted) nos componentes;
 * este arquivo serve a documentação, testes de contraste e usos fora do CSS.
 */
export const brand = {
  night: "#0E0E16",
  lime: "#C8FF2E",
  violet: "#7B2FF7",
  white: "#F6F6F8",
} as const;

export const palette = {
  night: { 950: "#08080D", 900: "#0E0E16", 800: "#14141E", 700: "#1B1B28", 600: "#262636", 500: "#3A3A50" },
  lime: { 200: "#ECFFB0", 300: "#DCFF70", 400: "#C8FF2E", 500: "#B2EA12" },
  violet: { 200: "#D9C6FF", 300: "#B994FF", 400: "#9D6BFF", 500: "#8A4BFF", 600: "#7B2FF7", 700: "#5F1FD0" },
  accents: { sky: "#1F7FFF", flame: "#FF5A36", sun: "#FFD23F", mint: "#5FE3A1" },
  text: { ink: "#F6F6F8", muted: "#B8B8C8", subtle: "#9A9AAE" },
  status: { success: "#5FE3A1", danger: "#FF7A70", warning: "#FFC44D", info: "#7CBCFF" },
} as const;

/** Pares texto/fundo usados na interface; validados por tests/unit/design-tokens.test.ts (WCAG AA ≥ 4.5). */
export const textPairs: ReadonlyArray<readonly [fg: string, bg: string, use: string]> = [
  [palette.text.ink, palette.night[900], "texto principal no canvas"],
  [palette.text.ink, palette.night[800], "texto principal em painel"],
  [palette.text.muted, palette.night[800], "texto secundário em painel"],
  [palette.text.subtle, palette.night[700], "texto sutil em campo"],
  [palette.lime[400], palette.night[800], "destaque lima em painel"],
  [palette.night[950], palette.lime[400], "texto em botão lima"],
  ["#FFFFFF", palette.violet[600], "texto em botão roxo"],
  [palette.violet[200], palette.night[800], "badge roxo"],
  [palette.night[950], palette.accents.sun, "texto em card amarelo"],
  [palette.night[950], palette.accents.flame, "texto em card laranja"],
  [palette.night[950], palette.accents.mint, "texto em card verde"],
  [palette.night[950], palette.accents.sky, "balão de fala azul"],
  [palette.status.danger, palette.night[800], "erro"],
  [palette.status.success, palette.night[800], "sucesso"],
  [palette.status.warning, palette.night[800], "aviso"],
  [palette.status.info, palette.night[800], "informação"],
];

export const radius = { sm: "0.5rem", md: "0.75rem", lg: "1rem", xl: "1.75rem" } as const;
export const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;
