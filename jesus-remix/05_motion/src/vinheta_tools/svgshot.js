// Preview de SVG → PNG (Chromium). Uso: node svgshot.js arquivo.svg saida.png [fundo]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [svgf, out, bg = '#E9E4D8'] = process.argv.slice(2);
  const svg = fs.readFileSync(svgf, 'utf8');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 840, height: 1096 } });
  await p.setContent(`<body style="margin:0;background:${bg}">${svg}</body>`);
  await p.screenshot({ path: out, fullPage: true }); await b.close();
})();
