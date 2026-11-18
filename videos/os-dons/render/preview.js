const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const out = process.argv[2]; const times = process.argv.slice(3).map(Number);
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('console', m => console.log('LOG', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.resolve(__dirname, 'render.html'));
  await p.evaluate(() => window.ready);
  for (const t of times) {
    const t0 = Date.now();
    const d = await p.evaluate(t => window.grab(t, .9), t);
    fs.writeFileSync(`${out}/f_${t.toFixed(2)}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
    console.log(t, Date.now() - t0, 'ms');
  }
  await b.close();
})();
