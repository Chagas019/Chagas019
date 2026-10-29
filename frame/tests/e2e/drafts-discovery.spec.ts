import { expect, test } from "@playwright/test";
import { fixtureImage, signUp, uniqueUser } from "./helpers";

test.describe.configure({ mode: "serial" });

const lia = uniqueUser("lia");
const tag = `luzdejanela${Date.now().toString(36)}`;

test("rascunho, pré-visualização, publicação, hashtag na busca e portfólio", async ({ page }) => {
  await signUp(page, lia);
  await page.goto("/publicar");
  await page.locator('input[type="file"]').first().setInputFiles(await fixtureImage("lia-1", "#2734f0"));
  await expect(page.getByRole("button", { name: "Publicar", exact: true })).toBeEnabled({ timeout: 20_000 });
  await page.getByLabel("Título").fill("Retrato azul");
  await page.getByLabel("Descrição").fill(`Teste de luz #${tag}`);
  await page.getByRole("switch", { name: "Aceitar comentários e feedback" }).click();

  // Pré-visualização mostra o texto e as hashtags antes de publicar.
  await page.getByRole("button", { name: "Pré-visualizar" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Retrato azul")).toBeVisible();
  await expect(dialog.getByText(`#${tag}`).first()).toBeVisible();
  await expect(dialog.getByText("Comentários desativados")).toBeVisible();
  await dialog.getByRole("button", { name: "Fechar" }).click();

  // Salvar como rascunho: só a autora vê.
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page).toHaveURL(/\/rascunhos$/, { timeout: 20_000 });
  await page.getByRole("link", { name: /Retrato azul/ }).click();
  await expect(page).toHaveURL(/\/editar$/);
  const postUrl = page.url().replace(/\/editar$/, "");

  // Publicar a partir da edição.
  await page.getByRole("button", { name: "Publicar agora" }).click();
  await expect(page).toHaveURL(new RegExp(`${postUrl.split("/p/")[1]}$`), { timeout: 20_000 });
  await expect(page.getByText("O autor desativou os comentários nesta publicação.")).toBeVisible();

  // Hashtag clicável leva à busca, que encontra o trabalho.
  await page.getByRole("list", { name: "Hashtags" }).getByRole("link", { name: `#${tag}` }).click();
  await expect(page).toHaveURL(/\/descobrir\?q=/);
  await expect(page.getByRole("link", { name: /Retrato azul/ })).toBeVisible();

  // Fixar no portfólio aparece no topo do perfil.
  await page.goto(postUrl);
  await page.getByRole("button", { name: "Fixar no portfólio" }).click();
  await expect(page.getByRole("button", { name: "Tirar do portfólio" })).toBeVisible();
  await page.goto(`/u/${lia.handle}`);
  await expect(page.getByRole("heading", { name: "Portfólio" })).toBeVisible();
});

test("visitante vê o feed já na primeira tela e pode minimizar o hero", async ({ page }) => {
  await page.goto("/");
  const feed = page.getByRole("navigation", { name: "Feed" });
  await expect(feed).toBeVisible();
  const vh = page.viewportSize()!.height;
  expect((await feed.boundingBox())!.y).toBeLessThan(vh);
  await page.getByRole("button", { name: "Minimizar apresentação" }).click();
  await expect(page.getByRole("button", { name: "Mostrar apresentação" })).toBeVisible();
  expect((await feed.boundingBox())!.y).toBeLessThan(400);
});
