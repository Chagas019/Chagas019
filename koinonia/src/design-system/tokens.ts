/**
 * Tokens do Design System KOINONIA em TypeScript (fonte de verdade: src/styles/globals.css).
 * Use as classes Tailwind geradas (ex.: bg-navy-900, text-accent-ink) nos componentes;
 * este arquivo serve a documentação, testes de contraste e usos fora do CSS.
 */
export const brand = {
  navy: "#101C35",
  gold: "#D6AE62",
  goldInk: "#8C6A2A",
  white: "#FFFFFF",
  canvas: "#FBFAF7",
} as const;

export const palette = {
  navy: { 950: "#0A1224", 900: "#101C35", 800: "#1A2A4D", 700: "#263A66", 600: "#3A5084", 500: "#5A6E9E", 300: "#9AA6C4", 200: "#C9D1E3", 100: "#E6EAF3", 50: "#F4F6FA" },
  gold: { 800: "#6B5020", 700: "#8C6A2A", 600: "#B88E3E", 500: "#D6AE62", 400: "#E2C385", 300: "#EBD5A8", 100: "#F8F0DF", 50: "#FCF8EF" },
  sand: { 0: "#FFFFFF", 25: "#FBFAF7", 50: "#F5F3EE", 100: "#ECE9E2", 200: "#DCD8CF", 400: "#9A958B", 500: "#6E6A62", 600: "#57534C", 700: "#3F3C37", 900: "#1C1B19" },
  status: { success: "#1F7A4D", danger: "#B42318", warning: "#B54708", info: "#2E5AAC" },
} as const;

/** Pares texto/fundo usados na interface; validados por tests/unit/design-tokens.test.ts (WCAG AA ≥ 4.5). */
export const textPairs: ReadonlyArray<readonly [fg: string, bg: string, use: string]> = [
  [palette.navy[900], palette.sand[0], "texto principal em superfície"],
  [palette.navy[900], palette.sand[25], "texto principal no canvas"],
  [palette.sand[600], palette.sand[25], "texto secundário"],
  [palette.sand[500], palette.sand[0], "texto sutil"],
  [palette.gold[700], palette.sand[0], "texto de destaque dourado"],
  [palette.gold[500], palette.navy[900], "dourado sobre azul-marinho"],
  [palette.sand[0], palette.navy[900], "texto em botão primário"],
  [palette.navy[900], palette.gold[500], "texto em botão dourado"],
  [palette.navy[200], palette.navy[900], "texto secundário em fundo escuro"],
  [palette.status.danger, palette.sand[0], "erro"],
  [palette.status.success, palette.sand[0], "sucesso"],
  [palette.status.warning, palette.sand[0], "aviso"],
  [palette.status.info, palette.sand[0], "informação"],
];

export const radius = { sm: "0.5rem", md: "0.75rem", lg: "1rem", xl: "1.5rem" } as const;
export const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;
