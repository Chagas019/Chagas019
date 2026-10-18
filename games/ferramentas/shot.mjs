// Renderiza render.html e salva o PNG do canvas.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.argv[2] || 'objeto.png';
const qs = process.argv[3] || '';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', m => console.log('console:', m.text()));
page.on('pageerror', e => console.log('err:', e.message));
await page.goto('http://localhost:8765/render.html?' + qs);
await page.waitForFunction(() => window.done, null, { timeout: 60000 });
const data = await page.evaluate(() => window.done);
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
await browser.close();
console.log('ok', out);
