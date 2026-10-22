/**
 * Gera as imagens da galeria (public/gallery/*.jpg) capturando a própria cena 3D.
 * Uso: npm run build && npx vite preview --port 4173 &  →  npm run gallery
 * Variáveis: BASE_URL (padrão http://localhost:4173/), CHROMIUM_PATH (executável do Chromium).
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'gallery');
mkdirSync(out, { recursive: true });
const base = process.env.BASE_URL ?? 'http://localhost:4173/';

const SHOTS = [
  { file: 'fachada-dia.jpg', run: "s.setTimeOfDay('day'); s.flyTo({ position: [96, 34, 196], target: [0, 72, 0] }, 0.01)" },
  { file: 'noite.jpg', run: "s.setTimeOfDay('night'); s.flyTo({ position: [170, 62, 210], target: [0, 70, 0] }, 0.01)" },
  { file: 'cobertura.jpg', run: "s.setTimeOfDay('sunset'); s.openRooftop('overview')" },
  { file: 'explodida.jpg', run: "s.setTimeOfDay('day'); s.toggleExploded(true)" },
  { file: 'apartamento.jpg', run: "s.setTimeOfDay('day'); s.openApartment()" },
  { file: 'garagem.jpg', run: "s.setTimeOfDay('day'); s.openGarage(0, 'perspective')" },
];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`${base}?nohelp&quality=high&reduced&explore`);
await page.waitForFunction(() => window.__skyline?.getState().ready, null, { timeout: 180000 });
await page.addStyleTag({ content: '.ui, .show-ui, .toast-wrap { display: none !important; }' });

for (const shot of SHOTS) {
  await page.evaluate((code) => {
    const s = window.__skyline.getState();
    s.resetCamera();
    s.setUiHidden(true);
    new Function('s', code)(s);
  }, shot.run);
  await page.waitForTimeout(9000);
  await page.screenshot({ path: join(out, shot.file), type: 'jpeg', quality: 80, timeout: 180000 });
  console.log('✓', shot.file);
}
await browser.close();
