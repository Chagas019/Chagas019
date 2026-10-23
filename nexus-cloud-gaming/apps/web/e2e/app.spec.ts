import { expect, test } from '@playwright/test';

test.describe('página inicial', () => {
  test('mostra hero, CTA principal e aviso de dados demonstrativos', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu universo gamer');
    await expect(page.getByRole('link', { name: 'Jogar agora' })).toHaveAttribute('href', '/catalogo?disponibilidade=operacional');
    await expect(page.getByText('4 jogos já funcionam no navegador.')).toBeVisible();
    for (const id of ['jogar', 'destaques', 'plataformas', 'recentes', 'populares', 'favoritos', 'controle', 'status', 'servidores', 'planos']) {
      await expect(page.locator(`section#${id}`)).toBeAttached();
    }
  });

  test('não tem rolagem horizontal', async ({ page }) => {
    for (const path of ['/', '/catalogo', '/jogo/supertuxkart', '/jogar/neon-breaker', '/controle', '/sala-de-teste', '/servidores', '/plataformas/ps5']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `rolagem horizontal em ${path}`).toBeLessThanOrEqual(1);
    }
  });

  test('mede a conexão real com o servidor', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Disponibilidade do serviço' })).toContainText(/\d+ ms/, { timeout: 10_000 });
  });
});

test.describe('catálogo, pesquisa e filtros', () => {
  test('pesquisa ignora acentos e atualiza a URL', async ({ page }) => {
    await page.goto('/catalogo');
    await page.getByRole('searchbox', { name: 'Pesquisar jogos' }).fill('estrategia turnos');
    await expect(page).toHaveURL(/q=estrategia\+turnos/);
    await expect(page.getByRole('status').filter({ hasText: 'encontrado' })).toHaveText('1 jogo encontrado');
    await expect(page.getByRole('link', { name: /Battle for Wesnoth/ })).toBeVisible();
  });

  test('filtros vindos da URL são validados', async ({ page }) => {
    await page.goto('/catalogo?plataforma=dreamcast&controle=completo&toque=1');
    await expect(page.getByRole('status').filter({ hasText: 'encontrado' })).toHaveText('6 jogos encontrados');
  });

  test('"Disponível" lista só os jogos que rodam de verdade', async ({ page }) => {
    await page.goto('/catalogo?disponibilidade=operacional');
    await expect(page.getByRole('status').filter({ hasText: 'encontrado' })).toHaveText('4 jogos encontrados');
    for (const name of ['Neon Breaker', 'Void Runner', 'Starfall', 'Neon Snake']) {
      await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();
    }
  });
});

test.describe('página do jogo', () => {
  test('sem integração não existe botão Jogar funcional', async ({ page }) => {
    await page.goto('/jogo/supertuxkart');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('SuperTuxKart');
    await expect(page.getByRole('main').getByRole('button', { name: 'Em breve' }).first()).toBeDisabled();
    await expect(page.getByRole('link', { name: /^Jogar$/ })).toHaveCount(0);
    await expect(page.getByText('Classificação indicativa')).toBeVisible();
    await expect(page.getByText('A confirmar (ClassInd)')).toBeVisible();
  });

  test('slug desconhecido retorna 404', async ({ page }) => {
    const res = await page.goto('/jogo/nao-existe');
    expect(res?.status()).toBe(404);
  });

  test('favoritar e histórico persistem no aparelho', async ({ page }) => {
    await page.goto('/jogo/xonotic');
    await page.getByRole('button', { name: 'Favoritar' }).click();
    await expect(page.getByRole('button', { name: 'Favorito', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/biblioteca');
    await expect(page.locator('#favoritos').getByRole('link', { name: /Xonotic/ })).toBeVisible();
    await expect(page.locator('#historico').getByRole('link', { name: /Xonotic/ })).toBeVisible();
    await page.getByRole('button', { name: 'Limpar histórico' }).click();
    await expect(page.locator('#historico').getByText('Nada por aqui ainda')).toBeVisible();
  });

  test('armazenamento corrompido não quebra a página', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nexus:v1:favorites', '{oops');
      localStorage.setItem('nexus:v1:preferences', JSON.stringify({ quality: '16k', mapping: { confirmar: 'x' } }));
    });
    await page.goto('/biblioteca');
    await expect(page.getByText('Sem favoritos')).toBeVisible();
  });
});

test.describe('plataformas', () => {
  test('Nintendo não oferece acesso nem links de ROM', async ({ page }) => {
    await page.goto('/plataformas/nintendo');
    await expect(page.getByText('Sem acesso legítimo disponível')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Abrir site oficial' })).toHaveCount(0);
  });

  test('Xbox aponta para o serviço oficial em nova aba', async ({ page }) => {
    await page.goto('/plataformas/xboxseries');
    const link = page.getByRole('link', { name: /Abrir site oficial/ });
    await expect(link).toHaveAttribute('href', 'https://www.xbox.com/play');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

test.describe('controle Bluetooth (Gamepad API simulada no navegador de teste)', () => {
  test.beforeEach(async ({ page }) => {
    // Controle virtual: o navegador de teste não tem Bluetooth, então injetamos um gamepad "standard".
    await page.addInitScript(() => {
      const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
      const pad = { id: 'Controle de teste (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons, timestamp: 0 };
      (window as unknown as { __pad: typeof pad }).__pad = pad;
      Object.defineProperty(navigator, 'getGamepads', { value: () => [pad, null, null, null] });
    });
  });

  test('detecta o controle, mostra ações e permite remapear', async ({ page }) => {
    await page.goto('/controle');
    await expect(page.getByTestId('pad-id')).toHaveText('Controle de teste (STANDARD GAMEPAD)');
    await page.evaluate(() => { const p = (window as any).__pad; p.buttons[0] = { pressed: true, touched: true, value: 1 }; });
    await expect(page.getByText(/Ações ativas: Confirmar/)).toBeVisible();
    await page.evaluate(() => { const p = (window as any).__pad; p.buttons[0] = { pressed: false, touched: false, value: 0 }; });

    await page.getByRole('button', { name: 'Botão 0' }).click();
    await expect(page.getByRole('button', { name: 'Aperte…' })).toBeVisible();
    await page.evaluate(() => { const p = (window as any).__pad; p.buttons[3] = { pressed: true, touched: true, value: 1 }; });
    await expect(page.getByText('Confirmar (A / ✕) agora usa o botão 3.')).toBeVisible();

    await page.reload();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('nexus:v1:preferences')!).mapping);
    expect(stored.confirmar).toBe(3);
    expect(stored.acao4).toBe(0);
  });
});

test.describe('sala de teste', () => {
  test('informa que é demonstração local e mostra controles de toque no celular', async ({ page, isMobile }) => {
    await page.goto('/sala-de-teste');
    await expect(page.getByText('Demonstração local · nenhum jogo está sendo transmitido')).toBeVisible();
    await expect(page.getByTestId('touch-controls')).toHaveCount(isMobile ? 1 : 0);
    await expect(page.getByText(/\d+ fps no aparelho/)).toBeVisible();
  });

  test('preferência de qualidade é salva', async ({ page }) => {
    await page.goto('/sala-de-teste');
    await page.getByLabel('Qualidade do streaming').selectOption('720p60');
    await page.reload();
    await expect(page.getByLabel('Qualidade do streaming')).toHaveValue('720p60');
  });

  test('indicador entra em reconexão quando o servidor cai e se recupera', async ({ page }) => {
    let fail = false;
    await page.route('**/api/health**', (route) => (fail ? route.abort() : route.continue()));
    await page.goto('/sala-de-teste');
    await expect(page.getByRole('status').filter({ hasText: / ms/ }).first()).toBeVisible({ timeout: 10_000 });
    fail = true;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.getByText(/Sem conexão · nova tentativa em \d+ s/)).toBeVisible({ timeout: 10_000 });
    fail = false;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.getByRole('status').filter({ hasText: / ms/ }).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('segurança e PWA', () => {
  test('envia cabeçalhos de segurança', async ({ request }) => {
    const res = await request.get('/');
    const h = res.headers();
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['x-powered-by']).toBeUndefined();
  });

  test('health não é cacheável e não expõe dados internos', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.headers()['cache-control']).toContain('no-store');
    expect(Object.keys(await res.json()).sort()).toEqual(['ok', 'service', 'time']);
  });

  test('manifesto do PWA é válido', async ({ request }) => {
    const m = await (await request.get('/manifest.webmanifest')).json();
    expect(m.display).toBe('standalone');
    expect(m.icons.some((i: { purpose: string }) => i.purpose === 'maskable')).toBe(true);
    for (const icon of m.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  });

  test('rotas inexistentes da API não aceitam comandos', async ({ request }) => {
    expect((await request.post('/api/health', { data: { cmd: 'rm -rf /' } })).status()).toBe(405);
  });
});

test.describe('jogos no navegador', () => {
  test('página do jogo jogável tem botão Jogar que abre o player', async ({ page }) => {
    await page.goto('/jogo/neon-breaker');
    await page.getByRole('main').getByRole('link', { name: 'Jogar', exact: true }).click();
    await expect(page).toHaveURL(/\/jogar\/neon-breaker$/);
    await expect(page.getByRole('dialog', { name: 'Começar Neon Breaker' })).toBeVisible();
    await expect(page.getByText('Mova com ◀ ▶ e lance a bola com A')).toBeVisible();
  });

  test('jogos de streaming não têm rota de player', async ({ page }) => {
    expect((await page.goto('/jogar/supertuxkart'))?.status()).toBe(404);
  });

  for (const slug of ['neon-breaker', 'void-runner', 'starfall', 'neon-snake']) {
    test(`${slug} inicia, desenha e pausa`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`/jogar/${slug}`);
      await page.getByRole('button', { name: 'Começar' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      // O canvas precisa ter pixels desenhados (não pode ficar preto/vazio).
      const lit = await page.locator('canvas').evaluate((c: HTMLCanvasElement) => {
        const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 200) n++;
        return n;
      });
      expect(lit).toBeGreaterThan(0);
      await page.getByRole('button', { name: 'Pausar' }).click();
      await expect(page.getByRole('dialog', { name: 'Jogo pausado' })).toBeVisible();
      await page.getByRole('button', { name: 'Continuar' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }

  test('Void Runner: pontua, termina ao bater e salva o recorde', async ({ page }) => {
    await page.goto('/jogar/void-runner');
    await page.keyboard.press('Space');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // Sem pular, o corredor bate no primeiro obstáculo.
    await expect(page.getByRole('dialog', { name: 'Fim de jogo' })).toBeVisible({ timeout: 20_000 });
    const best = Number((await page.getByTestId('best').innerText()).trim());
    expect(best).toBeGreaterThan(0);
    await page.reload();
    await expect(page.getByTestId('best')).toHaveText(String(best));
    await page.getByRole('button', { name: 'Começar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('Neon Snake responde ao controle Bluetooth', async ({ page }) => {
    await page.addInitScript(() => {
      const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
      const pad = { id: 'Controle de teste', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons, timestamp: 0 };
      (window as unknown as { __pad: typeof pad }).__pad = pad;
      Object.defineProperty(navigator, 'getGamepads', { value: () => [pad, null, null, null] });
    });
    await page.goto('/jogar/neon-snake');
    const set = (i: number, v: boolean) => page.evaluate(([i, v]) => { (window as any).__pad.buttons[i as number] = { pressed: v, touched: v, value: v ? 1 : 0 }; }, [i, v] as const);
    // A Gamepad API é lida a cada quadro: um aperto real dura vários quadros.
    const press = async (i: number, v: boolean) => { await set(i, v); await page.waitForTimeout(120); };
    await press(0, true); // A começa
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await press(0, false);
    await press(15, true); // direcional direita: a cobra começa a andar e bate na parede
    await press(15, false);
    await expect(page.getByRole('dialog', { name: 'Fim de jogo' })).toBeVisible({ timeout: 15_000 });
    await press(9, true); // Start reinicia
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
