const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">' + fs.readFileSync(__dirname + '/index.html', 'utf8') + '</body></html>';
  fs.writeFileSync('/tmp/vit.html', html);
  await p.goto('file:///tmp/vit.html'); await p.mouse.wheel(0, 1100); await p.waitForTimeout(6000);
  await p.screenshot({ path: __dirname + '/full.png', fullPage: false }); console.log(errs.join('\n') || 'no errors'); await b.close();
})();
