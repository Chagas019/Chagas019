// Servidor HTTP: API administrativa do proprietário + interface do escritório virtual.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ROOT, loadEnvFile, getConfig } from './config.js';
import { createApp } from './app.js';
import { now, J, P } from './db.js';
import { audit } from './audit.js';
import { getEmployee, getTask, createTask, startWorkflow, finishTask, addNote, OWNER } from './tasks.js';
import { runTask, chat } from './engine.js';
import { decideApproval } from './approvals.js';
import { integrationStatus } from './tools/integrations.js';
import { costSummary, spentToday, companyBudget } from './costs.js';
import { WORKFLOWS } from './data/workflows.js';
import { TASK_TYPES } from './data/taskTypes.js';
import { localNow, isWorkingTime } from './scheduler.js';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const EMP_JSON = ['avatar', 'objetivos', 'responsabilidades', 'competencias', 'ferramentas', 'acoes_aprovacao', 'tipos_tarefa', 'criterios_qualidade', 'regras_delegacao', 'limites_custo', 'rotina', 'kpis'];

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

function employeeSummary(db, e) {
  for (const k of EMP_JSON) if (typeof e[k] === 'string') e[k] = P(e[k], e[k]);
  const cur = db.prepare(`SELECT t.id, t.titulo FROM runs r JOIN tasks t ON t.id=r.task_id WHERE r.employee_slug=? AND r.status='em_andamento' LIMIT 1`).get(e.slug);
  const fila = db.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE assigned_slug=? AND status IN ('pendente','em_execucao','em_revisao','aguardando_info','bloqueada') AND tipo<>'conversa'`).get(e.slug).n;
  return { ...e, system_prompt: undefined, tarefa_atual: cur || null, fila };
}

export function buildHandler(ctx) {
  const { db, config } = ctx;
  const publicDir = path.join(ROOT, 'public');

  const routes = [];
  const on = (method, pattern, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn });

  on('GET', '/api/health', () => ({ ok: true }), true);

  on('GET', '/api/overview', () => {
    const counts = Object.fromEntries(db.prepare(`SELECT status, COUNT(*) n FROM tasks WHERE tipo<>'conversa' GROUP BY status`).all().map((r) => [r.status, r.n]));
    return {
      empresa: { funcionarios: db.prepare('SELECT COUNT(*) n FROM employees').get().n, departamentos: db.prepare('SELECT COUNT(*) n FROM departments').get().n, salas: db.prepare('SELECT COUNT(*) n FROM rooms').get().n },
      proprietario: config.ownerName, provedor_ia: ctx.provider ? ctx.provider.name : null,
      tarefas: counts, aprovacoes_pendentes: db.prepare(`SELECT COUNT(*) n FROM approvals WHERE status='pendente'`).get().n,
      notificacoes_nao_lidas: db.prepare(`SELECT COUNT(*) n FROM notifications WHERE para=? AND lida=0`).get(OWNER).n,
      trabalhando: db.prepare(`SELECT COUNT(*) n FROM employees WHERE estado='trabalhando'`).get().n,
      custo_hoje_usd: spentToday(db), orcamento_diario_usd: companyBudget(db, config),
      expediente: { agora: localNow(config.timezone), aberto: isWorkingTime(config, db), inicio: config.workStart, fim: config.workEnd },
      integracoes: integrationStatus(ctx.env).map(({ id, nome, conectado, faltando }) => ({ id, nome, conectado, faltando })),
    };
  });

  on('GET', '/api/departments', () => db.prepare('SELECT * FROM departments ORDER BY ordem').all().map((d) => ({
    ...d, funcionarios: db.prepare('SELECT slug, nome, cargo, estado, avatar FROM employees WHERE departamento_id=? ORDER BY numero').all(d.id).map((e) => ({ ...e, avatar: P(e.avatar) })),
  })));

  on('GET', '/api/rooms', () => db.prepare('SELECT * FROM rooms ORDER BY ordem').all().map((r) => ({
    ...r, funcionarios: db.prepare('SELECT * FROM employees WHERE sala_id=? ORDER BY numero').all(r.id).map((e) => employeeSummary(db, e)),
  })));

  on('GET', '/api/employees', () => db.prepare('SELECT * FROM employees ORDER BY numero').all().map((e) => employeeSummary(db, e)));

  on('GET', '/api/org-chart', () => {
    const emps = db.prepare('SELECT slug, numero, nome, cargo, departamento_id, superior_slug, estado, avatar FROM employees ORDER BY numero').all().map((e) => ({ ...e, avatar: P(e.avatar) }));
    const build = (sup) => emps.filter((e) => e.superior_slug === sup).map((e) => ({ ...e, subordinados: build(e.slug) }));
    return { proprietario: config.ownerName, arvore: build(null) };
  });

  on('GET', '/api/employees/:slug', ({ p }) => {
    const e = db.prepare('SELECT * FROM employees WHERE slug=?').get(p.slug);
    if (!e) throw new HttpError(404, 'funcionário inexistente');
    const s = employeeSummary(db, e);
    const reviews = db.prepare(`SELECT decisao, COUNT(*) n FROM reviews r JOIN tasks t ON t.id=r.task_id WHERE t.assigned_slug=? GROUP BY decisao`).all(p.slug);
    const valid = db.prepare(`SELECT validacao FROM deliverables WHERE employee_slug=?`).all(p.slug).map((d) => P(d.validacao, {}));
    return {
      ...s, system_prompt: e.system_prompt,
      superior: e.superior_slug ? db.prepare('SELECT slug, nome, cargo FROM employees WHERE slug=?').get(e.superior_slug) : { slug: OWNER, nome: config.ownerName, cargo: 'Proprietário' },
      subordinados: db.prepare('SELECT slug, nome, cargo FROM employees WHERE superior_slug=? ORDER BY numero').all(p.slug),
      departamento: db.prepare('SELECT id, nome FROM departments WHERE id=?').get(e.departamento_id),
      sala: db.prepare('SELECT id, nome FROM rooms WHERE id=?').get(e.sala_id),
      tarefas_atuais: db.prepare(`SELECT id, titulo, tipo, status, prioridade, prazo, client_id FROM tasks WHERE assigned_slug=? AND tipo<>'conversa' AND status NOT IN ('concluida','cancelada','falhou') ORDER BY prioridade DESC, id`).all(p.slug),
      tarefas_concluidas: db.prepare(`SELECT id, titulo, tipo, finished_at, client_id FROM tasks WHERE assigned_slug=? AND tipo<>'conversa' AND status='concluida' ORDER BY finished_at DESC LIMIT 50`).all(p.slug),
      execucoes: db.prepare(`SELECT id, task_id, modelo, status, input_tokens, output_tokens, web_searches, custo_usd, iteracoes, erro, started_at, finished_at FROM runs WHERE employee_slug=? ORDER BY id DESC LIMIT 50`).all(p.slug),
      qualidade: {
        revisoes: Object.fromEntries(reviews.map((r) => [r.decisao, r.n])),
        entregas_validas: valid.filter((v) => v.ok).length, entregas_invalidas: valid.filter((v) => v.ok === false).length,
      },
      consumo: db.prepare(`SELECT COUNT(*) execucoes, COALESCE(SUM(input_tokens),0) input_tokens, COALESCE(SUM(output_tokens),0) output_tokens, ROUND(COALESCE(SUM(custo_usd),0),6) custo_usd FROM runs WHERE employee_slug=?`).get(p.slug),
      custo_hoje_usd: spentToday(db, p.slug),
    };
  });

  on('PATCH', '/api/employees/:slug', ({ p, body }) => {
    const e = getEmployee(db, p.slug);
    if (!e) throw new HttpError(404, 'funcionário inexistente');
    const sets = []; const vals = [];
    if (body.modelo) { if (!config.pricing[body.modelo]) throw new HttpError(400, `modelo sem preço configurado: ${body.modelo}`); sets.push('modelo=?'); vals.push(body.modelo); }
    if (body.esforco) { if (!['low', 'medium', 'high', 'xhigh', 'max'].includes(body.esforco)) throw new HttpError(400, 'esforço inválido'); sets.push('esforco=?'); vals.push(body.esforco); }
    if (body.ativo !== undefined) { sets.push('ativo=?'); vals.push(body.ativo ? 1 : 0); }
    if (body.limites_custo) { sets.push('limites_custo=?'); vals.push(J({ ...e.limites_custo, ...body.limites_custo })); }
    if (!sets.length) throw new HttpError(400, 'nada para alterar');
    db.prepare(`UPDATE employees SET ${sets.join(',')}, updated_at=? WHERE slug=?`).run(...vals, now(), p.slug);
    if (body.ativo !== undefined) db.prepare(`UPDATE employees SET estado=CASE WHEN ?=0 THEN 'pausado' WHEN estado='pausado' THEN 'disponivel' ELSE estado END WHERE slug=?`).run(body.ativo ? 1 : 0, p.slug);
    audit(db, { ator: OWNER, acao: 'funcionario_configurado', alvo: p.slug, detalhes: body });
    return { ok: true };
  });

  // ─── Conversa direta ───
  on('GET', '/api/employees/:slug/chat', ({ p, q }) => db.prepare(`SELECT * FROM messages WHERE employee_slug=? AND client_id IS ? ORDER BY id DESC LIMIT 100`)
    .all(p.slug, q.client_id ? Number(q.client_id) : null).reverse());
  on('POST', '/api/employees/:slug/chat', async ({ p, body }) => {
    if (!body.mensagem?.trim()) throw new HttpError(400, 'mensagem vazia');
    return chat(ctx, p.slug, body.mensagem.trim(), body.client_id ? Number(body.client_id) : null);
  });

  // ─── Tarefas ───
  on('GET', '/api/tasks', ({ q }) => db.prepare(`SELECT id, titulo, tipo, status, prioridade, prazo, assigned_slug, created_by, client_id, parent_id, review_of, workflow_run_id, motivo, attempts, revisoes, created_at, finished_at
    FROM tasks WHERE tipo<>'conversa' AND (? IS NULL OR status=?) AND (? IS NULL OR client_id=?) AND (? IS NULL OR assigned_slug=?) ORDER BY id DESC LIMIT 300`)
    .all(q.status ?? null, q.status ?? null, q.client_id ? Number(q.client_id) : null, q.client_id ? Number(q.client_id) : null, q.responsavel ?? null, q.responsavel ?? null));
  on('GET', '/api/tasks/:id', ({ p }) => {
    const t = getTask(db, Number(p.id));
    if (!t) throw new HttpError(404, 'tarefa inexistente');
    return {
      ...t,
      subtarefas: db.prepare('SELECT id, titulo, status, assigned_slug FROM tasks WHERE parent_id=?').all(t.id),
      entregas: db.prepare('SELECT * FROM deliverables WHERE task_id=? ORDER BY id DESC').all(t.id).map((d) => ({ ...d, arquivos: P(d.arquivos, []), validacao: P(d.validacao) })),
      revisoes: db.prepare('SELECT * FROM reviews WHERE task_id=? ORDER BY id DESC').all(t.id),
      notas: db.prepare('SELECT * FROM task_notes WHERE task_id=? ORDER BY id').all(t.id),
      execucoes: db.prepare('SELECT id, employee_slug, modelo, status, custo_usd, iteracoes, erro, started_at, finished_at FROM runs WHERE task_id=? ORDER BY id DESC').all(t.id),
      ferramentas_usadas: db.prepare('SELECT ferramenta, ok, created_at FROM tool_executions WHERE task_id=? ORDER BY id').all(t.id),
      aprovacoes: db.prepare('SELECT * FROM approvals WHERE task_id=?').all(t.id),
    };
  });
  on('POST', '/api/tasks', ({ body }) => ({ id: createTask(db, { ...body, client_id: body.client_id ? Number(body.client_id) : null }, OWNER) }));
  on('POST', '/api/tasks/:id/executar', async ({ p }) => runTask(ctx, Number(p.id), { owner: 'proprietario' }));
  on('POST', '/api/tasks/:id/responder', ({ p, body }) => {
    const t = getTask(db, Number(p.id));
    if (!t) throw new HttpError(404, 'tarefa inexistente');
    if (!body.texto?.trim()) throw new HttpError(400, 'resposta vazia');
    addNote(db, t.id, OWNER, 'resposta', body.texto.trim());
    if (['aguardando_info', 'bloqueada'].includes(t.status)) db.prepare(`UPDATE tasks SET status='pendente', motivo=NULL, attempts=0, updated_at=? WHERE id=?`).run(now(), t.id);
    audit(db, { ator: OWNER, acao: 'informacao_fornecida', alvo: `tarefa:${t.id}`, task_id: t.id, client_id: t.client_id });
    return { ok: true };
  });
  on('POST', '/api/tasks/:id/cancelar', ({ p }) => { finishTask(db, Number(p.id), 'cancelada', 'cancelada pelo proprietário', OWNER); return { ok: true }; });

  // ─── Fluxos ───
  on('GET', '/api/workflows', () => Object.entries(WORKFLOWS).map(([id, w]) => ({ id, ...w })));
  on('POST', '/api/workflows/:id/iniciar', ({ p, body }) => startWorkflow(db, p.id, { client_id: body.client_id ? Number(body.client_id) : null, briefing: body.briefing || '', prazo: body.prazo || null }, OWNER));
  on('GET', '/api/task-types', () => Object.entries(TASK_TYPES).map(([id, t]) => ({ id, nome: t.nome, revisor: t.revisor, secoes: t.secoes.map((s) => s.nome) })));

  // ─── Aprovações ───
  on('GET', '/api/approvals', ({ q }) => db.prepare('SELECT * FROM approvals WHERE (? IS NULL OR status=?) ORDER BY id DESC LIMIT 200').all(q.status ?? null, q.status ?? null).map((a) => ({ ...a, payload: P(a.payload), resultado: P(a.resultado) })));
  on('POST', '/api/approvals/:id/decidir', async ({ p, body }) => decideApproval(db, Number(p.id), { decisao: body.decisao, decidido_por: OWNER, observacao: body.observacao || '' }, ctx.env, ctx.fetchImpl));

  // ─── Clientes e projetos ───
  on('GET', '/api/clients', () => db.prepare('SELECT * FROM clients ORDER BY nome').all());
  on('POST', '/api/clients', ({ body }) => {
    if (!body.nome?.trim()) throw new HttpError(400, 'nome obrigatório');
    const r = db.prepare('INSERT INTO clients (nome, segmento, contexto, tom_de_voz, created_at) VALUES (?,?,?,?,?)').run(body.nome.trim(), body.segmento || null, body.contexto || null, body.tom_de_voz || null, now());
    audit(db, { ator: OWNER, acao: 'cliente_criado', alvo: body.nome, client_id: Number(r.lastInsertRowid) });
    return { id: Number(r.lastInsertRowid) };
  });
  on('GET', '/api/clients/:id/projects', ({ p }) => db.prepare('SELECT * FROM projects WHERE client_id=?').all(Number(p.id)));
  on('POST', '/api/clients/:id/projects', ({ p, body }) => ({ id: Number(db.prepare('INSERT INTO projects (client_id, nome, escopo, created_at) VALUES (?,?,?,?)').run(Number(p.id), body.nome, body.escopo || null, now()).lastInsertRowid) }));

  // ─── Rotinas, relatórios, auditoria, custos, notificações, integrações ───
  on('GET', '/api/routines', () => db.prepare('SELECT * FROM routines ORDER BY horario').all().map((r) => ({ ...r, execucoes: db.prepare('SELECT data, status, resumo, started_at, finished_at FROM routine_runs WHERE routine_id=? ORDER BY id DESC LIMIT 10').all(r.id) })));
  on('PATCH', '/api/routines/:id', ({ p, body }) => {
    if (body.horario && !/^\d\d:\d\d$/.test(body.horario)) throw new HttpError(400, 'horário no formato HH:MM');
    db.prepare('UPDATE routines SET horario=COALESCE(?,horario), enabled=COALESCE(?,enabled) WHERE id=?').run(body.horario ?? null, body.enabled === undefined ? null : body.enabled ? 1 : 0, p.id);
    audit(db, { ator: OWNER, acao: 'rotina_configurada', alvo: p.id, detalhes: body });
    return { ok: true };
  });
  on('POST', '/api/routines/:id/executar', async ({ p }) => {
    const r = db.prepare('SELECT * FROM routines WHERE id=?').get(p.id);
    if (!r) throw new HttpError(404, 'rotina inexistente');
    return (await ctx.scheduler.runRoutine(r, localNow(config.timezone).data)) || { status: 'ja_executada_hoje' };
  });
  on('GET', '/api/reports/daily', ({ q }) => db.prepare('SELECT * FROM daily_reports WHERE data=? ORDER BY employee_slug, tipo').all(q.data || localNow(config.timezone).data).map((r) => ({ ...r, conteudo: P(r.conteudo) })));
  on('GET', '/api/audit', ({ q }) => db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?').all(Math.min(Number(q.limite) || 200, 1000)).map((a) => ({ ...a, detalhes: P(a.detalhes) })));
  on('GET', '/api/costs', () => ({ ...costSummary(db), orcamento_diario_usd: companyBudget(db, config) }));
  on('GET', '/api/notifications', () => db.prepare('SELECT * FROM notifications WHERE para=? ORDER BY id DESC LIMIT 100').all(OWNER));
  on('POST', '/api/notifications/lidas', () => { db.prepare('UPDATE notifications SET lida=1 WHERE para=?').run(OWNER); return { ok: true }; });
  on('GET', '/api/integrations', () => integrationStatus(ctx.env));
  on('GET', '/api/files/:id', ({ p, res }) => {
    const f = db.prepare('SELECT * FROM files WHERE id=? AND excluido=0').get(Number(p.id));
    if (!f || !fs.existsSync(f.caminho)) throw new HttpError(404, 'arquivo inexistente');
    res.writeHead(200, { 'content-type': f.mime || 'application/octet-stream', 'content-disposition': `attachment; filename="${f.nome}"`, 'x-content-type-options': 'nosniff' });
    fs.createReadStream(f.caminho).pipe(res);
    return undefined;
  });

  const tokenOk = (req, url) => {
    const h = req.headers.authorization || '';
    const tok = h.startsWith('Bearer ') ? h.slice(7) : url.searchParams.get('token') || '';
    const a = Buffer.from(tok); const b = Buffer.from(config.ownerToken);
    return config.ownerToken && a.length === b.length && crypto.timingSafeEqual(a, b);
  };

  return async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const send = (status, data) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(data)); };
    try {
      if (!url.pathname.startsWith('/api/')) {
        const file = path.join(publicDir, url.pathname === '/' ? 'index.html' : path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
        if (!file.startsWith(publicDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(404, { erro: 'não encontrado' });
        res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
        return fs.createReadStream(file).pipe(res);
      }
      if (url.pathname !== '/api/health' && !tokenOk(req, url)) return send(401, { erro: 'token do proprietário inválido' });
      const route = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
      if (!route) return send(404, { erro: 'rota inexistente' });
      let body = {};
      if (['POST', 'PATCH'].includes(req.method)) {
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (raw.length > 2e6) throw new HttpError(413, 'corpo grande demais'); }
        body = raw ? JSON.parse(raw) : {};
      }
      const out = await route.fn({ p: url.pathname.match(route.re).groups || {}, q: Object.fromEntries(url.searchParams), body, req, res });
      if (out !== undefined) send(200, out);
    } catch (e) {
      send(e.status || (e instanceof SyntaxError ? 400 : 422), { erro: e.message });
    }
  };
}

export function ensureOwnerToken(envFile = path.join(ROOT, '.env')) {
  if (process.env.OWNER_TOKEN) return { token: process.env.OWNER_TOKEN, novo: false };
  const token = crypto.randomBytes(24).toString('base64url');
  fs.appendFileSync(envFile, `${fs.existsSync(envFile) && !fs.readFileSync(envFile, 'utf8').endsWith('\n') ? '\n' : ''}OWNER_TOKEN=${token}\n`, { mode: 0o600 });
  process.env.OWNER_TOKEN = token;
  return { token, novo: true };
}

export function startServer(ctx) {
  const server = http.createServer(buildHandler(ctx));
  return new Promise((resolve) => server.listen(ctx.config.port, () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  loadEnvFile();
  const { token, novo } = ensureOwnerToken();
  const ctx = createApp({ env: process.env, config: getConfig(process.env) });
  if (ctx.config.workerEnabled) ctx.worker.start();
  if (ctx.config.schedulerEnabled) ctx.scheduler.start();
  const server = await startServer(ctx);
  const ia = ctx.provider ? 'conectado' : 'NÃO configurado (defina ANTHROPIC_API_KEY no .env)';
  console.log(`Escritório virtual em http://localhost:${ctx.config.port}`);
  console.log(`Funcionários cadastrados: ${ctx.db.prepare('SELECT COUNT(*) n FROM employees').get().n} · Provedor de IA: ${ia}`);
  if (novo) console.log(`Token do proprietário gerado e salvo em .env: ${token}`);
  const shutdown = async () => { ctx.worker.stop(); ctx.scheduler.stop(); server.close(); await ctx.worker.drain(); ctx.db.close(); process.exit(0); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
