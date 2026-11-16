import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { brand, palette, textPairs } from "@/design-system/tokens";
import { contrastRatio } from "@/design-system/contrast";

describe("design tokens", () => {
  it("usa as cores da identidade (pôster grafite + neon)", () => {
    expect(brand.graphite).toBe("#2B2B2B");
    expect(brand.neon).toBe("#8CFF5A");
  });

  it.each(textPairs)("par %s sobre %s (%s) atende WCAG AA 4.5:1", (fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("grafite médio não serve como texto (documentado: use graphite-200)", () => {
    expect(contrastRatio(palette.graphite[600], palette.night[800])).toBeLessThan(4.5);
  });

  it("tokens TS espelham o CSS", () => {
    const css = readFileSync("src/styles/globals.css", "utf8").toLowerCase();
    for (const [step, hex] of Object.entries(palette.night)) expect(css).toContain(`--color-night-${step}: ${hex.toLowerCase()}`);
    for (const [step, hex] of Object.entries(palette.neon)) expect(css).toContain(`--color-neon-${step}: ${hex.toLowerCase()}`);
    for (const [step, hex] of Object.entries(palette.graphite)) expect(css).toContain(`--color-graphite-${step}: ${hex.toLowerCase()}`);
  });
});
