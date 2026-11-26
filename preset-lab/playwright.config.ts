import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const PORT = Number(process.env.E2E_PORT || 3200);
// banco local descartável para cada execução
const dataDir = process.env.E2E_DATA_DIR || mkdtempSync(path.join(tmpdir(), "presetlab-e2e-"));
process.env.E2E_DATA_DIR = dataDir;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "off", locale: "pt-BR" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      DATA_BACKEND: "local",
      PAYMENTS_PROVIDER: "dev",
      ALLOW_LOCAL_DEMO: "true",
      LOCAL_DATA_DIR: dataDir,
      APP_SECRET: "e2e-secret-e2e-secret-e2e-secret-0123456789",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
