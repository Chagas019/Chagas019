/**
 * Gera as imagens de demonstração, os panoramas e os modelos .glb a partir das plantas.
 * Uso: npm run renders [-- filtro]   (ex.: npm run renders -- horizonte/sala)
 * Requer Chromium (Playwright). Defina CHROMIUM_PATH se não estiver em /opt/pw-browsers/chromium.
 */
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';

const filter = process.argv[2];
const OUT = new URL('../public/media/', import.meta.url).pathname;

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = '/opt/pw-browsers';
  if (existsSync(base)) {
    const dir = readdirSync(base).find((d) => /^chromium-\d+$/.test(d));
    if (dir) return join(base, dir, 'chrome-linux', 'chrome');
  }
  return undefined;
}

const server = await createServer({ configFile: new URL('../vite.config.ts', import.meta.url).pathname, server: { port: 5199, hmr: false, watch: null }, logLevel: 'warn' });
await server.listen();
const browser = await chromium.launch({ executablePath: findChromium(), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.exposeFunction('__log', (m) => console.log(m));
await page.exposeFunction('__save', async (name, dataUrl) => {
  const file = name.endsWith('.glb') ? join(OUT, '..', name) : join(OUT, name);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('  salvo', file.replace(process.cwd() + '/', ''));
});
await page.goto('http://localhost:5199/render/index.html');
await page.waitForFunction(() => typeof window.__run === 'function', null, { timeout: 120000 });
await page.evaluate((f) => window.__run(f), filter);
await browser.close();
await server.close();
