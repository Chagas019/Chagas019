import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { brand, palette, textPairs } from "@/design-system/tokens";
import { contrastRatio } from "@/design-system/contrast";

describe("design tokens", () => {
  it("usa as cores oficiais da marca", () => {
    expect(brand.navy).toBe("#101C35");
    expect(brand.gold).toBe("#D6AE62");
  });

  it.each(textPairs)("par %s sobre %s (%s) atende WCAG AA 4.5:1", (fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("dourado da marca não serve como texto em fundo claro (documentado)", () => {
    expect(contrastRatio(palette.gold[500], palette.sand[0])).toBeLessThan(3);
  });

  it("tokens TS espelham o CSS", () => {
    const css = readFileSync("src/styles/globals.css", "utf8").toLowerCase();
    for (const [step, hex] of Object.entries(palette.navy)) expect(css).toContain(`--color-navy-${step}: ${hex.toLowerCase()}`);
    for (const [step, hex] of Object.entries(palette.gold)) expect(css).toContain(`--color-gold-${step}: ${hex.toLowerCase()}`);
  });
});
