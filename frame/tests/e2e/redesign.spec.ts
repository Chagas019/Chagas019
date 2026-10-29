import { expect, test } from "@playwright/test";
import { fixtureImage, signUp, uniqueUser } from "./helpers";

test.describe.configure({ mode: "serial" });
const dora = uniqueUser("dora");
const enzo = uniqueUser("enzo");
let postUrl = "";

test("menu Criar abre as cinco ações reais", async ({ page }) => {
  await signUp(page, dora);
  await page.goto("/");
  await page.getByRole("complementary", { name: "Navegação principal" }).getByRole("button", { name: "Criar" }).click();
  const sheet = page.getByRole("dialog", { name: "Criar" });
  for (const name of ["Publicar foto", "Publicar vídeo", "Compartilhar projeto", "Entrar em um desafio", "Publicar tutorial"]) {
    await expect(sheet.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
  await sheet.getByRole("link", { name: /Compartilhar projeto/ }).click();
  await expect(page).toHaveURL(/\/publicar\?tipo=showcase/);
});

test("Me dê uma ideia: missão com tema, regras e resultado; gera outra", async ({ page }) => {
  await page.goto("/lab");
  await page.getByRole("button", { name: "Me dê uma ideia" }).first().click();
  const dlg = page.getByRole("dialog", { name: "Me dê uma ideia" });
  await expect(dlg.getByRole("heading", { name: "Regras" })).toBeVisible();
  const theme = await dlg.getByRole("heading", { level: 2 }).innerText();
  for (let i = 0; i < 5; i++) {
    await dlg.getByRole("button", { name: "Gerar outra ideia" }).click();
    if ((await dlg.getByRole("heading", { level: 2 }).innerText()) !== theme) break;
  }
  await expect(dlg.getByRole("link", { name: "Entre para salvar e virar projeto" })).toBeVisible();
  await dlg.getByRole("button", { name: "Fechar" }).click();
});

test("autora permite remix e publica um projeto", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(dora.email);
  await page.getByLabel("Senha").fill(dora.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/entrar/);
  await page.goto("/publicar?tipo=showcase");
  await page.locator('input[type="file"]').first().setInputFiles(await fixtureImage("dora-1", "#d4ff36"));
  await expect(page.getByRole("button", { name: "Publicar", exact: true })).toBeEnabled({ timeout: 20_000 });
  await page.getByLabel("Título").fill("Retrato verde");
  await page.getByLabel("Objetivo").fill("Testar uma paleta de uma cor só");
  await page.getByRole("switch", { name: "Permitir remix" }).click();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Sobre o projeto" })).toBeVisible();
  postUrl = page.url();
});

test("outra pessoa remixa com crédito automático e vínculo nos dois lados", async ({ page }) => {
  await signUp(page, enzo);
  await page.goto(postUrl);
  await page.getByRole("link", { name: "Remixar" }).click();
  await expect(page.getByText(/Você está criando uma versão de “Retrato verde”/)).toBeVisible();
  await page.locator('input[type="file"]').first().setInputFiles(await fixtureImage("enzo-1", "#2734f0"));
  await expect(page.getByRole("button", { name: "Publicar", exact: true })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  await expect(page.getByRole("link", { name: /Remix de “Retrato verde”/ })).toBeVisible();
  await expect(page.getByText("Obra original")).toBeVisible();
  await page.goto(postUrl);
  await expect(page.getByRole("heading", { name: /Outras versões \(1\)/ })).toBeVisible();
});

test("LAB: aceitar missão cria projeto com as etapas", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(enzo.email);
  await page.getByLabel("Senha").fill(enzo.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/entrar/);
  await page.goto("/lab/tres-planos-10s");
  await page.getByRole("button", { name: "Participar" }).click();
  await expect(page).toHaveURL(/\/estudio\/projetos\//, { timeout: 20_000 });
  await expect(page.getByRole("checkbox")).toHaveCount(5);
});
