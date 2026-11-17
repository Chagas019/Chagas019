// Teste ponta a ponta contra o Supabase real, com usuários fictícios criados só para o teste.
// Uso: PW=<senha> node e2e/fluxo.mjs   (app rodando em http://localhost:3100)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // Playwright do ambiente (não é dependência do app)
import { createServerClient } from '@supabase/ssr';
import fs from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:3100';
const OUT = process.env.OUT ?? '.';
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => l.split(/=(.*)/s).slice(0, 2)));
const PW = process.env.PW;
const log = (...a) => console.log('•', ...a);
const must = (c, m) => { if (!c) throw new Error('FALHOU: ' + m); log('ok', m); };

async function sessionCookies(email) {
  const jar = [];
  const sb = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: { getAll: () => jar, setAll: l => l.forEach(c => { const i = jar.findIndex(x => x.name === c.name); i >= 0 ? jar.splice(i, 1, c) : jar.push(c); }) },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password: PW });
  if (error) throw error;
  return jar.map(c => ({ name: c.name, value: c.value, url: BASE }));
}

const b = await chromium.launch();
/** Clica e espera a página mudar de endereço (as ações redirecionam com ?ok= ou ?erro=). */
const submit = async (page, sel) => { const before = page.url(); await page.click(sel); await page.waitForURL(u => u.toString() !== before); };
const errors = [];
const ctxFor = async (email, vp = { width: 1360, height: 900 }) => {
  const c = await b.newContext({ viewport: vp });
  if (email) await c.addCookies(await sessionCookies(email));
  const p = await c.newPage();
  p.on('pageerror', e => errors.push(e.message));
  return p;
};

// 1. Sem login vai para /entrar
let p = await ctxFor(null);
await p.goto(BASE + '/p/qualquer/escalas');
must(p.url().includes('/entrar?next='), 'sem login redireciona para /entrar mantendo o destino');
await p.screenshot({ path: `${OUT}/app-entrar.png` });

// 2. Admin cria a paróquia
const admin = await ctxFor('admin.teste@exemplo.invalid');
await admin.goto(BASE + '/');
must(admin.url().endsWith('/comecar'), 'admin sem paróquia vai para /comecar');
await admin.fill('input[name=name]', 'Paróquia Teste Exemplo');
await admin.fill('input[name=slug]', 'teste-exemplo-e2e');
await admin.click('button[type=submit]');
await admin.waitForURL('**/p/teste-exemplo-e2e');
must(await admin.locator('text=Primeiros passos').count() === 1, 'painel mostra primeiros passos');
const S = BASE + '/p/teste-exemplo-e2e';

// 3. Equipe: pastoral, função, convite
await admin.goto(S + '/equipe');
await admin.fill('form:has(button:text("Criar pastoral")) input[name=name]', 'Liturgia');
await submit(admin, 'button:text("Criar pastoral")');
await admin.fill('input[placeholder^="Nova função"]', 'Leitor');
await submit(admin, 'button:text("Criar função")');
must(await admin.locator('text=Funções: Leitor').count() === 1, 'pastoral e função criadas');
await admin.fill('form:has(button:text("Criar convite")) input[name=email]', 'voluntario.teste@exemplo.invalid');
await submit(admin, 'button:text("Criar convite")');
const link = (await admin.locator('.code').first().innerText()).trim();
must(link.includes('/convite/'), 'convite criado com link');

// 4. Agenda: missa amanhã 10h
const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
await admin.goto(S + '/agenda?m=' + tomorrow.slice(0, 7));
await admin.fill('input[name=title]', 'Missa Dominical');
await admin.fill('input[name=date]', tomorrow);
await admin.fill('input[name=time]', '10:00');
await admin.fill('input[name=location]', 'Matriz');
await submit(admin, 'button:text("Salvar evento")');
must(await admin.locator('.ev-item:has-text("Missa Dominical")').count() === 1, 'evento aparece na agenda');
await admin.screenshot({ path: `${OUT}/app-agenda.png`, fullPage: true });

// 5. Voluntário aceita o convite
const vol = await ctxFor('voluntario.teste@exemplo.invalid');
await vol.goto(link.replace(/^https?:\/\/[^/]+/, BASE));
await vol.click('button:text("Aceitar convite")');
await vol.waitForURL('**/p/teste-exemplo-e2e');
must(true, 'voluntário aceitou o convite e entrou na paróquia');
await vol.goto(link.replace(/^https?:\/\/[^/]+/, BASE));
await submit(vol, 'button:text("Aceitar convite")');
must(true, 'convite não pode ser reutilizado');

// 6. Admin monta a escala
await admin.goto(S + '/escalas');
await admin.selectOption('select[name=role_id]', { label: 'Leitor · Liturgia' });
await admin.fill('input[name=quantity]', '2');
await submit(admin, 'button:text("Adicionar")');
await admin.selectOption('select[name=user_id]', { label: 'Voluntário Teste' });
await submit(admin, 'button:text("Escalar")');
must(await admin.locator('.person:has-text("Voluntário Teste") >> text=Sem resposta').count() === 1, 'voluntário escalado, aguardando resposta');

// 7. Voluntário confirma pelo painel
await vol.goto(S);
await submit(vol, 'button:text("Confirmar")');
must(await vol.locator('text=Confirmado').count() >= 1, 'voluntário confirmou a presença');
await vol.screenshot({ path: `${OUT}/app-painel-voluntario.png`, fullPage: true });
await vol.goto(S + '/equipe');
must(await vol.locator('text=Convidar pessoa').count() === 0, 'voluntário não vê convites');
const r = await vol.goto(BASE + '/p/outra-paroquia-inexistente');
must(await vol.locator('text=Paróquia não encontrada').count() === 1, 'paróquia alheia retorna "não encontrada"');

await admin.goto(S + '/escalas');
await admin.screenshot({ path: `${OUT}/app-escalas.png`, fullPage: true });
const m = await ctxFor('admin.teste@exemplo.invalid', { width: 390, height: 844 });
await m.goto(S);
must(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, 'celular sem rolagem lateral');
await m.screenshot({ path: `${OUT}/app-painel-celular.png`, fullPage: true });

must(errors.length === 0, 'sem erros no console: ' + errors.join(' | '));
await b.close();
console.log('FLUXO COMPLETO OK');
