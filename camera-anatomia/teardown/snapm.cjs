const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(b); }); }).listen(0);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage();
  await p.addInitScript(() => { window.__TS = 12; });
  const errs = []; p.on('pageerror', e => errs.push(e.stack));
  await p.goto(`http://localhost:${srv.address().port}/teardown/index.html`); await p.waitForFunction('window.READY', null, { timeout: 60000 });
  await p.waitForTimeout(2500); await p.screenshot({ path: __dirname + '/m1.png' });
  await p.evaluate("TEARDOWN.remove('lente')"); await p.waitForTimeout(4000); await p.screenshot({ path: __dirname + '/m2.png' });
  await p.evaluate("document.getElementById('all').click()"); await p.waitForTimeout(16000); await p.screenshot({ path: __dirname + '/m3.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close(); srv.close();
})();
