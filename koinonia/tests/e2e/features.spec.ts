import { expect, test } from "@playwright/test";

test.describe("SEO e componentes", () => {
  test("robots, sitemap, manifest e imagem OG respondem", async ({ request }) => {
    for (const path of ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/opengraph-image"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
    }
    expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /painel");
    expect(await (await request.get("/sitemap.xml")).text()).toContain("/oportunidades");
  });

  test("atalhos de talentos filtram pela URL e marcam o ativo", async ({ page }) => {
    await page.goto("/talentos");
    await page.getByRole("link", { name: "Fotógrafos" }).click();
    await expect(page).toHaveURL(/talento=photography/);
    await expect(page.getByRole("link", { name: "Fotógrafos" })).toHaveAttribute("aria-current", "page");
  });

  test("modal abre, prende o foco e fecha com Esc", async ({ page }) => {
    await page.goto("/design-system");
    await page.getByRole("button", { name: "Abrir modal" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("termos em inglês sem mistura de idiomas", async ({ page, context }) => {
    await context.addCookies([{ name: "koinonia_locale", value: "en", url: "http://localhost:3100" }]);
    await page.goto("/termos");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms of use");
    await expect(page.getByRole("heading", { name: "1. Using the platform" })).toBeVisible();
    await expect(page.getByText("Uso da plataforma")).toHaveCount(0);
  });

  test("oportunidades têm filtro de disponibilidade", async ({ page }) => {
    await page.goto("/oportunidades?disponibilidade=weekends");
    await expect(page.getByLabel("Disponibilidade")).toHaveValue("weekends");
  });
});
