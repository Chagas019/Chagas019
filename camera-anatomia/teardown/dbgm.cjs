const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(b); }); }).listen(0);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage();
  await p.addInitScript(() => { window.__TS = 12; }); p.on('pageerror', e => console.log(e.stack));
  await p.goto(`http://localhost:${srv.address().port}/teardown/index.html`); await p.waitForFunction('window.READY');
  console.log(await p.evaluate("JSON.stringify([TEARDOWN.cam.position, TEARDOWN.controls.target, TEARDOWN.cam.aspect])"));
  await p.evaluate("TEARDOWN.remove('lente')");
  for (let i = 0; i < 4; i++) { await p.waitForTimeout(1500); console.log(await p.evaluate("JSON.stringify({tw:TEARDOWN.BY.lente.twist,st:TEARDOWN.BY.lente.state,t:TEARDOWN.BY.lente.t})")); }
  await b.close(); srv.close();
})();
