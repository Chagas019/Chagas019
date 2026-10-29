import { expect, test } from "@playwright/test";

test("home no celular: navegação inferior e sem rolagem horizontal", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Navegação rápida" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  for (const path of ["/descobrir", "/desafios", "/lab", "/comunidades", "/cadastro"]) {
    await page.goto(path);
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(o, `overflow em ${path}`).toBeLessThanOrEqual(0);
  }
});
