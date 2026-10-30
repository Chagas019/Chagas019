// Exporta a coleção em PNG 1080x1350: node render.js [nº do post]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const only = process.argv[2];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  page.on('pageerror', e => console.error('erro na página:', e.message));
  await page.goto('file://' + path.join(__dirname, 'index.html') + '?render' + (only ? '&post=' + only : ''));
  await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
  for (const s of await page.$$('.slide')) {
    const [n, i] = await s.evaluate(e => [e.dataset.post, e.dataset.i]);
    const dir = path.join(__dirname, 'png', 'post-' + n);
    fs.mkdirSync(dir, { recursive: true });
    await s.screenshot({ path: path.join(dir, `slide-${i.padStart(2, '0')}.png`) });
  }
  console.log('ok');
  await browser.close();
})();
