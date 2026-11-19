// Verificação de produção: node scripts/prod-check.cjs https://mailbot-ai-chagas7.vercel.app [pasta-screenshots]
const { chromium, devices } = require('playwright');
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const out = process.argv[3];
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASSOU' : 'FALHOU'}  ${name}${detail ? ` — ${detail}` : ''}`); };

(async () => {
  const health = await fetch(`${base}/api/health`).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
  check('GET /api/health responde 200', health.status === 200, JSON.stringify(health.body));
  const cron = await fetch(`${base}/api/cron`);
  check('GET /api/cron sem segredo é recusado (401)', cron.status === 401, `status ${cron.status}`);
  const cronBad = await fetch(`${base}/api/cron`, { headers: { Authorization: 'Bearer errado' } });
  check('GET /api/cron com segredo errado é recusado (401)', cronBad.status === 401, `status ${cronBad.status}`);
  for (const [path, method] of [['/api/sync', 'POST'], ['/api/chat', 'POST'], ['/api/reports', 'POST'], ['/api/preferences', 'PATCH'], ['/api/account', 'DELETE'], ['/api/gmail/disconnect', 'POST']]) {
    const r = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, body: '{}' });
    check(`${method} ${path} sem login não executa (401/503)`, r.status === 401 || r.status === 503, `status ${r.status}`);
  }
  const connect = await fetch(`${base}/api/gmail/connect`, { redirect: 'manual' });
  check('GET /api/gmail/connect sem login não inicia OAuth', connect.status === 401 || connect.status === 503, `status ${connect.status}`);
  const home = await fetch(`${base}/`, { redirect: 'manual' });
  check('Telas protegidas redirecionam para /login', [307, 308, 302, 303].includes(home.status) && (home.headers.get('location') || '').includes('/login'), `status ${home.status} → ${home.headers.get('location')}`);
  const hdr = await fetch(`${base}/login`);
  check('Cabeçalhos de segurança (HSTS, X-Frame-Options, nosniff)', Boolean(hdr.headers.get('strict-transport-security')) && hdr.headers.get('x-frame-options') === 'DENY' && hdr.headers.get('x-content-type-options') === 'nosniff');

  const browser = await chromium.launch();
  for (const [name, opts] of [['celular', devices['iPhone 14']], ['tablet', devices['iPad (gen 7)']], ['desktop', { viewport: { width: 1440, height: 900 } }]]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const r = await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const html = await page.content();
    const leaked = /service_role|SUPABASE_SERVICE_ROLE_KEY|TOKEN_ENCRYPTION_KEY|CRON_SECRET|sk-ant-/.test(html);
    check(`/login no ${name}: 200, sem erros de JS, sem rolagem lateral`, r.status() === 200 && !errors.length && !overflow, `erros=${errors.length} overflow=${overflow}`);
    check(`/login no ${name}: nenhum segredo no HTML`, !leaked);
    if (out) await page.screenshot({ path: `${out}/prod-login-${name}.png` });
    await ctx.close();
  }
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} verificações passaram`);
  process.exit(failed ? 1 : 0);
})();
