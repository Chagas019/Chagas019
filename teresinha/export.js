// Gera todos os arquivos finais da coleção em exports/
// uso: node export.js [caminho-da-arte]   (padrão: art/principal.jpg)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const arte = path.resolve(process.argv[2] || path.join(__dirname, 'art', 'principal.jpg'));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 1600 } });
  await p.goto('file://' + path.join(__dirname, 'pecas.html'));
  await p.addStyleTag({ content: `:root{--art:url('file://${arte}')}` });
  await p.waitForTimeout(2500);
  const ids = await p.$$eval('.peca', els => els.map(e => e.id));
  for (const id of ids) {
    await (await p.$('#' + id)).screenshot({ path: path.join(__dirname, 'exports', id + '.png') });
    console.log('ok', id);
  }
  await b.close();
})();
