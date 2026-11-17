import { expect, test } from "@playwright/test";

test.describe("qualidade visual e performance", () => {
  test("estilos do Design System carregados (fundo do canvas e fonte da marca)", async ({ page }) => {
    await page.goto("/");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(43, 43, 43)");
    const h1Font = await page.locator("h1").first().evaluate((el) => getComputedStyle(el).fontFamily);
    expect(h1Font.toLowerCase()).toContain("montserrat");
  });

  for (const width of [320, 768, 800, 1024]) {
    test(`sem rolagem horizontal em ${width}px (inclui largura útil com barra de rolagem)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/entrar", "/oportunidades", "/termos"]) {
        await page.goto(path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${path} @ ${width}px`).toBeLessThanOrEqual(0);
      }
    });
  }

  for (const path of ["/", "/cadastro", "/oportunidades"]) {
    test(`${path} sem deslocamento de layout (CLS < 0.1)`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      const cls = await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            let total = 0;
            new PerformanceObserver((list) => {
              for (const e of list.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) if (!e.hadRecentInput) total += e.value;
            }).observe({ type: "layout-shift", buffered: true });
            setTimeout(() => resolve(total), 500);
          }),
      );
      expect(cls).toBeLessThan(0.1);
    });
  }
});

test("bloqueia a tradução automática do navegador", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("translate", "no");
  await expect(page.locator('meta[name="google"]')).toHaveAttribute("content", "notranslate");
});
