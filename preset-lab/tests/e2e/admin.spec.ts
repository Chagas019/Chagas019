import { expect, test } from "@playwright/test";
import { promoteToAdmin, signUpAndConfirm } from "./helpers";

test("Admin Studio: dashboard real, criar produto, enviar arquivo, publicar e excluir", async ({ page }) => {
  const email = await signUpAndConfirm(page, undefined, "Admin E2E");
  promoteToAdmin(email);
  // o papel é relido do banco a cada requisição — não precisa relogar
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText(/simulad/i).first()).toBeVisible();

  const name = `Teste Admin ${Date.now()}`;
  await page.goto("/admin/produtos/novo");
  await page.getByLabel("Nome", { exact: true }).first().fill(name);
  await page.getByLabel("Tipo").selectOption("premium");
  await page.getByLabel(/^Preço/).fill("12,50");
  await page.getByLabel("Status").selectOption("published");
  await page.getByRole("button", { name: /criar produto/i }).click();
  await expect(page).toHaveURL(/\/admin\/produtos\/[0-9a-f-]{36}/);

  // arquivo privado do preset
  await page.locator('input[type="file"][accept*="xmp"]').setInputFiles({ name: "teste.xmp", mimeType: "application/rdf+xml", buffer: Buffer.from("<x:xmpmeta/>") });
  await expect(page.getByText(/teste\.xmp/i).first()).toBeVisible({ timeout: 15_000 });

  // aparece no marketplace público com o preço do banco
  await page.goto(`/presets?q=${encodeURIComponent(name)}`);
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await expect(page.getByTestId("product-card")).toContainText("12,50");

  // excluir (confirmação em dois cliques) remove do catálogo
  await page.goto(`/admin/produtos?q=${encodeURIComponent(name)}`);
  await page.getByRole("button", { name: "Excluir", exact: true }).first().click();
  await page.getByRole("button", { name: /confirmar exclusão/i }).click();
  await expect(page.getByText(name)).toHaveCount(0);
  await page.goto(`/presets?q=${encodeURIComponent(name)}`);
  await expect(page.getByTestId("empty-state")).toBeVisible();
});

test("upload do admin exige administrador", async ({ request }) => {
  const res = await request.post("/api/admin/upload", { multipart: { target: "media", path: "media/2026/x.png", file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("x") } } });
  expect([401, 403]).toContain(res.status());
});
