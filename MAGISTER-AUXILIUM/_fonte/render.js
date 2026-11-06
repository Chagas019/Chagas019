// Renderiza todo elemento [data-export] de cada página em PNG (2x) e o manual em PDF.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const base = path.resolve(__dirname, '..');
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['01-BRANDING-BOARD/board.html','03-CARTOES/cartoes.html','04-PAPELARIA/papelaria.html','02-MOCKUPS/mockups.html','06-REDES-SOCIAIS/redes.html','05-ELEMENTOS-GRAFICOS/elementos.html','07-MANUAL/manual.html'];
(async () => {
  const b = await chromium.launch();
  for (const p of pages) {
    const pg = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
    await pg.goto('file://' + path.join(base, p), { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    for (const el of await pg.$$('[data-export]')) {
      const out = path.join(base, await el.getAttribute('data-export') + '.png');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await el.screenshot({ path: out }); console.log('png', path.relative(base, out));
    }
    if (p.includes('manual')) {
      await pg.pdf({ path: path.join(base, '07-MANUAL/manual-identidade-visual.pdf'), width: '1600px', height: '1000px', printBackground: true });
      console.log('pdf 07-MANUAL/manual-identidade-visual.pdf');
    }
    await pg.close();
  }
  await b.close();
})();
