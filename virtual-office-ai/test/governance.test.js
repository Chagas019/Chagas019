import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTask, getTask, getEmployee, OWNER } from '../src/tasks.js';
import { runTask } from '../src/engine.js';
import { requestApproval, decideApproval } from '../src/approvals.js';
import { buildHandler } from '../src/server.js';
import { readiness } from '../src/readiness.js';
import http from 'node:http';
import { makeApp, tmpEnv, smartProvider, scriptedProvider, toolUse, validContent } from './helpers.js';

const fakeFetch = () => {
  const calls = [];
  const f = async (url, opts) => { calls.push({ url, body: JSON.parse(opts.body), headers: opts.headers }); return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'camp-1', status: 'ok' }) }; };
  f.calls = calls;
  return f;
};

test('aprovação humana: tráfego pede alteração de orçamento, nada executa até o proprietário aprovar', async () => {
  const fetchImpl = fakeFetch();
  const env = tmpEnv({ ADS_WEBHOOK_URL: 'https://hooks.exemplo/ads', ADS_WEBHOOK_TOKEN: 't0k' });
  const provider = scriptedProvider((req, i) => i === 0
    ? { stop_reason: 'tool_use', content: [toolUse('solicitar_aprovacao', { acao: 'alterar_orcamento_anuncios', descricao: 'Subir orçamento diário para R$ 150', payload: { campanha: 'c1', orcamento_diario: 150 } })] }
    : { stop_reason: 'tool_use', content: [toolUse('entregar', { titulo: 'Plano', conteudo: validContent('plano_trafego') })] });
  const app = makeApp({ env, provider, fetchImpl });
  const { db } = app;
  const id = createTask(db, { titulo: 'Plano Meta Ads', tipo: 'plano_trafego', responsavel: 'especialista-trafego', criterios_aceitacao: ['ok'] }, OWNER);
  await runTask(app, id);
  const ap = db.prepare('SELECT * FROM approvals').get();
  assert.equal(ap.status, 'pendente');
  assert.equal(ap.solicitado_por, 'especialista-trafego');
  assert.equal(fetchImpl.calls.length, 0);
  // O CEO não pode aprovar
  await assert.rejects(decideApproval(db, ap.id, { decisao: 'aprovar', decidido_por: 'ceo' }, env, fetchImpl), /somente o proprietário/);
  const r = await decideApproval(db, ap.id, { decisao: 'aprovar', decidido_por: OWNER }, env, fetchImpl);
  assert.equal(r.status, 'executada');
  assert.equal(fetchImpl.calls.length, 1);
  assert.equal(fetchImpl.calls[0].url, 'https://hooks.exemplo/ads');
  assert.equal(fetchImpl.calls[0].body.acao, 'alterar_orcamento_anuncios');
  assert.equal(fetchImpl.calls[0].headers.authorization, 'Bearer t0k');
  // Não executa duas vezes
  await assert.rejects(decideApproval(db, ap.id, { decisao: 'aprovar', decidido_por: OWNER }, env, fetchImpl), /já/);
  // Auditoria: quem pediu, quem autorizou, quem executou e qual aprovação
  const aud = db.prepare(`SELECT * FROM audit_log WHERE approval_id=? AND acao='acao_executada'`).get(ap.id);
  const det = JSON.parse(aud.detalhes);
  assert.equal(det.solicitado_por, 'especialista-trafego');
  assert.equal(det.autorizado_por, OWNER);
  assert.equal(aud.ator, 'sistema:anuncios');
});

test('aprovação sem integração conectada não finge execução; rejeição não executa; cargo sem permissão não solicita', async () => {
  const fetchImpl = fakeFetch();
  const app = makeApp({ fetchImpl });
  const { db } = app;
  const id1 = requestApproval(db, { acao: 'enviar_mensagem_externa', descricao: 'E-mail ao cliente', solicitado_por: 'atendimento-cliente' });
  const r1 = await decideApproval(db, id1, { decisao: 'aprovar', decidido_por: OWNER }, app.env, fetchImpl);
  assert.equal(r1.status, 'aprovada_sem_integracao');
  assert.equal(fetchImpl.calls.length, 0);
  const id2 = requestApproval(db, { acao: 'publicar_producao', descricao: 'Deploy', solicitado_por: 'desenvolvedor-web' });
  assert.equal((await decideApproval(db, id2, { decisao: 'rejeitar', decidido_por: OWNER })).status, 'rejeitada');
  assert.throws(() => requestApproval(db, { acao: 'fazer_pagamento', descricao: 'x', solicitado_por: 'copywriter' }), /permissão/);
  assert.ok(requestApproval(db, { acao: 'fazer_pagamento', descricao: 'x', solicitado_por: 'ceo' }));
  // Configuração crítica interna só muda com aprovação
  const id3 = requestApproval(db, { acao: 'alterar_configuracao_critica', descricao: 'Orçamento diário 10', payload: { chave: 'orcamento_diario_usd', valor: 10 }, solicitado_por: 'ceo' });
  assert.equal((await decideApproval(db, id3, { decisao: 'aprovar', decidido_por: OWNER })).status, 'executada');
  assert.equal(JSON.parse(db.prepare(`SELECT value FROM settings WHERE key='orcamento_diario_usd'`).get().value), 10);
});

test('rotinas automáticas no servidor são idempotentes', async () => {
  const app = makeApp();
  const { db, scheduler } = app;
  createTask(db, { titulo: 'Atrasada', tipo: 'copy', responsavel: 'copywriter', prazo: '2020-01-01', criterios_aceitacao: ['x'] }, OWNER);
  // Quinta-feira 29/10/2026 às 08:31 em São Paulo (11:31 UTC)
  const manha = new Date('2026-10-29T11:31:00Z');
  const r1 = await scheduler.tick(manha);
  assert.deepEqual(r1.map((r) => r.id), ['inicio-expediente']);
  assert.equal((await scheduler.tick(manha)).length, 0);
  assert.equal(db.prepare(`SELECT COUNT(*) n FROM daily_reports WHERE tipo='plano' AND data='2026-10-29'`).get().n, 31);
  const plano = JSON.parse(db.prepare(`SELECT conteudo FROM daily_reports WHERE employee_slug='copywriter' AND tipo='plano'`).get().conteudo);
  assert.equal(plano.atrasadas.length, 1);
  assert.ok(db.prepare(`SELECT COUNT(*) n FROM notifications WHERE para='gerente-operacoes' AND tipo='atraso'`).get().n >= 1);
  // Atividade no dia → fim do expediente pede relatório executivo ao CEO, uma única vez
  db.prepare(`INSERT INTO runs (employee_slug, status, custo_usd, started_at) VALUES ('copywriter','concluida',0.01,'2026-10-29T15:00:00Z')`).run();
  const noite = new Date('2026-10-29T21:05:00Z');
  const r2 = await scheduler.tick(noite);
  assert.deepEqual(r2.map((r) => r.id), ['acompanhamento', 'fim-expediente']);
  assert.ok(r2[1].resumo.relatorio_ceo_tarefa);
  await scheduler.tick(noite);
  assert.equal(db.prepare(`SELECT COUNT(*) n FROM tasks WHERE assigned_slug='ceo' AND tipo='relatorio_executivo'`).get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM routine_runs').get().n, 3);
  // Fim de semana: nada roda
  assert.equal((await scheduler.tick(new Date('2026-10-31T12:00:00Z'))).length, 0);
});

test('worker respeita o expediente e um trabalho por funcionário', async () => {
  const env = tmpEnv({ VOA_WORK_OUTSIDE_HOURS: '0' });
  const app = makeApp({ env });
  const { db, worker } = app;
  for (let i = 0; i < 3; i++) createTask(db, { titulo: `c${i}`, tipo: 'copy', responsavel: 'copywriter', criterios_aceitacao: ['x'] }, OWNER);
  createTask(db, { titulo: 'seo', tipo: 'seo', responsavel: 'especialista-seo', criterios_aceitacao: ['x'] }, OWNER);
  assert.equal((await worker.tick(new Date('2026-10-31T13:00:00Z'))).motivo, 'fora do expediente');
  const r = await worker.tick(new Date('2026-10-29T14:00:00Z'));
  assert.equal(r.iniciadas, 2);
  const slugs = r.tarefas.map((id) => getTask(db, id).assigned_slug);
  assert.deepEqual(new Set(slugs).size, 2);
  await worker.drain();
});

test('API administrativa exige token do proprietário', async () => {
  const app = makeApp({ provider: null });
  const server = http.createServer(buildHandler(app));
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${base}/api/overview`)).status, 401);
    assert.equal((await fetch(`${base}/api/overview`, { headers: { authorization: 'Bearer errado-errado-errado' } })).status, 401);
    const h = { authorization: 'Bearer segredo-de-teste', 'content-type': 'application/json' };
    const o = await (await fetch(`${base}/api/overview`, { headers: h })).json();
    assert.equal(o.empresa.funcionarios, 31);
    assert.equal(o.provedor_ia, null);
    const rooms = await (await fetch(`${base}/api/rooms`, { headers: h })).json();
    assert.equal(rooms.reduce((s, r) => s + r.funcionarios.length, 0), 31);
    const org = await (await fetch(`${base}/api/org-chart`, { headers: h })).json();
    assert.equal(org.arvore.length, 1);
    assert.equal(org.arvore[0].slug, 'ceo');
    const prof = await (await fetch(`${base}/api/employees/copywriter`, { headers: h })).json();
    assert.equal(prof.superior.slug, 'diretor-marketing');
    assert.ok(prof.system_prompt.includes('Lucas Prado'));
    const created = await (await fetch(`${base}/api/tasks`, { method: 'POST', headers: h, body: JSON.stringify({ titulo: 'x', tipo: 'copy', responsavel: 'copywriter', criterios_aceitacao: ['a'] }) })).json();
    assert.ok(created.id);
    const bad = await fetch(`${base}/api/tasks`, { method: 'POST', headers: h, body: JSON.stringify({ titulo: 'x', tipo: 'plano_trafego', responsavel: 'copywriter' }) });
    assert.equal(bad.status, 422);
    assert.equal((await fetch(`${base}/`)).status, 200);
    assert.equal((await fetch(`${base}/../package.json`)).status, 404);
  } finally { server.close(); }
});

test('relatório de prontidão aponta credenciais faltantes', () => {
  const app = makeApp({ provider: null });
  const sem = readiness(app.db, {});
  assert.equal(sem.provedor_ia, false);
  assert.ok(sem.funcionarios.every((f) => !f.operacional));
  const com = readiness(app.db, { ANTHROPIC_API_KEY: 'x' });
  assert.ok(com.funcionarios.every((f) => f.operacional));
  assert.ok(com.funcionarios.find((f) => f.slug === 'copywriter').completo);
  assert.deepEqual(com.funcionarios.find((f) => f.slug === 'designer-grafico').ferramentas_sem_integracao, ['gerar_imagem']);
});
