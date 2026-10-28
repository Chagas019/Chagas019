import { expect, test, type Page } from '@playwright/test';
import { DEFAULT_ROLES } from '../../src/lib/demo-data';
import { SupabaseMock } from './supabase-mock';

/** Modo real (login + banco) com o simulador do Supabase. */

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function signUp(page: Page, name: string, email: string, password = 'senha1234') {
  await page.getByRole('tab', { name: 'Criar conta' }).click();
  await page.getByLabel('Nome completo').fill(name);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Criar conta' }).last().click();
}

test('cria conta, cria a paróquia e salva uma escala no banco', async ({ page }) => {
  const mock = new SupabaseMock();
  await mock.install(page);
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Entrar na equipe' })).toBeVisible();

  // validação da senha
  await page.getByRole('tab', { name: 'Criar conta' }).click();
  await page.getByLabel('Nome completo').fill('Ana Coordenadora');
  await page.getByLabel('E-mail').fill('ana@paroquia.org');
  await page.getByLabel('Senha').fill('curta');
  await page.getByRole('button', { name: 'Criar conta' }).last().click();
  await expect(page.getByText(/pelo menos 8 caracteres/)).toBeVisible();
  await page.getByLabel('Senha').fill('senha1234');
  await page.getByRole('button', { name: 'Criar conta' }).last().click();

  await expect(page.getByRole('heading', { name: 'Quase lá!' })).toBeVisible();
  await page.getByRole('tab', { name: 'Criar paróquia' }).click();
  await page.getByLabel('Nome da paróquia').fill('Paróquia Santa Luzia');
  await page.getByLabel('Cidade').fill('Campinas');
  await page.getByRole('button', { name: 'Criar paróquia' }).last().click();

  await expect(page.getByRole('heading', { name: /equipe!/ })).toBeVisible();
  await expect(page.getByText('Modo demonstração')).toHaveCount(0);
  expect(mock.profiles[0]).toMatchObject({ access: 'admin', full_name: 'Ana Coordenadora' });

  await page.locator('header').getByRole('button', { name: 'Criar escala' }).click();
  const d = page.getByRole('dialog');
  await d.getByPlaceholder('Ex.: Missa da Juventude').fill('Missa do Domingo');
  await d.getByRole('button', { name: /Criar escala/ }).click();
  await expect(page.getByText('Escala criada!')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeVisible();
  await expect.poll(() => mock.data.values().next().value?.data.schedules.length).toBe(1);
  const row = mock.data.values().next().value!;
  expect(row.version).toBeGreaterThan(1);
  expect(row.data.members.every((m: { email: string }) => m.email === '')).toBe(true);

  // recarregar: os dados vêm do banco
  await page.reload();
  await page.goto('/escalas');
  await expect(page.getByText('Missa do Domingo').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('integrante entra pelo convite, já vinculado ao cadastro, e confirma presença', async ({ page }) => {
  const mock = new SupabaseMock();
  const admin = mock.addUser('coord@paroquia.org', 'senha1234', 'Coordenação');
  const { pid, code } = mock.seedParish(admin, DEFAULT_ROLES, {});
  // cadastro feito pela coordenação antes, com e-mail
  const data = mock.data.get(pid)!.data;
  data.members.push({ ...mock.newMember('m_pre', 'Lucas Ferreira', 'integrante'), roleIds: ['foto'], status: 'convidado' });
  mock.contacts.push({ parish_id: pid, member_id: 'm_pre', email: 'lucas@paroquia.org', phone: '' });
  const today = new Date();
  const date = new Date(today.getTime() + 3 * 864e5).toISOString().slice(0, 10);
  data.schedules.push({ id: 'e1', title: 'Missa da Juventude', eventType: 'Missa', date, start: '19:00', end: '20:00', location: 'Matriz', coordinatorId: 'm_admin', notes: '', createdAt: today.toISOString(),
    slots: [{ id: 's1', roleId: 'foto', memberId: 'm_pre', status: 'pendente' }] });

  await mock.install(page);
  await page.goto(`/?convite=${code}`);
  await expect(page.getByText(/Você recebeu um convite/)).toBeVisible();
  await signUp(page, 'Lucas Ferreira', 'lucas@paroquia.org');
  await expect(page.getByLabel('Código de convite')).toHaveValue(code);
  await page.getByRole('button', { name: 'Entrar na equipe' }).click();
  await expect(page.getByRole('heading', { name: /equipe!/ })).toBeVisible();
  expect(mock.profiles.find((p) => p.full_name === 'Lucas Ferreira')?.member_id).toBe('m_pre');

  // integrante não vê a área da equipe
  await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByText('Equipe', { exact: true })).toHaveCount(0);
  await page.goto('/minhas-escalas');
  await page.getByRole('button', { name: 'Confirmar presença' }).click();
  await expect(page.getByText(/Presença confirmada! Obrigado/)).toBeVisible();
  await expect.poll(() => mock.data.get(pid)!.data.schedules[0].slots[0].status).toBe('confirmado');
  expect(mock.calls).not.toContain('POST /rest/v1/rpc/save_parish_data');
});

test('login, senha errada, progresso da formação no banco e sair', async ({ page }) => {
  const mock = new SupabaseMock();
  const admin = mock.addUser('admin@paroquia.org', 'senha1234', 'Pe. Admin');
  mock.seedParish(admin, DEFAULT_ROLES);
  await mock.install(page);
  await page.goto('/');
  await page.getByLabel('E-mail').fill('admin@paroquia.org');
  await page.getByLabel('Senha').fill('errada123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();
  await page.getByLabel('Senha').fill('senha1234');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /equipe!/ })).toBeVisible();

  await page.goto('/formacao/missao/postura');
  await page.getByRole('button', { name: 'Marcar como concluída' }).click();
  await expect.poll(() => mock.training.get(admin.id)?.done).toContain('missao/postura');

  await page.goto('/configuracoes');
  await expect(page.getByText('CONVITE1')).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page.getByRole('heading', { name: 'Entrar na equipe' })).toBeVisible();
});

test('conflito: outra pessoa salvou antes, o app recarrega sem perder a consistência', async ({ page }) => {
  const mock = new SupabaseMock();
  const admin = mock.addUser('admin@paroquia.org', 'senha1234', 'Pe. Admin');
  const { pid } = mock.seedParish(admin, DEFAULT_ROLES);
  await mock.install(page);
  await page.goto('/');
  await page.getByLabel('E-mail').fill('admin@paroquia.org');
  await page.getByLabel('Senha').fill('senha1234');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: /equipe!/ })).toBeVisible();

  // outra pessoa grava no banco nesse meio tempo
  const row = mock.data.get(pid)!;
  row.data = { ...row.data, announcements: [{ id: 'a1', title: 'Aviso de outra pessoa', body: 'Teste', author: 'Outro', createdAt: new Date().toISOString() }] };
  row.version += 1;

  await page.locator('header').getByRole('button', { name: 'Criar escala' }).click();
  await page.getByRole('dialog').getByPlaceholder('Ex.: Missa da Juventude').fill('Escala em conflito');
  await page.getByRole('dialog').getByRole('button', { name: /Criar escala/ }).click();
  await expect(page.getByText(/Outra pessoa alterou os dados/)).toBeVisible();
  await expect(page.getByText('Aviso de outra pessoa')).toBeVisible();
});
