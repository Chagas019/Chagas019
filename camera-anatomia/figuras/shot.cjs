const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = [];
  for (const f of process.argv.slice(2)) {
    const p = await b.newPage({ viewport: { width: 900, height: 1000 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + __dirname + '/paginas/' + f + '.html'); await p.waitForTimeout(2500);
    if (f === 'camera') { const s = await p.$('.stage'); const bb = await s.boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(2500); }
    await p.screenshot({ path: __dirname + '/' + f + '.png', fullPage: true }); console.log(f, errs.join(';') || 'ok'); await p.close();
  }
  await b.close();
})();
