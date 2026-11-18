const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(b); }); }).listen(0);
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const mobile = process.argv.includes('--mobile');
  const ctx = mobile ? await b.newContext({ ...devices['iPhone 13'] }) : await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); await p.addInitScript(() => { window.__TS = 8; });
  const errs = []; p.on('pageerror', e => errs.push(e.stack)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(`http://localhost:${srv.address().port}/starklab/index.html`); await p.waitForFunction('window.READY', null, { timeout: 60000 });
  const tag = mobile ? 'm' : 'd';
  await p.waitForTimeout(700); await p.screenshot({ path: `${__dirname}/${tag}0.png` });
  await p.waitForTimeout(3500); await p.screenshot({ path: `${__dirname}/${tag}1.png` });
  for (const [i, s] of process.argv.slice(2).filter(a => !a.startsWith('--')).entries()) { const v = await p.evaluate(s); if (v !== undefined) console.log('eval:', v); await p.waitForTimeout(2500); await p.screenshot({ path: `${__dirname}/${tag}${i + 2}.png` }); }
  console.log(errs.join('\n') || 'no errors'); await b.close(); srv.close();
})();
