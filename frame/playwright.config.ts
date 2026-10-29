import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgres://frame:frame@localhost:5432/frame_test";

/**
 * E2E contra a aplicação compilada (`npm run build` antes) usando o banco frame_test.
 * O globalSetup recria o schema e aplica as migrações.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "pt-BR",
    trace: "retain-on-failure",
    ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/entrar`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: TEST_DB,
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
      BETTER_AUTH_SECRET: "e2e-secret-0123456789abcdef0123456789abcdef",
      LOCAL_STORAGE_DIR: "./storage-e2e",
      STORAGE_DRIVER: "local",
      CHALLENGE_MIN_ACCOUNT_AGE_HOURS: "0",
      FRAME_DISABLE_AUTH_RATE_LIMIT: "1",
      FRAME_DISABLE_APP_RATE_LIMIT: "1",
      FRAME_ALLOW_LOG_MAIL: "1",
      // "Caixa de entrada" dos testes: os e-mails viram arquivos para o teste abrir o link de acesso.
      FRAME_MAIL_FILE_SINK: path.join(os.tmpdir(), "frame-e2e-mail"),
    },
  },
});
