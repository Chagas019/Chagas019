import { expect, test } from "@playwright/test";
import { lastMailTo } from "./helpers";

test.describe.configure({ mode: "serial" });
const email = `iris${Date.now().toString(36)}@e2e.local`;

test("pessoa nova recebe o link de acesso por e-mail e cria a conta com um clique", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Íris Teste");
  await page.getByLabel("E-mail").first().fill(email);
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Receber link de acesso" }).click();
  await expect(page.getByText("Confira seu e-mail")).toBeVisible();

  const mail = await lastMailTo(email);
  expect(mail.subject).toBe("Seu acesso à FRAME");
  const url = mail.text.match(/https?:\/\/\S+/)![0];
  await page.goto(url);
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Íris Teste");
});

test("quem já tem conta entra pelo link; link usado não funciona de novo", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").first().fill(email);
  await page.getByRole("button", { name: "Enviar link para entrar" }).click();
  await expect(page.getByText("Confira seu e-mail")).toBeVisible();
  const mail = await lastMailTo(email);
  expect(mail.subject).toBe("Seu link para entrar na FRAME");
  const url = mail.text.match(/https?:\/\/\S+/)![0];
  await page.goto(url);
  await expect(page).not.toHaveURL(/\/entrar/);

  await page.context().clearCookies();
  await page.goto(url);
  await expect(page).toHaveURL(/\/entrar\?link=invalido/);
  await expect(page.getByText("Esse link expirou ou já foi usado")).toBeVisible();
});

test("e-mail inválido e termos são validados antes de enviar", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByLabel("E-mail").first().fill("nao-e-email");
  await page.getByRole("button", { name: "Receber link de acesso" }).click();
  await expect(page.getByText("Digite um e-mail válido.")).toBeVisible();
  await page.getByLabel("E-mail").first().fill("ok@e2e.local");
  await page.getByRole("button", { name: "Receber link de acesso" }).click();
  await expect(page.getByText("É preciso aceitar os termos para continuar.")).toBeVisible();
});
