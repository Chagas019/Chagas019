import { expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const dbFile = () => path.join(process.env.E2E_DATA_DIR!, "db.json");
export const uniqueEmail = (p = "user") => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
export const PASSWORD = "senhaForte123";

/** Cadastro completo pela interface, confirmando pelo link da caixa de e-mails local. */
/** Cada teste simula um IP diferente (o limite de tentativas é por IP). */
export async function freshClientIp(page: Page) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.${rand()}.${rand()}.${rand()}` });
}
const rand = () => Math.floor(Math.random() * 250) + 1;

export async function signUpAndConfirm(page: Page, email = uniqueEmail(), name = "Teste E2E") {
  await freshClientIp(page);
  await page.goto("/cadastro");
  await page.getByLabel(/nome/i).fill(name);
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/^senha/i).fill(PASSWORD);
  await page.getByRole("button", { name: /criar conta/i }).click();
  await expect(page).toHaveURL(/\/cadastro\/confirme/);
  await page.goto("/dev/emails");
  const link = page.locator(`[data-testid="email-link"]`).first();
  const href = await link.getAttribute("href");
  expect(href).toContain("/auth/confirm");
  await page.goto(href!);
  await expect(page).toHaveURL(/\/lab/);
  return email;
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/entrar");
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/^senha/i).fill(password);
  await page.getByRole("button", { name: /^entrar$/i }).click();
}

/** Promove a admin direto no banco local (mesmo efeito de scripts/promote-admin.mjs). */
export function promoteToAdmin(email: string) {
  const db = JSON.parse(readFileSync(dbFile(), "utf8"));
  const p = db.profiles.find((x: { email: string }) => x.email === email);
  p.role = "admin";
  writeFileSync(dbFile(), JSON.stringify(db));
}
