import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { brand, palette, textPairs } from "@/design-system/tokens";
import { contrastRatio } from "@/design-system/contrast";

describe("design tokens", () => {
  it("usa as cores da identidade (referência visual escura)", () => {
    expect(brand.lime).toBe("#C8FF2E");
    expect(brand.violet).toBe("#7B2FF7");
  });

  it.each(textPairs)("par %s sobre %s (%s) atende WCAG AA 4.5:1", (fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("roxo não serve como texto sobre o fundo escuro (documentado: use violet-200)", () => {
    expect(contrastRatio(palette.violet[600], palette.night[800])).toBeLessThan(4.5);
  });

  it("tokens TS espelham o CSS", () => {
    const css = readFileSync("src/styles/globals.css", "utf8").toLowerCase();
    for (const [step, hex] of Object.entries(palette.night)) expect(css).toContain(`--color-night-${step}: ${hex.toLowerCase()}`);
    for (const [step, hex] of Object.entries(palette.lime)) expect(css).toContain(`--color-lime-${step}: ${hex.toLowerCase()}`);
    for (const [step, hex] of Object.entries(palette.violet)) expect(css).toContain(`--color-violet-${step}: ${hex.toLowerCase()}`);
  });
});
