// Tarefas, delegação, dependências, fluxos, validação de conclusão e roteamento de revisão.
import { tx, now, J, P } from './db.js';
import { TASK_TYPES, EXTERNAL_CLAIMS, normalize } from './data/taskTypes.js';
import { WORKFLOWS } from './data/workflows.js';
import { audit, notify } from './audit.js';

export const OWNER = 'proprietario';
const MAX_REVISOES = 2;

export function getEmployee(db, slug) {
  const e = db.prepare('SELECT * FROM employees WHERE slug = ?').get(slug);
  if (!e) return null;
  for (const k of ['avatar', 'objetivos', 'responsabilidades', 'competencias', 'ferramentas', 'acoes_aprovacao', 'tipos_tarefa', 'criterios_qualidade', 'regras_delegacao', 'limites_custo', 'rotina', 'kpis']) e[k] = P(e[k], e[k]);
  return e;
}

export function getTask(db, id) {
  const t = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!t) return null;
  t.criterios_aceitacao = P(t.criterios_aceitacao, []);
  t.dependencias = db.prepare('SELECT depends_on FROM task_deps WHERE task_id = ?').all(id).map((r) => r.depends_on);
  return t;
}

// O funcionário pode executar este tipo de tarefa?
// Regra: o tipo está na lista do cargo; ou o funcionário é diretor/executivo do departamento,
// a tarefa é "simples" e o tipo pertence a alguém do seu departamento (assumir tarefa simples para economizar).
export function canExecute(db, emp, task) {
  if (!emp || !emp.ativo) return { ok: false, motivo: 'funcionário inativo ou inexistente' };
  if (emp.tipos_tarefa.includes(task.tipo)) return { ok: true };
  if (task.complexidade === 'simples' && emp.regras_delegacao?.assume_tarefas_simples_do_departamento) {
    const deptTypes = db.prepare('SELECT tipos_tarefa FROM employees WHERE departamento_id = ?').all(emp.departamento_id)
      .flatMap((r) => P(r.tipos_tarefa, []));
    if (deptTypes.includes(task.tipo)) return { ok: true, assumida: true };
  }
  return { ok: false, motivo: `${emp.cargo} não executa tarefas do tipo "${task.tipo}"` };
}

// Quem pode delegar para quem. O proprietário pode tudo; o CEO e demais seguem regras_delegacao.
// Pedidos sempre podem subir ao superior direto (devolução/escalonamento).
export function canDelegate(db, fromSlug, toSlug) {
  if (fromSlug === OWNER || fromSlug === 'sistema') return true;
  const from = getEmployee(db, fromSlug);
  if (!from) return false;
  if (from.superior_slug === toSlug) return true;
  const lista = from.regras_delegacao?.pode_delegar_para || [];
  return lista.includes('*') || lista.includes(toSlug);
}

export function createTask(db, data, ator) {
  const tipo = data.tipo || 'tarefa_geral';
  if (!TASK_TYPES[tipo]) throw new Error(`tipo de tarefa inexistente: ${tipo}`);
  const emp = getEmployee(db, data.responsavel);
  if (!emp) throw new Error(`responsável inexistente: ${data.responsavel}`);
  if (!canDelegate(db, ator, emp.slug)) throw new Error(`${ator} não pode delegar tarefas para ${emp.slug} pelas regras de delegação`);
  const check = canExecute(db, emp, { tipo, complexidade: data.complexidade || 'normal' });
  if (!check.ok) throw new Error(check.motivo);
  let clientId = data.client_id ?? null;
  if (data.parent_id) {
    const parent = db.prepare('SELECT client_id FROM tasks WHERE id = ?').get(data.parent_id);
    if (!parent) throw new Error('tarefa mãe inexistente');
    // Isolamento: subtarefa herda o cliente da tarefa mãe
    if (clientId !== null && parent.client_id !== null && clientId !== parent.client_id) throw new Error('subtarefa não pode mudar de cliente');
    clientId = parent.client_id;
  }
  const deps = (data.depende_de || []).map(Number);
  for (const d of deps) {
    const dep = db.prepare('SELECT client_id FROM tasks WHERE id = ?').get(d);
    if (!dep) throw new Error(`dependência inexistente: ${d}`);
    if (dep.client_id !== clientId) throw new Error('dependência pertence a outro cliente');
  }
  const t = now();
  return tx(db, () => {
    const r = db.prepare(`INSERT INTO tasks (titulo, descricao, tipo, client_id, project_id, assigned_slug, created_by, parent_id, review_of,
      workflow_run_id, complexidade, prioridade, prazo, criterios_aceitacao, auto_execute, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      String(data.titulo).slice(0, 300), data.descricao || '', tipo, clientId, data.project_id ?? null, emp.slug, ator,
      data.parent_id ?? null, data.review_of ?? null, data.workflow_run_id ?? null, data.complexidade || 'normal',
      Math.min(5, Math.max(1, Number(data.prioridade) || 3)), data.prazo || null, J(data.criterios_aceitacao || []),
      data.auto_execute === false ? 0 : 1, t, t);
    const id = Number(r.lastInsertRowid);
    for (const d of deps) db.prepare('INSERT OR IGNORE INTO task_deps (task_id, depends_on) VALUES (?,?)').run(id, d);
    audit(db, { ator, acao: 'tarefa_criada', alvo: `tarefa:${id}`, task_id: id, client_id: clientId,
      detalhes: { titulo: data.titulo, tipo, responsavel: emp.slug, parent_id: data.parent_id ?? null, depende_de: deps, assumida: !!check.assumida } });
    if (ator !== emp.slug) notify(db, emp.slug, 'nova_tarefa', `Nova tarefa #${id}: ${data.titulo}`, id);
    return id;
  });
}

export function startWorkflow(db, workflowId, { client_id = null, briefing = '', prazo = null }, ator) {
  const wf = WORKFLOWS[workflowId];
  if (!wf) throw new Error(`fluxo inexistente: ${workflowId}`);
  return tx(db, () => {
    const run = db.prepare('INSERT INTO workflow_runs (workflow_id, client_id, iniciado_por, briefing, created_at) VALUES (?,?,?,?,?)')
      .run(workflowId, client_id, ator, briefing, now());
    const runId = Number(run.lastInsertRowid);
    const ids = {};
    for (const et of wf.etapas) {
      ids[et.chave] = createTask(db, {
        titulo: `${et.titulo}`, descricao: `Fluxo "${wf.nome}" (execução #${runId}).\n\nBriefing do solicitante:\n${briefing}`,
        tipo: et.tipo, responsavel: et.responsavel, client_id, prazo, criterios_aceitacao: et.criterios,
        depende_de: (et.depende || []).map((k) => ids[k]), workflow_run_id: runId,
      }, 'sistema');
    }
    audit(db, { ator, acao: 'fluxo_iniciado', alvo: `fluxo:${runId}`, client_id, detalhes: { workflowId, tarefas: ids } });
    return { workflow_run_id: runId, tarefas: ids };
  });
}

export function depsSatisfied(db, taskId) {
  const pend = db.prepare(`SELECT COUNT(*) AS n FROM task_deps d JOIN tasks t ON t.id = d.depends_on
    WHERE d.task_id = ? AND t.status <> 'concluida'`).get(taskId);
  return pend.n === 0;
}

// ─── Validação de conclusão ───
export function validateDeliverable(db, task, deliverable, runId) {
  const tt = TASK_TYPES[task.tipo];
  const texto = normalize(`${deliverable.titulo}\n${deliverable.conteudo}`);
  const falhas = [];
  if (tt.conversa) return { ok: true, falhas };
  if ((deliverable.conteudo || '').trim().length < tt.minChars) falhas.push(`conteúdo curto demais (mínimo ${tt.minChars} caracteres)`);
  for (const sec of tt.secoes) if (!new RegExp(sec.padrao).test(texto)) falhas.push(`falta a seção/elemento obrigatório: ${sec.nome}`);
  if (tt.requerUrl && !/https?:\/\/\S+/.test(deliverable.conteudo)) falhas.push('faltam fontes verificáveis com link (http/https)');
  if (tt.arquivoOuSecao && !(deliverable.arquivos || []).length && !new RegExp(tt.arquivoOuSecao.padrao).test(texto))
    falhas.push(`sem arquivo anexado e sem ${tt.arquivoOuSecao.nome}`);
  // Afirmações de ação externa só valem com execução aprovada registrada nesta tarefa
  if (EXTERNAL_CLAIMS.test(texto)) {
    const exec = db.prepare(`SELECT COUNT(*) AS n FROM approvals WHERE task_id = ? AND status = 'executada'`).get(task.id).n;
    if (!exec) falhas.push('a entrega afirma uma ação externa (publicação/envio/pagamento/etc.) que não foi executada com aprovação');
  }
  // Arquivos citados precisam existir e pertencer ao mesmo cliente
  for (const fid of deliverable.arquivos || []) {
    const f = db.prepare('SELECT client_id, excluido FROM files WHERE id = ?').get(fid);
    if (!f || f.excluido) falhas.push(`arquivo #${fid} não existe`);
    else if (f.client_id !== task.client_id) falhas.push(`arquivo #${fid} pertence a outro cliente`);
  }
  return { ok: falhas.length === 0, falhas };
}

// Escolhe um revisor independente do autor
export function pickReviewer(db, task, producerSlug) {
  const tt = TASK_TYPES[task.tipo];
  let r = tt.revisor;
  if (!r) return null;
  if (r === producerSlug) {
    const p = getEmployee(db, producerSlug);
    r = p.superior_slug && p.superior_slug !== producerSlug ? p.superior_slug : 'revisor-qualidade';
    if (r === producerSlug) r = 'ceo';
  }
  return r;
}

// Depois de uma entrega válida: abre a revisão (quando exigida) ou conclui.
export function afterValidDelivery(db, task, producerSlug, deliverableId) {
  const tt = TASK_TYPES[task.tipo];
  const reviewer = task.workflow_run_id ? null : pickReviewer(db, task, producerSlug);
  if (!reviewer || tt.conversa) {
    finishTask(db, task.id, 'concluida', null, producerSlug);
    return { status: 'concluida' };
  }
  const rid = createTask(db, {
    titulo: `Revisão: ${task.titulo}`.slice(0, 300),
    descricao: `Revisar a entrega #${deliverableId} da tarefa #${task.id} (${tt.nome}), produzida por ${producerSlug}. Aprove ou reprove com revisar_entrega, registrando motivos e ajustes.`,
    tipo: 'revisao_qualidade', responsavel: reviewer, client_id: task.client_id, parent_id: task.id, review_of: task.id,
    prioridade: task.prioridade, prazo: task.prazo, criterios_aceitacao: task.criterios_aceitacao,
  }, 'sistema');
  db.prepare(`UPDATE tasks SET status='em_revisao', updated_at=?, locked_until=NULL, lock_owner=NULL WHERE id=?`).run(now(), task.id);
  audit(db, { ator: 'sistema', acao: 'enviada_para_revisao', alvo: `tarefa:${task.id}`, task_id: task.id, client_id: task.client_id, detalhes: { revisor: reviewer, tarefa_revisao: rid } });
  return { status: 'em_revisao', revisao: rid };
}

export function finishTask(db, id, status, motivo, ator) {
  const t = now();
  db.prepare(`UPDATE tasks SET status=?, motivo=?, updated_at=?, finished_at=CASE WHEN ? IN ('concluida','falhou','cancelada') THEN ? ELSE finished_at END,
    locked_until=NULL, lock_owner=NULL WHERE id=?`).run(status, motivo, t, status, t, id);
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  audit(db, { ator, acao: `tarefa_${status}`, alvo: `tarefa:${id}`, task_id: id, client_id: task.client_id, detalhes: motivo ? { motivo } : null });
  if (status === 'concluida' && task.workflow_run_id) maybeCloseWorkflow(db, task.workflow_run_id);
}

function maybeCloseWorkflow(db, runId) {
  const open = db.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE workflow_run_id=? AND status <> 'concluida'`).get(runId).n;
  if (!open) db.prepare(`UPDATE workflow_runs SET status='concluido' WHERE id=?`).run(runId);
}

// Reabre uma tarefa com feedback (reprovação). Após MAX_REVISOES, bloqueia e avisa o superior.
export function reopenWithFeedback(db, taskId, feedback, ator) {
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(taskId);
  const revisoes = task.revisoes + 1;
  const fb = [task.feedback, `[${now()}] ${ator}: ${feedback}`].filter(Boolean).join('\n');
  if (revisoes > MAX_REVISOES) {
    db.prepare(`UPDATE tasks SET status='bloqueada', revisoes=?, feedback=?, motivo=?, updated_at=? WHERE id=?`)
      .run(revisoes, fb, `reprovada ${revisoes} vezes; precisa de decisão do superior`, now(), taskId);
    const emp = getEmployee(db, task.assigned_slug);
    notify(db, emp.superior_slug || OWNER, 'bloqueio', `Tarefa #${taskId} reprovada ${revisoes} vezes e bloqueada.`, taskId);
  } else {
    db.prepare(`UPDATE tasks SET status='pendente', revisoes=?, feedback=?, attempts=0, updated_at=? WHERE id=?`).run(revisoes, fb, now(), taskId);
  }
  audit(db, { ator, acao: 'tarefa_reaberta', alvo: `tarefa:${taskId}`, task_id: taskId, client_id: task.client_id, detalhes: { feedback, revisoes } });
}

// Registra a decisão de uma tarefa de revisão.
export function recordReview(db, reviewTask, reviewerSlug, { decisao, motivos = [], ajustes = [], reabrir = [] }) {
  if (!['aprovar', 'reprovar'].includes(decisao)) throw new Error('decisão deve ser aprovar ou reprovar');
  if (decisao === 'reprovar' && !motivos.length) throw new Error('toda reprovação precisa de motivo registrado');
  // Alvos: a tarefa revisada (review_of) ou, em fluxo, as dependências diretas
  const alvos = reviewTask.review_of ? [reviewTask.review_of] : db.prepare('SELECT depends_on FROM task_deps WHERE task_id=?').all(reviewTask.id).map((r) => r.depends_on);
  for (const a of alvos) {
    const autor = db.prepare('SELECT assigned_slug FROM tasks WHERE id=?').get(a)?.assigned_slug;
    if (autor === reviewerSlug && reviewTask.review_of) throw new Error('o revisor não pode revisar a própria entrega');
  }
  return tx(db, () => {
    for (const a of alvos) {
      const d = db.prepare('SELECT id FROM deliverables WHERE task_id=? ORDER BY id DESC LIMIT 1').get(a);
      db.prepare(`INSERT INTO reviews (task_id, review_task_id, deliverable_id, revisor_slug, decisao, motivos, ajustes, created_at) VALUES (?,?,?,?,?,?,?,?)`)
        .run(a, reviewTask.id, d?.id ?? null, reviewerSlug, decisao, J(motivos), J(ajustes), now());
      if (d) db.prepare('UPDATE deliverables SET aprovado=? WHERE id=?').run(decisao === 'aprovar' ? 1 : 0, d.id);
    }
    const fb = `Reprovado. Motivos: ${motivos.join('; ')}. Ajustes: ${ajustes.join('; ')}`;
    if (reviewTask.review_of) {
      if (decisao === 'aprovar') finishTask(db, reviewTask.review_of, 'concluida', null, reviewerSlug);
      else reopenWithFeedback(db, reviewTask.review_of, fb, reviewerSlug);
      finishTask(db, reviewTask.id, 'concluida', null, reviewerSlug);
    } else if (decisao === 'aprovar') {
      finishTask(db, reviewTask.id, 'concluida', null, reviewerSlug);
    } else {
      // Revisão de fluxo: reabre as tarefas indicadas (ou as dependências diretas) e tudo que vem
      // entre elas e esta revisão; a revisão volta a esperar as correções.
      const wfTasks = db.prepare('SELECT id FROM tasks WHERE workflow_run_id=?').all(reviewTask.workflow_run_id).map((r) => r.id);
      const set = new Set((reabrir.length ? reabrir.map(Number) : alvos).filter((x) => wfTasks.includes(x)));
      const ancestors = new Set();
      const walk = (id) => db.prepare('SELECT depends_on FROM task_deps WHERE task_id=?').all(id).forEach((r) => { if (!ancestors.has(r.depends_on)) { ancestors.add(r.depends_on); walk(r.depends_on); } });
      walk(reviewTask.id);
      let changed = true;
      while (changed) {
        changed = false;
        for (const id of ancestors) {
          if (set.has(id)) continue;
          const deps = db.prepare('SELECT depends_on FROM task_deps WHERE task_id=?').all(id).map((r) => r.depends_on);
          if (deps.some((d) => set.has(d))) { set.add(id); changed = true; }
        }
      }
      for (const id of set) reopenWithFeedback(db, id, fb, reviewerSlug);
      db.prepare(`UPDATE tasks SET status='pendente', updated_at=?, locked_until=NULL, lock_owner=NULL WHERE id=?`).run(now(), reviewTask.id);
    }
    audit(db, { ator: reviewerSlug, acao: `revisao_${decisao}`, alvo: `tarefa:${reviewTask.id}`, task_id: reviewTask.id, client_id: reviewTask.client_id, detalhes: { alvos, motivos, ajustes } });
    return { alvos, decisao };
  });
}

export function addNote(db, taskId, autor, tipo, texto) {
  db.prepare('INSERT INTO task_notes (task_id, autor, tipo, texto, created_at) VALUES (?,?,?,?,?)').run(taskId, autor, tipo, texto, now());
}
