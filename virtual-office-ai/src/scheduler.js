// Fila persistente (worker) e rotinas agendadas no servidor.
// Idempotência: cada rotina roda no máximo uma vez por dia (UNIQUE routine_id+data);
// cada tarefa é reservada com lock no banco antes de executar.
import { now, J, P } from './db.js';
import { audit, notify } from './audit.js';
import { runTask } from './engine.js';
import { depsSatisfied, getEmployee, createTask } from './tasks.js';
import { budgetCheck, spentToday } from './costs.js';
import { getSetting } from './approvals.js';

export function localNow(tz, date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' })
    .formatToParts(date).map((p) => [p.type, p.value]));
  const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.weekday];
  return { data: `${parts.year}-${parts.month}-${parts.day}`, hora: `${parts.hour}:${parts.minute}`, diaSemana: wd };
}

export function isWorkingTime(config, db, date = new Date()) {
  if (config.workOutsideHours || getSetting(db, 'trabalhar_fora_do_expediente', false)) return true;
  const l = localNow(config.timezone, date);
  return config.workDays.includes(l.diaSemana) && l.hora >= config.workStart && l.hora < config.workEnd;
}

// ─── Worker da fila ───
export function createWorker(ctx) {
  const { db, config } = ctx;
  const active = new Map();
  async function tick(date = new Date()) {
    if (!ctx.provider) return { iniciadas: 0, motivo: 'sem provedor de IA' };
    if (!isWorkingTime(config, db, date)) return { iniciadas: 0, motivo: 'fora do expediente' };
    const slots = config.maxConcurrentRuns - active.size;
    if (slots <= 0) return { iniciadas: 0, motivo: 'capacidade máxima' };
    const t = now();
    const cands = db.prepare(`SELECT id, assigned_slug FROM tasks WHERE status='pendente' AND auto_execute=1 AND (locked_until IS NULL OR locked_until < ?)
      ORDER BY prioridade DESC, prazo IS NULL, prazo, id LIMIT 100`).all(t);
    const busy = new Set(db.prepare(`SELECT employee_slug FROM runs WHERE status='em_andamento'`).all().map((r) => r.employee_slug));
    const started = [];
    for (const c of cands) {
      if (started.length >= slots) break;
      if (busy.has(c.assigned_slug) || active.has(c.id)) continue; // um trabalho por funcionário de cada vez
      if (!depsSatisfied(db, c.id)) continue;
      const emp = getEmployee(db, c.assigned_slug);
      if (!emp.ativo || !budgetCheck(db, config, emp).ok) continue;
      busy.add(c.assigned_slug);
      const p = runTask(ctx, c.id, { owner: 'worker' })
        .catch((e) => audit(db, { ator: 'sistema', acao: 'erro_worker', task_id: c.id, detalhes: { erro: e.message } }))
        .finally(() => active.delete(c.id));
      active.set(c.id, p);
      started.push(c.id);
    }
    return { iniciadas: started.length, tarefas: started };
  }
  let timer = null;
  return {
    tick, active,
    start() { if (!timer) timer = setInterval(() => tick().catch(() => {}), config.workerIntervalMs); },
    stop() { clearInterval(timer); timer = null; },
    async drain() { while (active.size) await Promise.allSettled([...active.values()]); },
  };
}

// ─── Rotinas ───
const OPEN = `('pendente','em_execucao','em_revisao','aguardando_info','aguardando_aprovacao','bloqueada')`;

export function routineInicio(db, data) {
  const emps = db.prepare('SELECT slug, nome FROM employees WHERE ativo=1 ORDER BY numero').all();
  let atrasadasTotal = 0;
  for (const e of emps) {
    const fila = db.prepare(`SELECT id, titulo, status, prioridade, prazo FROM tasks WHERE assigned_slug=? AND tipo<>'conversa' AND status IN ${OPEN}
      ORDER BY prioridade DESC, prazo IS NULL, prazo, id`).all(e.slug);
    const atrasadas = fila.filter((t) => t.prazo && t.prazo.slice(0, 10) < data);
    atrasadasTotal += atrasadas.length;
    const plano = {
      prioridades: fila.filter((t) => t.status === 'pendente').slice(0, 5).map((t) => ({ id: t.id, titulo: t.titulo, prioridade: t.prioridade, prazo: t.prazo })),
      atrasadas: atrasadas.map((t) => t.id), bloqueadas: fila.filter((t) => ['bloqueada', 'aguardando_info'].includes(t.status)).map((t) => t.id),
      total_na_fila: fila.length,
    };
    db.prepare(`INSERT OR IGNORE INTO daily_reports (employee_slug, data, tipo, conteudo, created_at) VALUES (?,?,'plano',?,?)`).run(e.slug, data, J(plano), now());
  }
  if (atrasadasTotal) notify(db, 'gerente-operacoes', 'atraso', `${atrasadasTotal} tarefa(s) atrasada(s) no início do expediente de ${data}.`);
  return { funcionarios: emps.length, atrasadas: atrasadasTotal };
}

export function routineAcompanhamento(db, data) {
  const problemas = db.prepare(`SELECT t.id, t.titulo, t.status, t.prazo, t.assigned_slug, e.superior_slug FROM tasks t JOIN employees e ON e.slug=t.assigned_slug
    WHERE t.tipo<>'conversa' AND (t.status IN ('bloqueada','aguardando_info','falhou') OR (t.prazo IS NOT NULL AND substr(t.prazo,1,10) < ? AND t.status IN ${OPEN}))`).all(data);
  for (const p of problemas) {
    notify(db, p.superior_slug || 'proprietario', 'acompanhamento', `Tarefa #${p.id} (${p.titulo}) de ${p.assigned_slug}: ${p.status}${p.prazo ? `, prazo ${p.prazo}` : ''}.`, p.id);
  }
  if (problemas.length) notify(db, 'gerente-operacoes', 'acompanhamento', `${problemas.length} tarefa(s) com bloqueio, pendência de informação ou atraso.`);
  return { problemas: problemas.length };
}

export function routineFim(ctx, data, usaIa) {
  const { db } = ctx;
  const emps = db.prepare('SELECT slug FROM employees WHERE ativo=1').all();
  let concluidasTotal = 0;
  for (const e of emps) {
    const concluidas = db.prepare(`SELECT id, titulo FROM tasks WHERE assigned_slug=? AND tipo<>'conversa' AND status='concluida' AND substr(finished_at,1,10)=?`).all(e.slug, data);
    const incompletas = db.prepare(`SELECT id, titulo, status FROM tasks WHERE assigned_slug=? AND tipo<>'conversa' AND status IN ${OPEN}`).all(e.slug);
    const custo = db.prepare(`SELECT COALESCE(SUM(custo_usd),0) AS v, COUNT(*) AS n FROM runs WHERE employee_slug=? AND substr(started_at,1,10)=?`).get(e.slug, data);
    concluidasTotal += concluidas.length;
    db.prepare(`INSERT OR IGNORE INTO daily_reports (employee_slug, data, tipo, conteudo, created_at) VALUES (?,?,'relatorio',?,?)`).run(e.slug, data, J({
      concluidas, incompletas, execucoes: custo.n, custo_usd: Number(custo.v.toFixed(6)),
      proximas_prioridades: incompletas.filter((t) => t.status === 'pendente').slice(0, 5).map((t) => t.id),
    }), now());
  }
  const execucoes = db.prepare(`SELECT COUNT(*) AS n FROM runs WHERE substr(started_at,1,10)=?`).get(data).n;
  let relatorioCeo = null;
  if (usaIa && ctx.provider && (execucoes > 0 || concluidasTotal > 0)) {
    const resumo = db.prepare(`SELECT employee_slug, conteudo FROM daily_reports WHERE data=? AND tipo='relatorio'`).all(data)
      .map((r) => ({ f: r.employee_slug, ...P(r.conteudo, {}) })).filter((r) => r.concluidas.length || r.incompletas.length);
    relatorioCeo = createTask(db, {
      titulo: `Relatório executivo do dia ${data}`, tipo: 'relatorio_executivo', responsavel: 'ceo', prioridade: 4,
      descricao: `Consolide o dia para o proprietário usando apenas os dados abaixo (gerados pelo sistema).\nCusto de IA do dia: US$ ${spentToday(db).toFixed(4)}\n\n${JSON.stringify(resumo, null, 1).slice(0, 20000)}`,
      criterios_aceitacao: ['Somente dados registrados', 'Pendências e próximos passos claros'],
    }, 'sistema');
  }
  return { concluidas: concluidasTotal, execucoes, relatorio_ceo_tarefa: relatorioCeo };
}

export function createScheduler(ctx) {
  const { db, config } = ctx;
  async function runRoutine(r, data) {
    // Reserva idempotente: só uma instância do servidor/tick executa a rotina no dia
    const ins = db.prepare(`INSERT OR IGNORE INTO routine_runs (routine_id, data, status, started_at) VALUES (?,?, 'em_andamento', ?)`).run(r.id, data, now());
    if (!ins.changes) return null;
    let resumo; let status = 'concluida';
    try {
      if (r.fase === 'inicio') resumo = routineInicio(db, data);
      else if (r.fase === 'durante') resumo = routineAcompanhamento(db, data);
      else resumo = routineFim(ctx, data, !!r.usa_ia);
    } catch (e) { status = 'falhou'; resumo = { erro: e.message }; }
    db.prepare(`UPDATE routine_runs SET status=?, resumo=?, finished_at=? WHERE routine_id=? AND data=?`).run(status, J(resumo), now(), r.id, data);
    audit(db, { ator: 'sistema', acao: `rotina_${status}`, alvo: `rotina:${r.id}`, detalhes: { data, resumo } });
    return { id: r.id, status, resumo };
  }
  async function tick(date = new Date()) {
    const l = localNow(config.timezone, date);
    if (!config.workDays.includes(l.diaSemana)) return [];
    const out = [];
    for (const r of db.prepare('SELECT * FROM routines WHERE enabled=1 ORDER BY horario').all()) {
      if (l.hora < r.horario) continue;
      const res = await runRoutine(r, l.data);
      if (res) out.push(res);
    }
    return out;
  }
  let timer = null;
  return {
    tick, runRoutine,
    start() { if (!timer) { tick().catch(() => {}); timer = setInterval(() => tick().catch(() => {}), config.schedulerIntervalMs); } },
    stop() { clearInterval(timer); timer = null; },
  };
}
