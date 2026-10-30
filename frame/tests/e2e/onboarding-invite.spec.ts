import { expect, test } from "@playwright/test";
import { fixtureImage, signUp, uniqueUser } from "./helpers";

test.describe.configure({ mode: "serial" });
const gabi = uniqueUser("gabi");
const hugo = uniqueUser("hugo");

test("visitante vindo do link cria a própria conta pela home", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Criar minha conta grátis" }).click();
  await expect(page).toHaveURL(/\/cadastro/);
  await signUp(page, gabi);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Convidar para a FRAME" })).toBeVisible();
});

test("outra pessoa aparece em 'Quem chegou' e o trabalho dela no feed de todos", async ({ page }) => {
  await signUp(page, hugo);
  await page.goto("/publicar");
  await page.locator('input[type="file"]').first().setInputFiles(await fixtureImage("hugo-1", "#ff5a1f"));
  await expect(page.getByRole("button", { name: "Publicar", exact: true })).toBeEnabled({ timeout: 20_000 });
  await page.getByLabel("Título").fill("Fogo na cozinha");
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page).toHaveURL(/\/p\//, { timeout: 20_000 });

  // Visitante (sem login) vê o trabalho no feed e a pessoa na faixa de membros.
  await page.context().clearCookies();
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Fogo na cozinha/ }).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Quem chegou na FRAME" }).getByText(hugo.name)).toBeVisible();
});
