// Gera os PNGs finais em exports/ — uso: node export.js (requer playwright)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1400 } });
  await p.goto('file://' + path.join(__dirname, 'export.html'));
  await p.waitForTimeout(3000);
  const ids = await p.$$eval('.x', els => els.map(e => e.id));
  for (const id of ids) {
    await (await p.$('#' + id)).screenshot({ path: path.join(__dirname, 'exports', id + '.png') });
  }
  console.log(ids.length + ' arquivos em exports/');
  await b.close();
})();
