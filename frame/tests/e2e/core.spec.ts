import { expect, test } from "@playwright/test";
import { fixtureImage, publishWork, signUp, sqlClient, signIn, uniqueUser } from "./helpers";

test.describe.configure({ mode: "serial" });

const ana = uniqueUser("ana");
const bruno = uniqueUser("bruno");
let publicPostId = "";
let privatePostId = "";

test("rotas protegidas exigem login", async ({ page }) => {
  await page.goto("/publicar");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fpublicar/);
  const res = await page.request.post("/api/uploads", { multipart: { purpose: "post" } });
  expect(res.status()).toBe(401);
});

test("cadastro, onboarding, publicação e perfil", async ({ page }) => {
  await signUp(page, ana);
  const img = await fixtureImage("ana-1", "#7c3aed");
  publicPostId = await publishWork(page, "Retrato na janela", img);

  // Arquivo servido pela rota protegida, já convertido para WebP.
  const media = await page.locator("img[src^='/api/media/']").first().getAttribute("src");
  const r = await page.request.get(media!);
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toBe("image/webp");

  await page.goto(`/u/${ana.handle}`);
  await expect(page.getByRole("heading", { level: 1, name: ana.name })).toBeVisible();
  await expect(page.getByRole("link", { name: /Retrato na janela/ })).toBeVisible();

  privatePostId = await publishWork(page, "Rascunho secreto", await fixtureImage("ana-2", "#111827"), "Só eu");
});

test("editar perfil persiste no banco", async ({ page }) => {
  await signIn(page, ana);
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
  await page.goto("/configuracoes");
  await page.getByLabel("Biografia").fill("Fotógrafa de retratos com luz natural.");
  await page.getByRole("switch", { name: "Disponível para trabalhos" }).click();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Perfil atualizado.")).toBeVisible();
  await page.goto(`/u/${ana.handle}`);
  await expect(page.getByText("Fotógrafa de retratos com luz natural.")).toBeVisible();
  await expect(page.getByText("Disponível para trabalhos")).toBeVisible();
});

test("outra pessoa curte, comenta e segue — e não vê o post privado", async ({ page }) => {
  await signUp(page, bruno);
  await page.goto(`/p/${publicPostId}`);
  const like = page.getByRole("button", { name: /^Curtir/ }).first();
  await like.click();
  await expect(page.getByRole("button", { name: /^Descurtir \(1 curtidas\)/ }).first()).toBeVisible();
  await page.getByLabel("Comentário").fill("Que luz bonita! Qual lente?");
  await page.getByRole("button", { name: "Comentar" }).click();
  await expect(page.getByText("Que luz bonita! Qual lente?")).toBeVisible();
  await page.getByRole("button", { name: "Seguir" }).click();
  await expect(page.getByRole("button", { name: "Seguindo" })).toBeVisible();

  // Persistência real: recarregar mantém o estado.
  await page.reload();
  await expect(page.getByRole("button", { name: /^Descurtir/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Seguindo" })).toBeVisible();

  // Post privado: página e arquivo inacessíveis.
  const res = await page.goto(`/p/${privatePostId}`);
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Fora de quadro")).toBeVisible();
  await expect(page.getByText("Rascunho secreto")).toHaveCount(0);
  const sql = sqlClient();
  const [m] = await sql`select id from media where post_id = ${privatePostId}`;
  await sql.end();
  expect((await page.request.get(`/api/media/${m!.id}`)).status()).toBe(404);

  // Feed "Seguindo" mostra o trabalho de Ana.
  await page.goto("/?f=seguindo");
  await expect(page.getByRole("link", { name: /Retrato na janela/ })).toBeVisible();
});

test("autora recebe notificações reais", async ({ page }) => {
  await signIn(page, ana);
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
  await page.goto("/notificacoes");
  await expect(page.getByText("começou a seguir você")).toBeVisible();
  await expect(page.getByText("comentou no seu trabalho")).toBeVisible();
});
