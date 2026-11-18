const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + __dirname + '/index.html'); await p.waitForTimeout(3500);
  await p.screenshot({ path: __dirname + '/shots/full.png', fullPage: true });
  const hero = await p.$('#camera .stage'); const bb = await hero.boundingBox();
  await p.mouse.move(bb.x + bb.width * .5, bb.y + bb.height * .5); await p.waitForTimeout(2200);
  await p.screenshot({ path: __dirname + '/shots/hero-apart.png', clip: { x: bb.x - 20, y: bb.y - 50, width: bb.width + 40, height: bb.height + 140 } });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
