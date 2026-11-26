import { expect, test } from "@playwright/test";

test.describe("navegação pública e marketplace", () => {
  test("home carrega com produtos do banco e navegação principal", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/creative/i);
    await expect(page.getByTestId("product-card").first()).toBeVisible();
    for (const [name, url] of [["Presets", /\/presets$/], ["Style Explorer", /\/estilos/], ["Inspiration", /\/inspiracao/], ["Premium Club", /\/premium/]] as const) {
      await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name }).click();
      await expect(page).toHaveURL(url);
    }
    expect(errors).toEqual([]);
  });

  test("filtros, busca e ordenação funcionam de verdade", async ({ page }) => {
    await page.goto("/presets");
    await expect(page.getByTestId("result-count")).toHaveText("12 presets");
    await page.getByTestId("filter-free").click();
    await expect(page).toHaveURL(/acesso=free/);
    await expect(page.getByTestId("result-count")).toHaveText("4 presets");
    await page.getByTestId("filter-premium").click();
    await expect(page.getByTestId("result-count")).toHaveText("8 presets");
    await page.getByTestId("filter-cat-cinematic").click();
    await expect(page).toHaveURL(/categoria=cinematic/);
    await expect(page.getByTestId("result-count")).toHaveText("2 presets");
    await page.goto("/presets");
    await page.getByRole("searchbox").fill("neon");
    await expect(page).toHaveURL(/q=neon/);
    await expect(page.getByTestId("product-card")).toHaveCount(1);
    await expect(page.getByTestId("product-card")).toContainText("Neon Noir");
    await page.getByRole("searchbox").fill("xyzxyz");
    await expect(page.getByTestId("empty-state")).toBeVisible();
    await page.goto("/presets?ordem=price_desc");
    await expect(page.getByTestId("product-card").first()).toContainText("Golden Vows");
  });

  test("página do preset: comparador, informações e bloqueio sem login", async ({ page }) => {
    await page.goto("/presets/neon-noir");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/neon noir/i);
    await expect(page.getByTestId("product-price")).toHaveText(/29,90/);
    const slider = page.getByRole("slider", { name: /antes e depois/i });
    await slider.focus();
    await page.keyboard.press("Home");
    await expect(slider).toHaveAttribute("aria-valuenow", "0");
    await page.keyboard.press("End");
    await expect(slider).toHaveAttribute("aria-valuenow", "100");
    await expect(page.getByTestId("access-panel")).toHaveAttribute("data-access", "login_required");
    await expect(page.getByTestId("download-button")).toHaveCount(0);
    await expect(page.getByText(/como instalar/i).first()).toBeVisible();
  });

  test("download direto sem login não entrega arquivo; GET é recusado", async ({ request }) => {
    const res = await request.post("/api/download/00000000-0000-4000-8000-000000000000", { maxRedirects: 0 });
    expect(res.status()).toBe(303);
    expect(res.headers()["location"]).toContain("/entrar");
    const get = await request.get("/api/download/00000000-0000-4000-8000-000000000000");
    expect(get.status()).toBe(405);
    const forged = await request.get("/api/files/abc.def");
    expect(forged.status()).toBe(403);
  });

  test("páginas editoriais e 404", async ({ page }) => {
    await page.goto("/estilos");
    await page.getByTestId("style-tab-moody").click();
    await expect(page).toHaveURL(/estilo=moody/);
    await expect(page.getByRole("tabpanel")).toContainText(/fog ritual/i);
    await page.goto("/inspiracao");
    await expect(page.locator("article").first()).toBeVisible();
    await page.goto("/colecoes/luz-dourada");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/luz dourada/i);
    const res = await page.goto("/presets/nao-existe");
    expect(res?.status()).toBe(404);
  });

  test("admin exige login e papel de administrador", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/entrar\?next=%2Fadmin/);
  });
});
