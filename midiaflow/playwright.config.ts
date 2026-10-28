import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de ponta a ponta.
 * demo-*   : site em modo demonstração (sem banco), no computador e no celular.
 * remote   : site com login e banco, usando o simulador do Supabase (tests/e2e/supabase-mock.ts).
 * Rode com: npm run test:e2e
 */
const CI = !!process.env.CI;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' },
  webServer: [
    { command: 'npx vite preview --port 4301 --strictPort --outDir dist-e2e/demo', port: 4301, reuseExistingServer: !CI },
    { command: 'npx vite preview --port 4302 --strictPort --outDir dist-e2e/remote', port: 4302, reuseExistingServer: !CI },
  ],
  projects: [
    { name: 'demo-desktop', testMatch: /demo\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 }, baseURL: 'http://localhost:4301' } },
    { name: 'demo-mobile', testMatch: /demo\.spec\.ts/, use: { ...devices['Pixel 7'], baseURL: 'http://localhost:4301' } },
    { name: 'remote', testMatch: /remote\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 }, baseURL: 'http://localhost:4302' } },
  ],
});
