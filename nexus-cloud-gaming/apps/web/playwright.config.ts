import { defineConfig, devices } from '@playwright/test';

/**
 * E2E contra o build de produção (`next start`).
 *
 * Projetos:
 * - chromium-desktop / chromium-mobile: rodam aqui e na CI.
 * - webkit-iphone: Safari real só existe com o WebKit do Playwright instalado
 *   (`npx playwright install webkit`). O projeto mobile em Chromium emula
 *   apenas a tela e o toque do iPhone, não o motor do Safari.
 *
 * PW_CHROMIUM_PATH permite usar um Chromium já instalado no sistema.
 */
const PORT = Number(process.env.PORT ?? 3100);
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const withWebkit = process.env.PW_WEBKIT === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'], launchOptions: { executablePath } } },
    ...(withWebkit ? [{ name: 'webkit-iphone', use: { ...devices['iPhone 15'] } }] : []),
  ],
});
