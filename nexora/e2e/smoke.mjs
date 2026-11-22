/**
 * Teste de fumaça no navegador: abre as páginas principais, exercita filtros, favoritos, comparação,
 * planta, 3D, formulário e painel, e falha se houver erro no console.
 * Uso: npm run build && node e2e/smoke.mjs [pasta-de-capturas]
 */
import { preview } from 'vite';
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });
const exe = process.env.CHROMIUM_PATH ?? (() => { const b = '/opt/pw-browsers'; if (!existsSync(b)) return undefined; const d = readdirSync(b).find((x) => /^chromium-\d+$/.test(x)); return d && join(b, d, 'chrome-linux', 'chrome'); })();
const server = await preview({ preview: { port: 4188 }, logLevel: 'warn' });
const BASE = 'http://localhost:4188';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
let failures = 0;
const check = (cond, msg) => { if (!cond) { failures++; console.error('✗', msg); } else console.log('✓', msg); };

async function newPage(viewport) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${page.url()} :: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${page.url()} :: ${e.message}`));
  return page;
}
const shot = async (page, name) => { if (shots) await page.screenshot({ path: join(shots, `${name}.png`), fullPage: false }); };

const page = await newPage({ width: 1440, height: 900 });
await page.goto(BASE + '/');
await page.getByRole('heading', { level: 1 }).waitFor();
check((await page.title()).includes('NEXORA'), 'home tem título');
await page.getByRole('button', { name: 'Só o essencial' }).click();
await page.waitForTimeout(800);
await shot(page, '01-home');
await page.locator('#destaques').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await shot(page, '02-home-destaques');

// busca da home → catálogo filtrado
await page.locator('#busca').scrollIntoViewIfNeeded();
await page.getByRole('radio', { name: 'Alugar' }).check({ force: true });
await page.getByRole('button', { name: 'Buscar', exact: true }).first().click();
await page.waitForURL(/finalidade=aluguel/);
await page.getByText(/imóve(l|is) encontrado/).waitFor();
const rentCount = await page.locator('main article').count();
check(rentCount === 2, `filtro "alugar" mostra 2 imóveis (mostrou ${rentCount})`);
await shot(page, '03-catalogo-aluguel');

// filtros combinados e ordenação
await page.goto(BASE + '/imoveis?quartos=3&ordem=preco-asc');
await page.getByText(/imóve(l|is) encontrado/).waitFor();
const names = await page.locator('main article h3').allTextContents();
check(names.length === 3 && names[0] === 'Casa Jardim das Águas', `3+ quartos ordenado por preço: ${names.join(', ')}`);
await page.goto(BASE + '/imoveis?q=piscina');
await page.getByText(/imóve(l|is) encontrado/).waitFor();
check((await page.locator('main article').count()) >= 2, 'busca por texto "piscina"');
await page.goto(BASE + '/imoveis?precoMin=9000000');
await page.getByText('Nenhum imóvel com esses filtros').waitFor();
check(true, 'estado vazio do catálogo');
await page.getByRole('button', { name: 'Limpar filtros' }).first().click();
await page.waitForTimeout(400);
check((await page.locator('main article').count()) === 6, 'limpar filtros mostra a primeira página (6)');
await page.getByRole('button', { name: 'Carregar mais imóveis' }).click();
check((await page.locator('main article').count()) === 7, 'carregar mais mostra os 7 publicados (rascunho fica de fora)');

// favoritos persistem
await page.getByRole('button', { name: 'Favoritar Casa Horizonte' }).first().click();
await page.reload();
await page.goto(BASE + '/favoritos');
await page.getByRole('heading', { name: 'Casa Horizonte' }).waitFor();
check(true, 'favorito persiste após recarregar');

// comparação
await page.goto(BASE + '/imoveis');
await page.getByRole('button', { name: 'Comparar Casa Horizonte' }).click();
await page.getByRole('button', { name: 'Comparar Studio Linha' }).click();
await page.goto(BASE + '/comparar');
await page.getByRole('table').waitFor();
check((await page.getByText('Não informado').count()) > 0, 'comparação mostra "Não informado" para dados ausentes');
await shot(page, '04-comparar');

// detalhe
await page.goto(BASE + '/imovel/casa-contemporanea-001');
await page.getByRole('heading', { level: 1, name: 'Casa Horizonte' }).waitFor();
check((await page.locator('script[type="application/ld+json"]').count()) >= 1, 'detalhe tem JSON-LD');
await shot(page, '05-detalhe');
await page.getByRole('tab', { name: /Planta baixa/ }).click();
await page.getByRole('button', { name: 'Cozinha', exact: false }).first().click();
await page.getByRole('heading', { name: 'Cozinha', level: 3 }).waitFor();
check(true, 'planta: selecionar cozinha mostra detalhes');
await shot(page, '06-planta');
await page.getByRole('button', { name: 'Ver no 3D' }).click();
await page.locator('canvas').first().waitFor({ timeout: 30000 });
await page.waitForTimeout(9000);
await shot(page, '07-3d-cozinha');
await page.getByRole('button', { name: 'Voltar à vista inicial' }).click();
await page.waitForTimeout(4000);
await shot(page, '08-3d-geral');
await page.getByRole('button', { name: 'Mudar para modo noturno' }).click();
await page.waitForTimeout(2500);
await shot(page, '09-3d-noite');
await page.locator('#imovel-panel-tour-3d').getByRole('button', { name: 'Cozinha' }).last().click();
await page.waitForTimeout(5000);
await shot(page, '10-tour360');

// formulário de visita com validação
await page.goto(BASE + '/imovel/apartamento-alto-padrao-002');
await page.getByRole('button', { name: 'Agendar visita' }).first().click();
const dlg = page.getByRole('dialog');
await dlg.getByRole('button', { name: 'Solicitar visita' }).click();
check((await dlg.getByText('Informe seu nome').count()) === 1, 'validação do formulário');
await dlg.getByLabel('Nome').fill('Pessoa Teste');
await dlg.getByLabel('E-mail').fill('teste@example.com');
const d = new Date(); d.setDate(d.getDate() + 3); if (d.getDay() === 0) d.setDate(d.getDate() + 1);
await dlg.getByLabel('Dia').fill(d.toISOString().slice(0, 10));
await dlg.getByLabel('Horário').selectOption('10:00');
await dlg.getByRole('checkbox').check();
await dlg.getByRole('button', { name: 'Solicitar visita' }).click();
await dlg.getByText('Pedido de visita recebido').waitFor();
check(true, 'pedido de visita enviado');
await shot(page, '11-visita');

// painel
await page.goto(BASE + '/admin');
await page.waitForURL(/entrar/);
check(true, 'painel redireciona sem login');
await page.getByRole('button', { name: 'Abrir painel (demonstração)' }).click();
await page.getByRole('heading', { name: 'Visão geral' }).waitFor();
check((await page.getByText('Pessoa Teste').count()) === 1, 'visita aparece no painel');
await page.goto(BASE + '/admin/imoveis');
await page.getByRole('button', { name: 'Publicar Cobertura Alto do Lume' }).click();
await page.waitForTimeout(400);
await shot(page, '12-admin');
await page.goto(BASE + '/imoveis?q=cobertura');
await page.getByRole('heading', { name: 'Cobertura Alto do Lume' }).waitFor();
check(true, 'publicar no painel mostra o imóvel no site');

// 404 e SEO estático
await page.goto(BASE + '/nao-existe');
await page.getByText('Esta porta não leva a lugar nenhum.').waitFor();
check(true, 'página 404');

// celular
const m = await newPage({ width: 390, height: 844 });
await m.goto(BASE + '/');
await m.getByRole('heading', { level: 1 }).waitFor();
await m.waitForTimeout(800);
await shot(m, '13-mobile-home');
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
check(overflow <= 1, `sem rolagem horizontal no celular (${overflow}px)`);
await m.getByRole('button', { name: 'Abrir menu' }).click();
await m.waitForTimeout(700);
await shot(m, '14-mobile-menu');
await m.goto(BASE + '/imovel/casa-contemporanea-001');
await m.getByRole('heading', { level: 1 }).waitFor();
await shot(m, '15-mobile-detalhe');
check(await m.getByRole('button', { name: 'Agendar', exact: true }).isVisible(), 'barra de ações fixa no celular');

const relevant = errors.filter((e) => !/Download the React DevTools/.test(e));
check(relevant.length === 0, `sem erros no console${relevant.length ? ':\n  ' + relevant.join('\n  ') : ''}`);
await browser.close();
await new Promise((r) => server.httpServer.close(r));
console.log(failures ? `\n${failures} falha(s)` : '\nTudo certo.');
process.exit(failures ? 1 : 0);
