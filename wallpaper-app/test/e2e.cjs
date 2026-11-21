// Teste ponta a ponta com Playwright: `node test/e2e.cjs`
const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const { startServer } = await import(path.join(__dirname, '..', 'server.mjs'));
  const server = await startServer(5188);
  const URL = 'http://localhost:5188/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const step = async (name, fn) => { await fn(); console.log('✓', name); };
  try {
    await step('boas-vindas aparece na primeira visita', async () => {
      await page.goto(URL);
      await page.getByRole('heading', { name: /Descubra wallpapers/i }).waitFor();
    });
    await step('botão Explorar leva ao início com 120 wallpapers', async () => {
      await page.click('[data-testid=explore]');
      await page.getByRole('heading', { name: 'Wallpapers', level: 1 }).waitFor();
      assert.equal(await page.locator('[data-testid=thumb]').count(), 120);
      await page.waitForSelector('.thumb img.is-ready');
    });
    await step('boas-vindas não volta após recarregar', async () => {
      await page.reload();
      await page.getByRole('heading', { name: 'Wallpapers', level: 1 }).waitFor();
    });
    await step('filtro por categoria', async () => {
      await page.click('[data-chip=architecture]');
      await page.getByRole('heading', { name: 'Arquitetura 3D' }).waitFor();
      assert.equal(await page.locator('[data-testid=thumb]').count(), 24);
      assert.equal(await page.getAttribute('[data-chip=architecture]', 'aria-pressed'), 'true');
    });
    await step('detalhe abre, navega e baixa PNG', async () => {
      await page.locator('[data-testid=thumb]').first().click();
      await page.waitForSelector('.detail canvas.is-ready');
      assert.match(page.url(), /#\/w\/architecture-01$/);
      await page.keyboard.press('ArrowRight');
      assert.match(page.url(), /#\/w\/architecture-02$/);
      await page.click('[data-testid=download]');
      const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-testid=res]').nth(1).click()]);
      assert.equal(download.suggestedFilename(), 'aura-architecture-02-1080x2340.png');
      const file = await download.path();
      const buf = require('node:fs').readFileSync(file);
      assert.equal(buf.readUInt32BE(16), 1080);
      assert.equal(buf.readUInt32BE(20), 2340);
    });
    await step('favoritar persiste após recarregar', async () => {
      await page.click('[data-testid=fav]');
      assert.equal(await page.getAttribute('[data-testid=fav]', 'aria-pressed'), 'true');
      await page.click('[data-testid=close]');
      await page.click('[data-chip=favoritos]');
      await page.reload();
      await page.getByRole('heading', { name: 'Favoritos' }).waitFor();
      assert.equal(await page.locator('[data-testid=thumb]').count(), 1);
    });
    await step('busca com acentos e estado vazio', async () => {
      await page.goto(URL + '#/busca');
      await page.fill('input[type=search]', 'por do sol');
      await page.getByText('24 encontrados').waitFor();
      await page.fill('input[type=search]', 'xyzzy');
      await page.getByText('Nada encontrado').waitFor();
    });
    await step('link direto para um wallpaper funciona', async () => {
      await page.goto(URL + '#/w/portraits-05');
      await page.waitForSelector('.detail canvas.is-ready');
      await page.keyboard.press('Escape');
      await page.getByRole('heading', { name: 'Wallpapers', level: 1 }).waitFor();
    });
    await step('funciona offline (service worker)', async () => {
      await page.goto(URL);
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await ctx.setOffline(true);
      await page.reload();
      await page.getByRole('heading', { name: 'Wallpapers', level: 1 }).waitFor();
      await ctx.setOffline(false);
    });
    await step('sem horizontal scroll e sem erros no console', async () => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 0, `scroll horizontal de ${overflow}px`);
      assert.deepEqual(errors, []);
    });
    console.log('\nTodos os testes ponta a ponta passaram.');
  } catch (e) {
    console.error('✗ Falhou:', e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
