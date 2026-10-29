import { expect, test } from "@playwright/test";
import { fixtureImage, signUp, uniqueUser } from "./helpers";

test.describe.configure({ mode: "serial" });
const caio = uniqueUser("caio");

test("Creative Studio: botões levam a telas reais", async ({ page }) => {
  await page.goto("/estudio-criativo");
  const bar = page.getByRole("navigation", { name: "Creative Studio" });
  await expect(bar.getByRole("link")).toHaveCount(6);
  await bar.getByRole("link", { name: /Recursos/ }).click();
  await expect(page).toHaveURL(/\/laboratorio$/);
  await expect(page.getByRole("heading", { level: 1, name: "Laboratório Criativo" })).toBeVisible();
});

test("ideia → projeto → tarefa → publicação ligada ao projeto", async ({ page }) => {
  await signUp(page, caio);
  await page.goto("/estudio-criativo");
  await page.locator("#ideia").getByRole("button", { name: "Me dê uma ideia" }).click();
  await expect(page.getByRole("heading", { name: "Roteiro / estrutura" })).toBeVisible();
  await page.getByRole("button", { name: "Transformar em projeto" }).click();
  await expect(page).toHaveURL(/\/estudio\/projetos\/[0-9a-f-]{36}$/, { timeout: 20_000 });

  // Marca a primeira tarefa e confere que persistiu.
  const first = page.getByRole("checkbox").first();
  await first.click();
  await expect(first).toHaveAttribute("aria-checked", "true");
  await page.reload();
  await expect(page.getByRole("checkbox").first()).toHaveAttribute("aria-checked", "true");

  // Publicar a partir do projeto pré-preenche o título e liga o post.
  const title = await page.getByLabel("Título").inputValue();
  await page.getByRole("link", { name: "Publicar no FRAME" }).click();
  await expect(page.getByLabel("Título")).toHaveValue(title);
  await page.locator('input[type="file"]').first().setInputFiles(await fixtureImage("caio-1", "#ff6b2c"));
  await expect(page.getByRole("button", { name: "Publicar", exact: true })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  await page.goto("/estudio?aba=projetos");
  await expect(page.getByText("Pronto").first()).toBeVisible();
});

test("exemplo do laboratório: salvar inspiração e criar minha versão", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(caio.email);
  await page.getByLabel("Senha").fill(caio.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/entrar/);
  await page.goto("/laboratorio/luz-lateral-profundidade");
  await page.getByRole("button", { name: "Salvar inspiração" }).click();
  await expect(page.getByRole("button", { name: "Inspiração salva" })).toBeVisible();
  await page.getByRole("button", { name: "Criar minha versão" }).click();
  await expect(page).toHaveURL(/\/estudio\/projetos\//, { timeout: 20_000 });
  await expect(page.getByRole("checkbox")).toHaveCount(5);
  await page.goto("/estudio?aba=referencias");
  await expect(page.getByRole("link", { name: /Luz lateral para criar profundidade/ })).toBeVisible();
});
