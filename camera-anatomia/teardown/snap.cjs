const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(b); }); }).listen(0);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.addInitScript(() => { window.__TS = 12; }); const errs = []; p.on('pageerror', e => errs.push(e.stack)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(`http://localhost:${srv.address().port}/teardown/index.html`);
  await p.waitForFunction('window.READY', null, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(1500); await p.screenshot({ path: __dirname + '/s1.png' });
  const steps = process.argv.slice(2);
  for (const [i, s] of steps.entries()) { await p.evaluate(s); await p.waitForTimeout(2600); await p.screenshot({ path: __dirname + `/s${i + 2}.png` }); }
  console.log(errs.join('\n') || 'no errors'); await b.close(); srv.close();
})();
