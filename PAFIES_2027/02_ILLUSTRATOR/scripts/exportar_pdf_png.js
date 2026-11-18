// Exporta cada SVG para PDF vetorial (abre no Illustrator com camadas/grupos) e PNG 2x,
// embutindo a fonte Anton (OFL) para que os textos renderizem corretamente.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
const FONT = path.resolve(__dirname, '../../05_REMOTION/node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2');
const FONT_EXT = path.resolve(__dirname, '../../05_REMOTION/node_modules/@fontsource/anton/files/anton-latin-ext-400-normal.woff2');
const b64 = f => fs.readFileSync(f).toString('base64');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const d of ['pdf', 'png']) fs.mkdirSync(path.join(ROOT, d), { recursive: true });
  for (const f of fs.readdirSync(path.join(ROOT, 'svg')).filter(f => f.endsWith('.svg'))) {
    const svg = fs.readFileSync(path.join(ROOT, 'svg', f), 'utf8').replace(/<\?xml[^>]*>/, '');
    const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><head><style>
      @font-face{font-family:Anton;src:url(data:font/woff2;base64,${b64(FONT)}) format('woff2');unicode-range:U+0000-00FF,U+2000-206F;}
      @font-face{font-family:Anton;src:url(data:font/woff2;base64,${b64(FONT_EXT)}) format('woff2');}
      html,body{margin:0;background:transparent}</style></head><body>${svg}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const base = f.replace('.svg', '');
    await page.pdf({ path: path.join(ROOT, 'pdf', base + '.pdf'), width: w + 'px', height: h + 'px', printBackground: true, pageRanges: '1' });
    await page.screenshot({ path: path.join(ROOT, 'png', base + '.png'), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
    console.log('ok', base);
  }
  await browser.close();
})();
