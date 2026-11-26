import { expect, test } from "@playwright/test";
import { PASSWORD, freshClientIp, signIn, signUpAndConfirm, uniqueEmail } from "./helpers";

test.describe("conta, biblioteca, compra e download", () => {
  test("cadastro → confirmação → login/logout e páginas privadas protegidas", async ({ page }) => {
    await freshClientIp(page);
    await page.goto("/lab");
    await expect(page).toHaveURL(/\/entrar\?next=%2Flab/);
    const email = uniqueEmail("conta");
    // login antes de confirmar é recusado
    await page.goto("/cadastro");
    await page.getByLabel("Nome").fill("Ana");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("curta");
    await page.getByRole("button", { name: /criar conta/i }).click();
    await expect(page.getByLabel("Senha")).toHaveAttribute("aria-invalid", "true");
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: /criar conta/i }).click();
    await expect(page).toHaveURL(/\/cadastro\/confirme/);
    await signIn(page, email);
    await expect(page.getByRole("alert").filter({ hasText: /confirme seu e-mail/i })).toBeVisible();
    // confirma pelo link do e-mail
    await page.goto("/dev/emails");
    await page.goto((await page.getByTestId("email-link").first().getAttribute("href"))!);
    await expect(page).toHaveURL(/\/lab/);
    // logout e login de novo
    await page.goto("/lab/perfil");
    await page.getByTestId("signout").click();
    await page.goto("/lab");
    await expect(page).toHaveURL(/\/entrar/);
    await signIn(page, email, "senhaErrada1");
    await expect(page.getByRole("alert").filter({ hasText: /incorretos/i })).toBeVisible();
    await signIn(page, email);
    await expect(page).toHaveURL(/\/lab/);
  });

  test("gratuito: download autorizado e registrado", async ({ page }) => {
    await signUpAndConfirm(page);
    await page.goto("/presets/golden-dunes");
    await expect(page.getByTestId("access-panel")).toHaveAttribute("data-access", "free");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("download-button").first().click()]);
    expect(download.suggestedFilename()).toMatch(/golden-dunes\.(xmp|zip)/);
    await page.goto("/lab/downloads");
    await expect(page.getByTestId("download-row")).toHaveCount(1);
  });

  test("favoritos persistem", async ({ page }) => {
    await signUpAndConfirm(page);
    await page.goto("/presets/teal-coast");
    const fav = page.getByTestId("access-panel").getByTestId("favorite-button");
    await fav.click();
    await expect(fav).toHaveAttribute("aria-pressed", "true");
    await expect(fav).toBeEnabled(); // ação no servidor concluída
    await page.goto("/lab/favoritos");
    await expect(page.getByTestId("product-card")).toContainText("Teal Coast");
  });

  test("premium: bloqueado → compra simulada → liberado na biblioteca", async ({ page, request }) => {
    await signUpAndConfirm(page);
    await page.goto("/presets/neon-noir");
    await expect(page.getByTestId("access-panel")).toHaveAttribute("data-access", "purchase_or_subscription_required");
    await expect(page.getByTestId("download-button")).toHaveCount(0);
    await page.getByTestId("buy-button").click();
    await expect(page).toHaveURL(/\/checkout\/simulado\//);
    await expect(page.getByTestId("dev-checkout-warning")).toBeVisible();
    await expect(page.getByTestId("checkout-total")).toContainText("29,90");
    await page.getByTestId("simulate-approve").click();
    await expect(page).toHaveURL(/\/checkout\/retorno/);
    await expect(page.getByText(/pagamento confirmado/i)).toBeVisible();
    await page.goto("/presets/neon-noir");
    await expect(page.getByTestId("access-panel")).toHaveAttribute("data-access", "owned");
    await page.goto("/lab");
    await expect(page.getByTestId("library-item").filter({ hasText: "Neon Noir" })).toBeVisible();
    await page.goto("/lab/compras");
    await expect(page.getByTestId("purchase-row").first()).toContainText(/simulad/i);
    // download pela biblioteca
    const [download] = await Promise.all([page.waitForEvent("download"), page.goto("/lab").then(() => page.getByTestId("library-item").filter({ hasText: "Neon Noir" }).getByTestId("download-button").first().click())]);
    expect(download.suggestedFilename()).toMatch(/neon-noir/);
    // a URL assinada não serve de nada sem token válido
    expect((await request.get("/api/files/forjado.assinatura")).status()).toBe(403);
  });

  test("exclusivo do Club: só libera com assinatura", async ({ page }) => {
    await signUpAndConfirm(page);
    await page.goto("/presets/fog-ritual");
    await expect(page.getByTestId("access-panel")).toHaveAttribute("data-access", "subscription_required");
    await expect(page.getByTestId("buy-button")).toHaveCount(0);
    await page.goto("/premium");
    await page.getByTestId("subscribe-premium_monthly").click();
    await page.getByTestId("simulate-approve").click();
    await expect(page.getByText(/pagamento confirmado/i)).toBeVisible();
    await page.goto("/presets/fog-ritual");
    await expect(page.getByTestId("access-panel")).toHaveAttribute("data-access", "subscription");
    await page.goto("/lab/assinatura");
    await expect(page.getByTestId("subscription-valid-until")).toBeVisible();
  });

  test("limite de tentativas de login por IP", async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": "10.250.250.250" });
    for (let i = 0; i < 10; i++) await signIn(page, "ninguem@example.com", "senhaErrada1");
    await signIn(page, "ninguem@example.com", "senhaErrada1");
    await expect(page.getByRole("alert").filter({ hasText: /muitas tentativas/i })).toBeVisible();
  });

  test("usuário comum não entra no Admin Studio", async ({ page }) => {
    await signUpAndConfirm(page);
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin/);
  });
});
