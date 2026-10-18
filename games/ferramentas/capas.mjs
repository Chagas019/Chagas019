// Renderiza capas.html para cada jogo e salva WebP em ../portal/img.
// Uso: servir games/ferramentas na porta 8767 e rodar `node capas.mjs <pasta-saida>`.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.argv[2];
const ids = ['hero', 'mw4', 'ffr', 'pbz', 'zelda', 'gta6', 'dqm', 'mhw', 'poe2', 'pz2', 'rer', 'b007'];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('err', e.message));
for (const id of ids) {
  await page.goto(`http://localhost:8767/capas.html?id=${id}`);
  await page.waitForFunction(() => window.done, null, { timeout: 30000 });
  const data = await page.evaluate(() => window.done);
  fs.writeFileSync(`${out}/${id}.png`, Buffer.from(data.split(',')[1], 'base64'));
  console.log('ok', id);
}
await browser.close();
