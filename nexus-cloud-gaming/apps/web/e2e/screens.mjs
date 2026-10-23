// Gera capturas de tela para revisão visual: node e2e/screens.mjs <saída>
import { chromium, devices } from '@playwright/test';
const out = process.argv[2] ?? 'screens';
const base = process.env.BASE ?? 'http://localhost:3100';
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
for (const [name, ctxOpts] of [['mobile', devices['iPhone 15']], ['desktop', { viewport: { width: 1440, height: 900 } }]]) {
  const ctx = await browser.newContext({ ...ctxOpts, defaultBrowserType: undefined });
  const page = await ctx.newPage();
  for (const path of (process.env.PAGES ?? '/,/catalogo,/jogo/supertuxkart,/controle,/sala-de-teste,/servidores').split(',')) {
    await page.goto(base + path, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const file = `${out}/${name}${path.replace(/\//g, '_') || '_home'}.png`;
    await page.screenshot({ path: file, fullPage: process.env.FULL === '1' });
    console.log(file);
  }
  await ctx.close();
}
await browser.close();
