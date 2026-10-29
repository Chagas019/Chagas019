import { expect, test } from "@playwright/test";
import { fixtureImage, signUp, sqlClient, uniqueUser } from "./helpers";

test("Showcase com antes/depois e ficha técnica ocultável", async ({ page }) => {
  const u = uniqueUser("lia");
  await signUp(page, u);
  await page.goto("/publicar?tipo=showcase");
  await page.locator('input[type="file"]').nth(0).setInputFiles(await fixtureImage("after", "#f59e0b"));
  await page.locator('input[type="file"]').nth(1).setInputFiles(await fixtureImage("before", "#6b7280"));
  await expect(page.getByRole("button", { name: "Publicar", exact: true })).toBeEnabled({ timeout: 20_000 });
  await page.getByLabel("Título").fill("Do RAW ao final");
  await page.getByLabel("Como foi construído").fill("Balanço de branco pela pele e curvas suaves.");
  await page.getByLabel("Câmera ou celular").fill("Canon R6");
  await page.getByLabel("Lente").fill("85mm");
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page).toHaveURL(/\/p\//, { timeout: 20_000 });

  const slider = page.getByRole("slider", { name: "Comparar antes e depois" });
  await expect(slider).toHaveAttribute("aria-valuenow", "50");
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "54");
  await page.keyboard.press("Home");
  await expect(slider).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByText("Canon R6")).toBeVisible();
  await expect(page.getByText("Balanço de branco pela pele")).toBeVisible();
});

test("participar de um desafio aberto", async ({ page }) => {
  const sql = sqlClient();
  const slug = `desafio-e2e-${Date.now()}`;
  await sql`insert into challenge (slug, title, theme, briefing, rules, category, starts_at, submission_deadline, voting_enabled, voting_ends_at)
            values (${slug}, 'Só luz natural E2E', 'Luz disponível', 'Sem flash.', ${["Sem flash"]}, 'fotografia', now() - interval '1 day', now() + interval '3 days', true, now() + interval '6 days')`;
  await sql.end();

  const u = uniqueUser("nanda");
  await signUp(page, u);
  await page.goto("/publicar");
  await page.locator('input[type="file"]').first().setInputFiles(await fixtureImage("nanda", "#0ea5e9"));
  await expect(page.getByRole("button", { name: "Publicar", exact: true })).toBeEnabled({ timeout: 20_000 });
  await page.getByLabel("Título").fill("Contraluz na feira");
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page).toHaveURL(/\/p\//, { timeout: 20_000 });

  await page.goto(`/desafios/${slug}`);
  await page.getByRole("radio", { name: "Contraluz na feira" }).click();
  await page.getByLabel("Nota sobre o processo").fill("Luz das 7h.");
  await page.getByRole("button", { name: "Enviar ao desafio" }).click();
  await expect(page.getByText("Você está participando com “Contraluz na feira”.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Galeria (1)" })).toBeVisible();
});

test("comunidade privada: pedido de entrada e aprovação", async ({ browser }) => {
  const owner = uniqueUser("dona");
  const member = uniqueUser("membro");
  const ctxA = await browser.newContext();
  const a = await ctxA.newPage();
  await signUp(a, owner);
  await a.goto("/comunidades/nova");
  await a.getByLabel("Nome").fill(`Clube fechado ${Date.now()}`);
  await a.getByRole("radio", { name: /Privada/ }).click();
  await a.getByRole("button", { name: "Criar comunidade" }).click();
  await expect(a).toHaveURL(/\/comunidades\/clube-fechado/);
  const url = a.url();

  const ctxB = await browser.newContext();
  const b = await ctxB.newPage();
  await signUp(b, member);
  await b.goto(url);
  await expect(b.getByText("Conteúdo para participantes")).toBeVisible();
  await b.getByRole("button", { name: "Pedir para entrar" }).click();
  await expect(b.getByRole("button", { name: "Pedido enviado" })).toBeVisible();

  await a.reload();
  await a.getByRole("button", { name: "Aprovar" }).click();
  await expect(a.getByText("Membro atualizado.")).toBeVisible();

  await b.reload();
  await expect(b.getByRole("button", { name: "Sair da comunidade" })).toBeVisible();
  await ctxA.close();
  await ctxB.close();
});
