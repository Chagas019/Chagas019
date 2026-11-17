import { expect, test } from "@playwright/test";

test.describe("formulários de autenticação (sem backend)", () => {
  test("login valida campos no servidor e mostra erro acessível", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByRole("button", { name: "Entrar", exact: true }).last().click();
    await expect(page.locator("main").getByRole("alert")).toContainText("Revise os campos destacados.");
    await expect(page.getByLabel("E-mail")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
  });

  test("login com dados válidos informa indisponibilidade e preserva o e-mail", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill("ana@example.com");
    await page.getByRole("textbox", { name: "Senha", exact: true }).fill("qualquer-senha");
    await page.locator("form").getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("Serviço indisponível");
    await expect(page.getByLabel("E-mail")).toHaveValue("ana@example.com");
    await expect(page.getByRole("textbox", { name: "Senha", exact: true })).toHaveValue("");
  });

  test("cadastro exige consentimento, senha forte e confirmação", async ({ page }) => {
    await page.goto("/cadastro");
    await page.getByLabel("Como quer ser chamado(a)").fill("Ana");
    await page.getByLabel("E-mail").fill("ana@example.com");
    await page.getByRole("textbox", { name: "Senha", exact: true }).fill("curta");
    await page.getByLabel("Confirme a senha").fill("diferente");
    await page.getByRole("button", { name: "Criar conta" }).last().click();
    await expect(page.getByText("A senha precisa ter pelo menos 10 caracteres.")).toBeVisible();
    await expect(page.getByText("É preciso aceitar os termos de uso.")).toBeVisible();
    await expect(page.getByText("É preciso aceitar a política de privacidade.")).toBeVisible();
    await expect(page.getByLabel("Como quer ser chamado(a)")).toHaveValue("Ana");
  });

  test("links de termos e privacidade existem no cadastro", async ({ page }) => {
    await page.goto("/cadastro");
    await expect(page.locator("main").getByRole("link", { name: "termos de uso" })).toHaveAttribute("href", "/termos");
    await expect(page.locator("main").getByRole("link", { name: "política de privacidade" })).toHaveAttribute("href", "/privacidade");
  });

  test("next externo é neutralizado (open redirect)", async ({ page }) => {
    await page.goto("/entrar?next=//evil.example/x");
    await expect(page.locator('input[name="next"]')).toHaveValue("/painel");
  });

  test("link inválido de confirmação mostra aviso", async ({ page }) => {
    await page.goto("/auth/confirm?token_hash=x&type=signup");
    await expect(page).toHaveURL("/entrar?erro=link");
    await expect(page.getByText("Este link é inválido ou expirou")).toBeVisible();
  });

  test("recuperar senha valida e-mail", async ({ page }) => {
    await page.goto("/recuperar-senha");
    await page.getByLabel("E-mail").fill("nao-e-email");
    await page.getByRole("button", { name: "Enviar link" }).click();
    await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
  });
});
