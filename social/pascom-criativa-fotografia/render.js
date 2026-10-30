// Exporta a coleção em PNG 1080x1350: node render.js [nº do post] [blocos]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const args = process.argv.slice(2), blocos = args.includes('blocos'), only = args.find(a => /^\d+$/.test(a));
  const page_ = blocos ? 'blocos.html' : 'index.html', outDir = blocos ? 'png-blocos' : 'png';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  page.on('pageerror', e => console.error('erro na página:', e.message));
  await page.goto('file://' + path.join(__dirname, page_) + '?render' + (only ? '&post=' + only : ''));
  await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
  for (const s of await page.$$('.slide')) {
    const [n, i] = await s.evaluate(e => [e.dataset.post, e.dataset.i]);
    const dir = path.join(__dirname, outDir, 'post-' + n);
    fs.mkdirSync(dir, { recursive: true });
    await s.screenshot({ path: path.join(dir, `slide-${i.padStart(2, '0')}.png`) });
  }
  console.log('ok');
  await browser.close();
})();
