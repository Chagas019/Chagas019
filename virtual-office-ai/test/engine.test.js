import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { getConfig } from '../src/config.js';
import { createTask, getTask, startWorkflow, recordReview, pickReviewer, OWNER } from '../src/tasks.js';
import { runTask, chat, recoverOnBoot } from '../src/engine.js';
import { executeTool } from '../src/tools/registry.js';
import { getEmployee } from '../src/tasks.js';
import { makeApp, tmpEnv, smartProvider, scriptedProvider, toolUse, text, validContent } from './helpers.js';

const newTask = (db, data, ator = OWNER) => createTask(db, { titulo: 'T', descricao: 'd', criterios_aceitacao: ['ok'], ...data }, ator);

test('atribuição de tarefas respeita tipos do cargo e assunção de tarefas simples por diretores', () => {
  const { db } = makeApp();
  assert.ok(newTask(db, { tipo: 'copy', responsavel: 'copywriter' }));
  assert.throws(() => newTask(db, { tipo: 'plano_trafego', responsavel: 'copywriter' }), /não executa/);
  // Diretor assume tarefa simples do departamento, mas não complexa
  assert.ok(newTask(db, { tipo: 'copy', responsavel: 'diretor-marketing', complexidade: 'simples' }));
  assert.throws(() => newTask(db, { tipo: 'copy', responsavel: 'diretor-marketing', complexidade: 'normal' }), /não executa/);
  assert.throws(() => newTask(db, { tipo: 'copy', responsavel: 'inexistente' }), /inexistente/);
});

test('regras de delegação entre funcionários', () => {
  const { db } = makeApp();
  assert.ok(newTask(db, { tipo: 'design_peca', responsavel: 'designer-grafico' }, 'social-media'));
  assert.throws(() => newTask(db, { tipo: 'prospeccao', responsavel: 'sdr' }, 'copywriter'), /regras de delegação/);
  assert.ok(newTask(db, { tipo: 'plano_operacional', responsavel: 'gerente-operacoes' }, 'ceo'));
  // Escalonar ao superior é sempre permitido
  assert.ok(newTask(db, { tipo: 'estrategia_marketing', responsavel: 'diretor-marketing' }, 'copywriter'));
});

test('execução real pelo motor: social media delega arte ao designer e entrega calendário', async () => {
  const provider = scriptedProvider((req, i) => {
    if (i === 0) return { stop_reason: 'tool_use', content: [toolUse('criar_tarefa', { titulo: 'Arte do post', descricao: 'Carrossel 1080x1350', tipo: 'design_peca', responsavel: 'designer-grafico', prazo: '2026-11-05', criterios_aceitacao: ['Formato 1080x1350'] })] };
    return { stop_reason: 'tool_use', content: [toolUse('entregar', { titulo: 'Calendário', conteudo: validContent('calendario_editorial') })] };
  });
  const { db, ...rest } = makeApp({ provider });
  const ctx = { db, ...rest };
  const id = newTask(db, { tipo: 'calendario_editorial', responsavel: 'social-media' });
  const r = await runTask(ctx, id);
  assert.equal(r.status, 'em_revisao');
  const sub = db.prepare('SELECT * FROM tasks WHERE parent_id=? AND tipo=?').get(id, 'design_peca');
  assert.equal(sub.assigned_slug, 'designer-grafico');
  assert.equal(sub.created_by, 'social-media');
  assert.equal(sub.prazo, '2026-11-05');
  assert.equal(provider.calls[0].model, 'claude-opus-5-5');
  assert.ok(provider.calls[0].system.includes('Bianca Alves'));
  assert.ok(provider.calls[0].tools.some((t) => t.name === 'criar_tarefa'));
  assert.ok(!provider.calls[0].tools.some((t) => t.name === 'revisar_entrega'));
  // Persistência: entrega, execução, consumo
  const d = db.prepare('SELECT * FROM deliverables WHERE task_id=?').get(id);
  assert.ok(JSON.parse(d.validacao).ok);
  const run = db.prepare('SELECT * FROM runs WHERE task_id=?').get(id);
  assert.equal(run.status, 'concluida');
  assert.ok(run.custo_usd > 0 && run.input_tokens === 2000 && run.output_tokens === 1000);
  // Revisão independente aberta para o CMO
  const rev = db.prepare('SELECT * FROM tasks WHERE review_of=?').get(id);
  assert.equal(rev.assigned_slug, 'diretor-marketing');
});

test('fluxo entre departamentos: social → designer → diretor de arte → copy → revisor → projetos → CEO', async () => {
  const app = makeApp();
  const { db } = app;
  const cli = Number(db.prepare(`INSERT INTO clients (nome, created_at) VALUES ('Padaria Sol','x')`).run().lastInsertRowid);
  const { tarefas, workflow_run_id } = startWorkflow(db, 'pacote_social', { client_id: cli, briefing: 'Post de lançamento', prazo: '2026-11-10' }, OWNER);
  assert.equal(Object.keys(tarefas).length, 7);
  assert.deepEqual(getTask(db, tarefas.revisao_final).dependencias.sort(), [tarefas.revisao_arte, tarefas.revisao_texto].sort());
  assert.equal(getTask(db, tarefas.arte).assigned_slug, 'designer-grafico');
  // Antes das dependências, a tarefa seguinte não roda
  assert.equal((await runTask(app, tarefas.arte)).status, 'aguardando_dependencias');
  for (let i = 0; i < 12; i++) { await app.worker.tick(); await app.worker.drain(); }
  const st = db.prepare('SELECT status FROM tasks WHERE workflow_run_id=?').all(workflow_run_id).map((r) => r.status);
  assert.deepEqual([...new Set(st)], ['concluida']);
  assert.equal(db.prepare('SELECT status FROM workflow_runs WHERE id=?').get(workflow_run_id).status, 'concluido');
  assert.ok(db.prepare(`SELECT COUNT(*) n FROM reviews WHERE revisor_slug='revisor-qualidade' AND decisao='aprovar'`).get().n >= 2);
  // Todas as tarefas do fluxo herdaram o cliente
  assert.equal(db.prepare('SELECT COUNT(*) n FROM tasks WHERE workflow_run_id=? AND client_id=?').get(workflow_run_id, cli).n, 7);
});

test('reprovação na revisão reabre a tarefa com feedback e o revisor é independente', async () => {
  const app = makeApp();
  const { db } = app;
  const id = newTask(db, { tipo: 'copy', responsavel: 'copywriter' });
  assert.equal((await runTask(app, id)).status, 'em_revisao');
  const rev = getTask(db, db.prepare('SELECT id FROM tasks WHERE review_of=?').get(id).id);
  assert.equal(rev.assigned_slug, 'revisor-qualidade');
  assert.throws(() => recordReview(db, rev, 'revisor-qualidade', { decisao: 'reprovar', motivos: [] }), /motivo/);
  recordReview(db, rev, 'revisor-qualidade', { decisao: 'reprovar', motivos: ['CTA fraco'], ajustes: ['Reescrever CTA'] });
  const t = getTask(db, id);
  assert.equal(t.status, 'pendente');
  assert.match(t.feedback, /CTA fraco/);
  // Autor = revisor padrão → sobe para o superior
  assert.equal(pickReviewer(db, { tipo: 'branding' }, 'diretor-arte'), 'diretor-marketing');
  assert.throws(() => recordReview(db, { ...rev, id: rev.id }, 'copywriter', { decisao: 'aprovar', motivos: ['x'] }), /própria entrega/);
});

test('resposta em texto não conclui tarefa e entrega fora dos critérios volta com feedback', async () => {
  const provider = scriptedProvider(() => ({ stop_reason: 'end_turn', content: [text('Pronto, fiz tudo.')] }));
  const app = makeApp({ provider });
  const id = newTask(app.db, { tipo: 'copy', responsavel: 'copywriter' });
  const r = await runTask(app, id);
  assert.equal(r.status, 'pendente');
  assert.equal(provider.calls.length, 2); // uma insistência para usar entregar
  assert.notEqual(getTask(app.db, id).status, 'concluida');

  const p2 = scriptedProvider(() => ({ stop_reason: 'tool_use', content: [toolUse('entregar', { titulo: 'x', conteudo: 'curto' })] }));
  const app2 = makeApp({ provider: p2 });
  const id2 = newTask(app2.db, { tipo: 'pesquisa_mercado', responsavel: 'pesquisador-mercado' });
  const r2 = await runTask(app2, id2);
  assert.equal(r2.status, 'pendente');
  assert.ok(r2.falhas.some((f) => /fontes verificáveis/.test(f)));
  assert.match(getTask(app2.db, id2).feedback, /validação automática/);
});

test('afirmar publicação sem execução aprovada reprova a entrega', async () => {
  const p = scriptedProvider(() => ({ stop_reason: 'tool_use', content: [toolUse('entregar', { titulo: 'Calendário', conteudo: validContent('calendario_editorial') + '\nPost publicado com sucesso no Instagram.' })] }));
  const app = makeApp({ provider: p });
  const id = newTask(app.db, { tipo: 'calendario_editorial', responsavel: 'social-media' });
  const r = await runTask(app, id);
  assert.ok(r.falhas.some((f) => /ação externa/.test(f)));
});

test('tratamento de falhas: erro do provedor, novas tentativas e falha final', async () => {
  const p = scriptedProvider(() => new Error('API indisponível'));
  const app = makeApp({ provider: p });
  const { db } = app;
  const id = newTask(db, { tipo: 'copy', responsavel: 'copywriter' });
  const r1 = await runTask(app, id);
  assert.equal(r1.status, 'pendente');
  assert.ok(r1.nova_tentativa_apos);
  assert.equal(getEmployee(db, 'copywriter').estado, 'disponivel');
  assert.equal(db.prepare('SELECT status, erro FROM runs WHERE task_id=?').get(id).status, 'erro');
  // Backoff: não roda antes da hora
  assert.equal((await runTask(app, id)).status, 'ocupada');
  for (let i = 0; i < 2; i++) { db.prepare('UPDATE tasks SET locked_until=NULL WHERE id=?').run(id); await runTask(app, id); }
  const t = getTask(db, id);
  assert.equal(t.status, 'falhou');
  assert.equal(t.attempts, 3);
  assert.ok(db.prepare(`SELECT COUNT(*) n FROM notifications WHERE para='diretor-marketing' AND tipo='falha'`).get().n >= 1);
});

test('limites de custo por tarefa e por dia', async () => {
  const big = scriptedProvider(() => ({ stop_reason: 'tool_use', usage: { input_tokens: 200000, output_tokens: 20000 }, content: [toolUse('registrar_progresso', { nota: 'trabalhando' })] }));
  const app = makeApp({ provider: big });
  const id = newTask(app.db, { tipo: 'copy', responsavel: 'copywriter' });
  const r = await runTask(app, id);
  assert.equal(r.status, 'bloqueada');
  assert.match(r.motivo, /limite de custo por tarefa/);
  assert.equal(big.calls.length, 1);

  // Orçamento diário da empresa esgotado: nenhuma chamada ao provedor
  const env = tmpEnv({ VOA_DAILY_BUDGET_USD: '0.0001' });
  const p2 = smartProvider();
  const app2 = makeApp({ env, provider: p2 });
  app2.db.prepare(`INSERT INTO runs (employee_slug, status, custo_usd, started_at) VALUES ('ceo','concluida',1,?)`).run(new Date().toISOString());
  const id2 = newTask(app2.db, { tipo: 'copy', responsavel: 'copywriter' });
  const r2 = await runTask(app2, id2);
  assert.equal(r2.status, 'sem_orcamento');
  assert.equal(p2.calls.length, 0);
  assert.equal(getTask(app2.db, id2).status, 'pendente');
  assert.equal((await app2.worker.tick()).iniciadas, 0);
});

test('sem provedor de IA a tarefa não é falsamente concluída', async () => {
  const app = makeApp({ provider: null });
  const id = newTask(app.db, { tipo: 'copy', responsavel: 'copywriter' });
  assert.equal((await runTask(app, id)).status, 'sem_provedor');
  assert.equal(getTask(app.db, id).status, 'pendente');
  const c = await chat(app, 'ceo', 'Olá');
  assert.equal(c.status, 'sem_provedor');
  assert.match(c.aviso, /ANTHROPIC_API_KEY/);
});

test('ferramenta não permitida é negada e auditada; ferramenta não conectada informa limitação', async () => {
  const app = makeApp();
  const { db } = app;
  const id = newTask(db, { tipo: 'copy', responsavel: 'copywriter' });
  const emp = getEmployee(db, 'copywriter');
  const task = getTask(db, id);
  const ctx = { db, config: app.config, env: app.env, emp, task, runId: null, state: {} };
  const r = await executeTool(ctx, 'financeiro_lancar', { tipo: 'despesa', categoria: 'x', descricao: 'x', valor: 1, data: '2026-10-01', origem_autorizacao: 'x' });
  assert.equal(r.ok, false);
  assert.match(r.content, /permissão negada/);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM finance_entries').get().n, 0);
  assert.equal(db.prepare(`SELECT COUNT(*) n FROM audit_log WHERE acao='ferramenta_negada'`).get().n, 1);
  const des = getEmployee(db, 'designer-grafico');
  const r2 = await executeTool({ ...ctx, emp: des }, 'gerar_imagem', { prompt: 'x' });
  assert.match(r2.content, /não conectada/);
});

test('isolamento de dados entre clientes', async () => {
  const app = makeApp();
  const { db } = app;
  const a = Number(db.prepare(`INSERT INTO clients (nome, contexto, created_at) VALUES ('Cliente A','segredo A','x')`).run().lastInsertRowid);
  const b = Number(db.prepare(`INSERT INTO clients (nome, contexto, created_at) VALUES ('Cliente B','segredo B','x')`).run().lastInsertRowid);
  const tb = newTask(db, { tipo: 'copy', responsavel: 'copywriter', client_id: b });
  await runTask(app, tb);
  const ta = newTask(db, { tipo: 'copy', responsavel: 'copywriter', client_id: a });
  assert.throws(() => newTask(db, { tipo: 'copy', responsavel: 'copywriter', client_id: a, depende_de: [tb] }), /outro cliente/);
  const ctx = { db, config: app.config, env: app.env, emp: getEmployee(db, 'copywriter'), task: getTask(db, ta), runId: null, state: {} };
  assert.match((await executeTool(ctx, 'consultar_entregas', { tarefa_id: tb })).content, /não encontrada/);
  const lista = JSON.parse((await executeTool(ctx, 'consultar_tarefas', {})).content).tarefas;
  assert.ok(lista.every((t) => t.client_id === a));
  // O contexto enviado ao modelo só contém o cliente da tarefa
  const p = smartProvider();
  await runTask({ ...app, provider: p }, ta);
  const sent = JSON.stringify(p.calls[0].messages);
  assert.ok(sent.includes('segredo A') && !sent.includes('segredo B'));
  // Subtarefa herda o cliente
  const sub = createTask(db, { titulo: 's', tipo: 'design_peca', responsavel: 'designer-grafico', parent_id: ta, criterios_aceitacao: ['x'] }, 'social-media');
  assert.equal(getTask(db, sub).client_id, a);
});

test('estados do escritório sincronizados com execuções reais', async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  const p = scriptedProvider(async () => { await gate; return { stop_reason: 'tool_use', content: [toolUse('entregar', { titulo: 'x', conteudo: validContent('copy') })] }; });
  const app = makeApp({ provider: p });
  const { db } = app;
  assert.equal(db.prepare(`SELECT COUNT(*) n FROM employees WHERE estado='trabalhando'`).get().n, 0);
  const id = newTask(db, { tipo: 'copy', responsavel: 'copywriter' });
  const running = runTask(app, id);
  await new Promise((r) => setImmediate(r));
  assert.equal(getEmployee(db, 'copywriter').estado, 'trabalhando');
  assert.equal(db.prepare(`SELECT COUNT(*) n FROM employees WHERE estado='trabalhando'`).get().n, 1);
  release();
  await running;
  assert.equal(getEmployee(db, 'copywriter').estado, 'disponivel');
  // Recuperação após queda: ninguém fica "trabalhando" sem execução
  db.prepare(`UPDATE employees SET estado='trabalhando' WHERE slug='qa'`).run();
  db.prepare(`INSERT INTO runs (employee_slug, status, started_at) VALUES ('qa','em_andamento',?)`).run(new Date().toISOString());
  const rec = recoverOnBoot(db);
  assert.equal(rec.runs, 1);
  assert.equal(getEmployee(db, 'qa').estado, 'disponivel');
});

test('conversa direta: CEO recebe ordem e distribui trabalho', async () => {
  const p = scriptedProvider((req, i) => i === 0
    ? { stop_reason: 'tool_use', content: [toolUse('criar_tarefa', { titulo: 'Estratégia Q4', descricao: 'Plano para o cliente', tipo: 'estrategia_marketing', responsavel: 'diretor-marketing', prazo: '2026-11-15', criterios_aceitacao: ['Documento estratégico completo'] })] }
    : { stop_reason: 'end_turn', content: [text('Criei a tarefa para o CMO.')] });
  const app = makeApp({ provider: p });
  const r = await chat(app, 'ceo', 'Quero uma estratégia de Q4.');
  assert.equal(r.status, 'concluida');
  assert.equal(r.resposta, 'Criei a tarefa para o CMO.');
  const t = app.db.prepare(`SELECT * FROM tasks WHERE tipo='estrategia_marketing'`).get();
  assert.equal(t.assigned_slug, 'diretor-marketing');
  assert.equal(t.created_by, 'ceo');
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM messages').get().n, 2);
  assert.ok(!p.calls[0].tools.some((x) => x.name === 'entregar'));
});

test('persistência após reinício', async () => {
  const env = tmpEnv();
  const app = createApp({ env, config: getConfig(env), provider: smartProvider() });
  const id = newTask(app.db, { tipo: 'copy', responsavel: 'copywriter' });
  await runTask(app, id);
  app.db.close();
  const again = createApp({ env, config: getConfig(env), provider: null });
  assert.equal(again.db.prepare('SELECT COUNT(*) n FROM deliverables WHERE task_id=?').get(id).n, 1);
  assert.equal(again.db.prepare('SELECT COUNT(*) n FROM runs WHERE task_id=?').get(id).n, 1);
  assert.equal(getTask(again.db, id).status, 'em_revisao');
});
