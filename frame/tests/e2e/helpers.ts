import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import postgres from "postgres";
import sharp from "sharp";

export const sqlClient = () => postgres(process.env.TEST_DATABASE_URL ?? "postgres://frame:frame@localhost:5432/frame_test", { max: 1, onnotice: () => {} });

let n = 0;
export function uniqueUser(prefix: string) {
  n += 1;
  const id = `${prefix}${Date.now().toString(36)}${n}`;
  return { name: `${prefix[0]!.toUpperCase()}${prefix.slice(1)} Teste`, email: `${id}@e2e.local`, password: "senha-segura-123", handle: id.toLowerCase().slice(0, 28) };
}

export async function fixtureImage(name: string, color: string, w = 1200, h = 900) {
  const dir = path.join(os.tmpdir(), "frame-e2e-fixtures");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.jpg`);
  await sharp({ create: { width: w, height: h, channels: 3, background: color } }).jpeg().toFile(file);
  return file;
}

/** Cadastro + onboarding completo pela interface. */
export async function signUp(page: Page, u: ReturnType<typeof uniqueUser>) {
  await page.goto("/cadastro");
  await page.getByLabel("Nome", { exact: true }).fill(u.name);
  await page.getByLabel("E-mail").fill(u.email);
  await page.getByLabel("Senha").fill(u.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Identificador").fill(u.handle);
  const interests = page.getByRole("group", { name: "Interesses" });
  await interests.getByRole("button", { name: "Fotografia", exact: true }).click();
  await interests.getByRole("button", { name: "Color grading", exact: true }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/primeiros-passos/);
}

export async function publishWork(page: Page, title: string, file: string, visibility: "Público" | "Seguidores" | "Só eu" = "Público") {
  await page.goto("/publicar");
  await page.locator('input[type="file"]').first().setInputFiles(file);
  await expect(page.getByText("Capa")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publicar", exact: true })).toBeEnabled({ timeout: 20_000 });
  await page.getByLabel("Título").fill(title);
  await page.getByRole("button", { name: "Retrato", exact: true }).click();
  if (visibility !== "Público") await page.getByRole("radio", { name: new RegExp(visibility) }).click();
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  return page.url().split("/p/")[1]!;
}
