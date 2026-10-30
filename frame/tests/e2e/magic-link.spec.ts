import { expect, test } from "@playwright/test";
import { lastMailTo, linkIn } from "./helpers";

test.describe.configure({ mode: "serial" });
const email = `iris${Date.now().toString(36)}@e2e.local`;
const password = "senha-da-iris-123";

test("pessoa nova confirma o e-mail pelo link e cria a própria senha", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Íris Teste");
  await page.locator("#ml-email").fill(email);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Confira seu e-mail")).toBeVisible();

  const mail = await lastMailTo(email);
  expect(mail.subject).toBe("Confirme seu e-mail e crie sua senha");
  expect(mail.html).toContain("Criar minha senha");
  await page.goto(linkIn(mail.text));
  await expect(page).toHaveURL(/\/criar-senha/);
  await expect(page.getByLabel("E-mail confirmado")).toHaveValue(email);

  // Senhas diferentes são recusadas.
  await page.getByLabel("Crie sua senha").fill(password);
  await page.getByLabel("Repita a senha").fill("outra-coisa-123");
  await page.getByRole("button", { name: "Criar senha e entrar" }).click();
  await expect(page.getByText("As senhas não são iguais.")).toBeVisible();

  await page.getByLabel("Repita a senha").fill(password);
  await page.getByRole("button", { name: "Criar senha e entrar" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Íris Teste");
});

test("depois entra com e-mail e senha; link usado não funciona de novo", async ({ page }) => {
  await page.goto("/entrar");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).not.toHaveURL(/\/entrar/);

  const used = linkIn((await lastMailTo(email)).text);
  await page.context().clearCookies();
  await page.goto(used);
  await expect(page).toHaveURL(/\/entrar\?link=invalido/);
  await expect(page.getByText("Esse link expirou ou já foi usado")).toBeVisible();
});

test("esqueceu a senha: entra com um link no e-mail", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByText("Entrar com um link no e-mail").click();
  await page.locator("#ml-email").fill(email);
  await page.getByRole("button", { name: "Enviar link para entrar" }).click();
  await expect(page.getByText("Confira seu e-mail")).toBeVisible();
  const mail = await lastMailTo(email);
  expect(mail.subject).toBe("Seu link para entrar na FRAME");
  await page.goto(linkIn(mail.text));
  await expect(page).not.toHaveURL(/\/entrar|\/criar-senha/);
});

test("e-mail inválido e termos são validados antes de enviar", async ({ page }) => {
  await page.goto("/cadastro");
  await page.locator("#ml-email").fill("nao-e-email");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Digite um e-mail válido.")).toBeVisible();
  await page.locator("#ml-email").fill("ok@e2e.local");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("É preciso aceitar os termos para continuar.")).toBeVisible();
});
