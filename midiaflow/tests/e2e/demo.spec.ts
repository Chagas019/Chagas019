import { expect, test, type Page } from '@playwright/test';

/** Erros de JavaScript na página fazem o teste falhar. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1000) < 1024;

async function openCreate(page: Page) {
  if (isMobile(page)) await page.getByRole('button', { name: 'Criar escala' }).last().click();
  else await page.locator('header').getByRole('button', { name: 'Criar escala' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test.beforeEach(async ({ page }, info) => {
  if (info.title.startsWith('primeiro acesso')) return;
  await page.goto('/?exemplo');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?exemplo');
  await expect(page.getByRole('heading', { name: /equipe!/ })).toBeVisible();
});

test('painel carrega sem erros e sem rolagem lateral', async ({ page }) => {
  const errors = watchErrors(page);
  await page.reload();
  await expect(page.getByText('Painel da missão')).toBeVisible();
  await expect(page.getByText('Exemplo com nomes e escalas fictícios.')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('criar, validar, editar, duplicar e excluir escala', async ({ page }) => {
  await openCreate(page);
  const dialog = page.getByRole('dialog');
  // validação: nome vazio
  await dialog.getByRole('button', { name: 'Criar escala' }).click();
  await expect(dialog.getByText('Informe o nome da celebração')).toBeVisible();
  await dialog.getByPlaceholder('Ex.: Missa da Juventude').fill('Missa de Teste Automático');
  await dialog.getByRole('button', { name: 'Sugerir disponível' }).first().click();
  await dialog.getByPlaceholder('Função personalizada (ex.: Drone)').fill('Drone');
  await dialog.getByRole('button', { name: 'Criar', exact: true }).click();
  await expect(dialog.locator('span', { hasText: 'Drone' })).toBeVisible();
  await dialog.getByRole('button', { name: /Criar escala|Salvar mesmo assim/ }).click();
  if (await dialog.getByRole('button', { name: 'Salvar mesmo assim' }).isVisible().catch(() => false)) {
    await dialog.getByRole('button', { name: 'Salvar mesmo assim' }).click();
  }
  await expect(page.getByText('Escala criada!')).toBeVisible();

  await page.goto('/escalas?q=Teste%20Autom%C3%A1tico');
  await page.getByText('Missa de Teste Automático').first().click();
  const detail = page.getByRole('dialog');
  await expect(detail.getByText('Equipe escalada')).toBeVisible();
  await detail.getByRole('button', { name: 'Duplicar' }).click();
  await expect(page.getByText('Escala duplicada.')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Editar' }).click();
  await page.getByRole('dialog').getByPlaceholder('Ex.: Missa da Juventude').fill('Missa Editada no Teste');
  await page.getByRole('dialog').getByRole('button', { name: /Salvar alterações|Salvar mesmo assim/ }).click();
  if (await page.getByRole('dialog').getByRole('button', { name: 'Salvar mesmo assim' }).isVisible().catch(() => false)) {
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar mesmo assim' }).click();
  }
  await page.goto('/escalas?q=Editada');
  await page.getByText('Missa Editada no Teste').first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click();
  await page.getByRole('dialog', { name: 'Excluir escala?' }).getByRole('button', { name: 'Excluir' }).click();
  await expect(page.getByText('Escala excluída.')).toBeVisible();
});

test('filtros de escalas e vagas abertas', async ({ page }) => {
  await page.goto('/escalas?status=precisa');
  await expect(page.getByText(/vaga\(s\) em aberto/)).toBeVisible();
  await expect(page.getByText('Precisa de voluntário').first()).toBeVisible();
  await page.goto('/escalas?q=nada-que-exista-xyz');
  await expect(page.getByText('Nenhuma escala encontrada')).toBeVisible();
});

test('calendário: mês, semana e lista', async ({ page }) => {
  await page.goto('/calendario');
  await page.getByRole('button', { name: 'Próximo' }).click();
  await page.getByRole('tab', { name: 'Semana' }).click();
  await page.getByRole('tab', { name: 'Lista' }).click();
  await page.getByRole('button', { name: 'Hoje' }).click();
  await expect(page.locator('main')).toContainText(/Missa|Nada neste mês/);
});

test('evento novo e integrante novo', async ({ page }) => {
  await page.goto('/eventos');
  await page.getByRole('button', { name: 'Novo evento' }).first().click();
  const d = page.getByRole('dialog');
  await d.getByRole('textbox').first().fill('Encontro de Teste');
  await d.locator('input').nth(4).fill('Salão paroquial');
  await d.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Encontro de Teste')).toBeVisible();

  await page.goto('/equipe');
  await page.getByRole('button', { name: 'Cadastrar integrante' }).click();
  await page.getByRole('dialog').locator('input').first().fill('Pessoa de Teste');
  await page.getByRole('dialog').getByRole('button', { name: 'Fotografia' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click();
  await page.getByLabel('Pesquisar integrantes').fill('Pessoa de Teste');
  await expect(page.getByText('Pessoa de Teste')).toBeVisible();
});

test('integrante confirma presença e não acessa a equipe', async ({ page }) => {
  await page.getByRole('button', { name: /^Perfil/ }).click();
  await page.getByRole('menuitem').nth(2).click();
  await page.goto('/minhas-escalas');
  const confirm = page.getByRole('button', { name: 'Confirmar presença' }).first();
  if (await confirm.count()) {
    await confirm.click();
    await expect(page.getByText(/Presença confirmada! Obrigado/)).toBeVisible();
  }
  await page.goto('/equipe');
  await expect(page.getByText('Acesso restrito')).toBeVisible();
});

test('formação: lição, mapa da igreja e certificado', async ({ page }) => {
  await page.goto('/formacao/celular/aparelhos');
  await page.getByRole('tab', { name: 'Android novo' }).click();
  await expect(page.getByText(/HDR10\+/)).toBeVisible();
  await page.getByRole('button', { name: 'Marcar como concluída' }).click();
  await page.goto('/formacao/posicoes/mapa');
  await page.getByRole('button', { name: /^3\. / }).first().click();
  await expect(page.getByRole('heading', { name: /Transepto direito/ })).toBeVisible();
  await expect(page.locator('svg[aria-label*="igreja católica"]')).toBeVisible();

  await page.goto('/formacao/avaliacao/quiz');
  const answers = [1, 2, 1, 1, 1, 0, 1, 1];
  const cards = page.locator('article .rounded-3xl');
  for (let i = 0; i < answers.length; i++) await cards.nth(i).getByRole('button').nth(answers[i]).click();
  await page.getByRole('button', { name: 'Ver resultado' }).click();
  await expect(page.getByText(/Aprovado/)).toBeVisible();
  await page.goto('/formacao');
  await expect(page.getByText('Certificado de formação')).toBeVisible();
});

test('página inexistente mostra 404', async ({ page }) => {
  await page.goto('/pagina-que-nao-existe');
  await expect(page.getByText('Página não encontrada')).toBeVisible();
  await expect(page).toHaveTitle(/MídiaFlow/);
});

test('primeiro acesso: site vazio, sem dados de exemplo', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bem-vindo ao MídiaFlow' })).toBeVisible();
  await page.getByRole('button', { name: 'Começar' }).click();
  await expect(page.getByText('Informe o nome da paróquia.')).toBeVisible();
  await page.getByLabel('Nome da paróquia').fill('Paróquia Santo Antônio');
  await page.getByLabel('Seu nome completo').fill('Joana Coordenadora');
  await page.getByRole('button', { name: 'Começar' }).click();
  await expect(page.getByRole('heading', { name: /equipe!/ })).toBeVisible();
  await expect(page.getByText('Exemplo com nomes')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/Ana Beatriz|Lucas Ferreira|Matriz São José/);
  await expect(page.getByText('Nenhuma celebração futura')).toBeVisible();

  // equipe começa vazia, com orientação
  await page.goto('/equipe');
  await expect(page.getByText('Cadastre a sua equipe')).toBeVisible();
  await page.getByRole('button', { name: 'Cadastrar integrante' }).first().click();
  await page.getByRole('dialog').locator('input').first().fill('Pedro Fotógrafo');
  await page.getByRole('dialog').getByRole('button', { name: 'Fotografia' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Pedro Fotógrafo')).toBeVisible();

  // os dados ficam salvos ao recarregar
  await page.reload();
  await expect(page.getByText('Pedro Fotógrafo')).toBeVisible();
  await page.goto('/escalas');
  await expect(page.getByText('Nenhuma escala encontrada')).toBeVisible();

  // cópia de segurança
  await page.goto('/configuracoes');
  const backup = page.getByRole('button', { name: 'Baixar cópia de segurança' });
  await backup.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 20_000 }), backup.click()]);
  expect(download.suggestedFilename()).toMatch(/^midiaflow-copia-.*\.json$/);
  expect(errors).toEqual([]);
});
