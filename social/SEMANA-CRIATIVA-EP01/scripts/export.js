// Exporta cada slide em PNG 1080×1350 (export/png) e em alta resolução 2160×2700 (export/png-2x).
// Uso: node scripts/export.js [filtro]   — requer Playwright + Chromium.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const filter = process.argv[2] || '';
const slides = fs.readdirSync(path.join(root, 'slides')).filter(f => f.endsWith('.html') && f.includes(filter)).sort();

(async () => {
  const browser = await chromium.launch();
  for (const [scale, dir] of [[1, 'png'], [2, 'png-2x']]) {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: scale });
    for (const f of slides) {
      await page.goto('file://' + path.join(root, 'slides', f));
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      const out = path.join(root, 'export', dir, f.replace('.html', '.png'));
      await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
      console.log(dir, f);
    }
    await page.close();
  }
  await browser.close();
})();
