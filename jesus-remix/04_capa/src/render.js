// Render das artes estáticas: node render.js [preview]
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const JOBS = [
  ['capa', 3000, 3000, '04_capa/capa_3000.png'],
  ['capa', 1080, 1080, '04_capa/capa_1080.png'],
  ['story', 1080, 1920, '07_social/posts/story_data_1080x1920.png'],
  ['wide', 1920, 1080, '07_social/posts/wide_1920x1080.png'],
  ['post_data', 1080, 1080, '07_social/posts/post_data_1080x1080.png'],
];
(async () => {
  const only = process.argv[2];
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  for (const [f, w, h, out] of JOBS) {
    if (only && only !== f) continue;
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.goto('file://' + path.join(__dirname, 'frames.html') + `?f=${f}&w=${w}`);
    await page.waitForFunction(() => document.body.dataset.ready === '1');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#art').screenshot({ path: path.join(ROOT, out) });
    console.log('ok', out);
    await page.close();
  }
  await browser.close();
})();
