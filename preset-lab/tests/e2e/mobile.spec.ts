import { expect, test } from "@playwright/test";

test.describe("mobile", () => {
  for (const path of ["/", "/presets", "/presets/neon-noir", "/estilos", "/inspiracao", "/premium", "/entrar", "/cadastro"]) {
    test(`sem rolagem horizontal em ${path}`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("menu móvel abre e navega", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /abrir menu/i }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: /premium club/i }).click();
    await expect(page).toHaveURL(/\/premium/);
  });

  test("comparador antes/depois responde ao toque", async ({ page }) => {
    await page.goto("/presets/teal-coast");
    const slider = page.getByRole("slider", { name: /antes e depois/i });
    const box = (await page.locator(".aspect-\\[4\\/5\\]").first().boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height / 2);
    const v = Number(await slider.getAttribute("aria-valuenow"));
    expect(v).toBeGreaterThan(10);
    expect(v).toBeLessThan(30);
  });
});
