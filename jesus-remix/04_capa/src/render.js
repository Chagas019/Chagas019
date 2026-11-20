// Render das artes estáticas: node render.js [formato]
// Cada job: [formato, largura de saída, altura de saída, arquivo, query extra]
const { chromium } = require('playwright');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const JOBS = [
  ['capa', 3000, 3000, '04_capa/capa_3000.png'],
  ['capa', 1080, 1080, '04_capa/capa_1080.png'],
  ['story', 1080, 1920, '07_social/posts/story_data_1080x1920.png'],
  ['wide', 1920, 1080, '07_social/posts/wide_1920x1080.png'],
  ['post_data', 1080, 1080, '07_social/posts/post_data_1080x1080.png'],
  // Fase 2
  ['wide', 1280, 720, '04_capa/youtube_thumb_1280x720.png'],          // → .jpg via export.py (png removido)
  ['feed45', 1080, 1350, '07_social/posts/feed_4x5_1080x1350.png'],
  ['story_em_breve', 1080, 1920, '07_social/stories/story_01_em_breve_1080x1920.png'],
  ['story_capa', 1080, 1920, '07_social/stories/story_02_capa_1080x1920.png'],
  ['story', 1080, 1920, '07_social/stories/story_03_data_1080x1920.png'],
  ['story_hoje', 1080, 1920, '07_social/stories/story_04_hoje_1080x1920.png'],
  ...[7, 5, 3, 1].flatMap(n => [
    ['cd_post', 1080, 1080, `07_social/posts/countdown/countdown_${n}_post_1080x1080.png`, `&n=${n}`],
    ['cd_story', 1080, 1920, `07_social/posts/countdown/countdown_${n}_story_1080x1920.png`, `&n=${n}`],
  ]),
];
(async () => {
  const only = process.argv[2];
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  for (const [f, w, h, out, extra = ''] of JOBS) {
    if (only && only !== f) continue;
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.goto('file://' + path.join(__dirname, 'frames.html') + `?f=${f}&w=${w}${extra}`);
    await page.waitForFunction(() => document.body.dataset.ready === '1');
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#art').screenshot({ path: path.join(ROOT, out) });
    console.log('ok', out);
    await page.close();
  }
  await browser.close();
})();
