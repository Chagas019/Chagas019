// Motor central de execução dos funcionários de IA.
// Fluxo de uma tarefa: valida o agente → carrega contexto autorizado → escolhe ferramentas → chama o modelo
// → processa ferramentas permitidas → guarda resultados → valida a conclusão → registra consumo e erros
// → encaminha para revisão quando necessário.
import { now, J, P } from './db.js';
import { audit, notify } from './audit.js';
import { TASK_TYPES } from './data/taskTypes.js';
import { getEmployee, getTask, canExecute, depsSatisfied, validateDeliverable, afterValidDelivery, finishTask, OWNER } from './tasks.js';
import { toolsFor, toolDefinitions, executeTool } from './tools/registry.js';
import { costOf, budgetCheck } from './costs.js';

const CLIP = (s, n) => (s && s.length > n ? s.slice(0, n) + '\n…(truncado)' : s || '');

export function refreshEmployeeState(db, slug) {
  const emp = db.prepare('SELECT estado, ativo FROM employees WHERE slug=?').get(slug);
  if (!emp) return;
  const running = db.prepare(`SELECT COUNT(*) AS n FROM runs WHERE employee_slug=? AND status='em_andamento'`).get(slug).n;
  const estado = !emp.ativo ? 'pausado' : running ? 'trabalhando' : 'disponivel';
  if (estado !== emp.estado) db.prepare('UPDATE employees SET estado=?, estado_desde=? WHERE slug=?').run(estado, now(), slug);
}

function claim(db, taskId, owner, minutes) {
  const t = now();
  const until = new Date(Date.now() + minutes * 60000).toISOString();
  const r = db.prepare(`UPDATE tasks SET status='em_execucao', lock_owner=?, locked_until=?, attempts=attempts+1, started_at=COALESCE(started_at, ?), updated_at=?
    WHERE id=? AND status='pendente' AND (locked_until IS NULL OR locked_until < ?)`).run(owner, until, t, t, taskId, t);
  return r.changes === 1;
}

function buildContext(db, task, emp, tools) {
  const tt = TASK_TYPES[task.tipo];
  const parts = [`# Tarefa #${task.id}: ${task.titulo}`, `Tipo: ${task.tipo} — ${tt.nome}`, `Prioridade: ${task.prioridade}/5 · Prazo: ${task.prazo || 'não definido'} · Solicitante: ${task.created_by}`];
  if (task.descricao) parts.push('', '## Descrição', task.descricao);
  if (task.criterios_aceitacao.length) parts.push('', '## Critérios de aceitação', ...task.criterios_aceitacao.map((c) => `- ${c}`));
  if (tt.secoes?.length) parts.push('', '## Critérios de conclusão do tipo (a entrega precisa conter)', ...tt.secoes.map((s) => `- ${s.nome}`));
  if (tt.requerUrl) parts.push('- Fontes com links http(s) verificáveis e datas');
  if (tt.arquivoOuSecao) parts.push(`- Arquivo anexado OU ${tt.arquivoOuSecao.nome}`);
  if (tt.minChars) parts.push(`- Conteúdo com pelo menos ${tt.minChars} caracteres`);
  // Contexto do cliente (somente o cliente da tarefa — isolamento de dados)
  if (task.client_id) {
    const c = db.prepare('SELECT * FROM clients WHERE id=?').get(task.client_id);
    if (c) parts.push('', `## Cliente: ${c.nome}`, `Segmento: ${c.segmento || '—'}`, `Tom de voz: ${c.tom_de_voz || '—'}`, c.contexto || '');
  }
  if (task.project_id) {
    const p = db.prepare('SELECT * FROM projects WHERE id=? AND client_id IS ?').get(task.project_id, task.client_id);
    if (p) parts.push('', `## Projeto: ${p.nome}`, p.escopo || '');
  }
  // Entregas das dependências e (em revisões) da tarefa revisada
  const relacionadas = [...new Set([...task.dependencias, ...(task.review_of ? [task.review_of] : [])])];
  for (const id of relacionadas) {
    const t = db.prepare('SELECT id, titulo, tipo, assigned_slug, client_id FROM tasks WHERE id=?').get(id);
    if (!t || t.client_id !== task.client_id) continue;
    const d = db.prepare('SELECT * FROM deliverables WHERE task_id=? ORDER BY id DESC LIMIT 1').get(id);
    parts.push('', `## Entrega da tarefa #${t.id} (${t.titulo}) por ${t.assigned_slug}`);
    parts.push(d ? `Entrega #${d.id} — ${d.titulo}\nArquivos: ${d.arquivos}\nLimitações declaradas: ${d.limitacoes || 'nenhuma'}\n\n${CLIP(d.conteudo, task.review_of ? 30000 : 8000)}` : '(sem entrega registrada)');
  }
  if (task.feedback) parts.push('', '## Correções pedidas em revisões anteriores (todas precisam ser atendidas)', task.feedback);
  const notas = db.prepare(`SELECT autor, tipo, texto FROM task_notes WHERE task_id=? AND tipo IN ('resposta','pergunta','instrucao') ORDER BY id`).all(task.id);
  if (notas.length) parts.push('', '## Perguntas e respostas', ...notas.map((n) => `- [${n.tipo}] ${n.autor}: ${n.texto}`));
  parts.push('', '## Ferramentas', `Disponíveis: ${[...tools.client, ...tools.server].join(', ') || 'nenhuma'}`);
  if (tools.indisponiveis.length) parts.push(`NÃO conectadas (informe a limitação se precisar delas): ${tools.indisponiveis.join(', ')}`);
  parts.push('', task.tipo === 'revisao_qualidade'
    ? 'Revise e registre a decisão com revisar_entrega. Reprovações exigem motivos e ajustes objetivos.'
    : 'Ao terminar, use a ferramenta entregar com a entrega completa. Se faltar informação essencial, use solicitar_informacao; se estiver fora do seu escopo ou sem ferramenta, use reportar_bloqueio.');
  return parts.join('\n');
}

function chatHistory(db, emp, clientId, limit = 20) {
  const rows = db.prepare(`SELECT autor, conteudo FROM messages WHERE employee_slug=? AND client_id IS ? ORDER BY id DESC LIMIT ?`).all(emp.slug, clientId, limit).reverse();
  const msgs = [];
  for (const r of rows) {
    const role = r.autor === OWNER ? 'user' : 'assistant';
    if (msgs.length && msgs[msgs.length - 1].role === role) msgs[msgs.length - 1].content += `\n\n${r.conteudo}`;
    else msgs.push({ role, content: r.conteudo });
  }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  return msgs;
}

export async function runTask(ctxBase, taskId, { owner = 'manual' } = {}) {
  const { db, config, provider } = ctxBase;
  const env = ctxBase.env || process.env;
  let task = getTask(db, taskId);
  if (!task) throw new Error('tarefa inexistente');
  const emp = getEmployee(db, task.assigned_slug);

  if (!provider) {
    db.prepare('UPDATE tasks SET motivo=? WHERE id=?').run('aguardando provedor de IA (configure ANTHROPIC_API_KEY)', task.id);
    return { status: 'sem_provedor' };
  }
  if (task.status !== 'pendente') return { status: 'ignorada', motivo: `status ${task.status}` };
  if (!depsSatisfied(db, task.id)) return { status: 'aguardando_dependencias' };
  const perm = canExecute(db, emp, task);
  if (!perm.ok) {
    finishTask(db, task.id, 'bloqueada', `atribuição inválida: ${perm.motivo}`, 'sistema');
    notify(db, task.created_by === 'sistema' ? OWNER : task.created_by, 'bloqueio', `Tarefa #${task.id} não pode ser executada por ${emp?.slug}: ${perm.motivo}`, task.id);
    return { status: 'bloqueada', motivo: perm.motivo };
  }
  const budget = budgetCheck(db, config, emp);
  if (!budget.ok) {
    db.prepare('UPDATE tasks SET motivo=? WHERE id=?').run(budget.motivo, task.id);
    audit(db, { ator: 'sistema', acao: 'limite_custo', alvo: `tarefa:${task.id}`, task_id: task.id, client_id: task.client_id, detalhes: { motivo: budget.motivo } });
    return { status: 'sem_orcamento', motivo: budget.motivo };
  }
  if (!claim(db, task.id, owner, config.lockMinutes)) return { status: 'ocupada' };
  task = getTask(db, task.id);

  const isChat = TASK_TYPES[task.tipo].conversa;
  const tools = toolsFor(emp, env);
  if (isChat) tools.client = tools.client.filter((n) => !['entregar', 'revisar_entrega', 'solicitar_informacao', 'reportar_bloqueio'].includes(n));
  if (task.tipo !== 'revisao_qualidade') tools.client = tools.client.filter((n) => n !== 'revisar_entrega');
  const lim = emp.limites_custo;
  const run = db.prepare(`INSERT INTO runs (task_id, employee_slug, client_id, modelo, status, started_at) VALUES (?,?,?,?, 'em_andamento', ?)`)
    .run(task.id, emp.slug, task.client_id ?? null, emp.modelo, now());
  const runId = Number(run.lastInsertRowid);
  refreshEmployeeState(db, emp.slug);
  audit(db, { ator: emp.slug, acao: 'execucao_iniciada', alvo: `tarefa:${task.id}`, task_id: task.id, client_id: task.client_id, detalhes: { run: runId, modelo: emp.modelo, ferramentas: tools } });

  const ctx = { db, config, env, fetchImpl: ctxBase.fetchImpl || fetch, emp, task, runId, state: {} };
  const totals = { input_tokens: 0, output_tokens: 0, web: 0, cost: 0, iter: 0 };
  const system = isChat
    ? `${emp.system_prompt}\n\n# Conversa direta com o proprietário\nVocê está conversando diretamente com o proprietário da agência. Seja objetivo. Para colocar trabalho em andamento use criar_tarefa ou iniciar_fluxo (quando permitido) e diga o número da tarefa criada. Nunca diga que fez algo que não fez.`
    : emp.system_prompt;
  let messages;
  if (isChat) {
    messages = chatHistory(db, emp, task.client_id ?? null);
    const extra = buildContext(db, task, emp, tools).split('## Ferramentas')[1];
    if (task.client_id) {
      const c = db.prepare('SELECT nome, segmento, contexto, tom_de_voz FROM clients WHERE id=?').get(task.client_id);
      messages.unshift({ role: 'user', content: `[Contexto do cliente ${c.nome}: ${c.segmento || ''}. ${c.contexto || ''} Tom: ${c.tom_de_voz || '—'}]` }, { role: 'assistant', content: 'Entendido.' });
    }
    if (!messages.length) messages.push({ role: 'user', content: task.descricao });
    messages[messages.length - 1].content += `\n\n[Ferramentas${extra}]`;
  } else {
    messages = [{ role: 'user', content: buildContext(db, task, emp, tools) }];
  }

  let finalText = ''; let erro = null; let nudges = 0; let abort = null;
  try {
    while (totals.iter < lim.max_iteracoes) {
      if (totals.cost >= lim.por_tarefa_usd) { abort = `limite de custo por tarefa atingido (US$ ${totals.cost.toFixed(4)} de ${lim.por_tarefa_usd})`; break; }
      if (totals.cost >= budget.restante_dia) { abort = 'limite diário de custo atingido durante a execução'; break; }
      totals.iter++;
      const resp = await provider.complete({
        model: emp.modelo, effort: emp.esforco, system, messages, maxTokens: lim.max_tokens,
        tools: toolDefinitions(tools.client), webSearch: tools.server.includes('pesquisa_web'),
      });
      const u = resp.usage || {};
      totals.input_tokens += (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      totals.output_tokens += u.output_tokens || 0;
      totals.web += u.server_tool_use?.web_search_requests || 0;
      totals.cost += costOf(config, emp.modelo, u);
      db.prepare('UPDATE runs SET input_tokens=?, output_tokens=?, web_searches=?, custo_usd=?, iteracoes=? WHERE id=?')
        .run(totals.input_tokens, totals.output_tokens, totals.web, totals.cost, totals.iter, runId);

      if (resp.stop_reason === 'refusal') { abort = `o provedor de IA recusou a solicitação (${resp.stop_details?.category || 'sem categoria'})`; break; }
      messages.push({ role: 'assistant', content: resp.content });
      if (resp.stop_reason === 'pause_turn') continue;
      const uses = resp.content.filter((b) => b.type === 'tool_use');
      const textOut = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      if (textOut) finalText = textOut;
      if (uses.length) {
        const results = [];
        for (const u2 of uses) {
          const r = await executeTool(ctx, u2.name, u2.input);
          results.push({ type: 'tool_result', tool_use_id: u2.id, content: r.content, ...(r.ok ? {} : { is_error: true }) });
        }
        messages.push({ role: 'user', content: results });
        if (ctx.state.final || ctx.state.deliverableId) break;
        continue;
      }
      if (isChat) break;
      if (resp.stop_reason === 'max_tokens' || nudges >= 1) break;
      nudges++;
      messages.push({ role: 'user', content: 'Uma resposta em texto não conclui a tarefa. Use a ferramenta entregar com a entrega completa, ou solicitar_informacao / reportar_bloqueio.' });
    }
    if (!abort && totals.iter >= lim.max_iteracoes && !ctx.state.final && !ctx.state.deliverableId && !isChat) abort = `limite de ${lim.max_iteracoes} iterações atingido sem entrega`;
  } catch (e) {
    erro = e.message || String(e);
  }

  // ─── Finalização ───
  let resultado;
  task = getTask(db, task.id);
  if (erro || abort) {
    const motivo = erro ? `erro na execução: ${erro}` : abort;
    const limiteCusto = abort && /limite/.test(abort);
    if (!limiteCusto && task.attempts < task.max_attempts) {
      const backoff = new Date(Date.now() + 2 ** task.attempts * 60000).toISOString();
      db.prepare(`UPDATE tasks SET status='pendente', motivo=?, locked_until=?, lock_owner=NULL, updated_at=? WHERE id=?`).run(motivo, backoff, now(), task.id);
      resultado = { status: 'pendente', motivo, nova_tentativa_apos: backoff };
    } else {
      finishTask(db, task.id, limiteCusto ? 'bloqueada' : 'falhou', motivo, 'sistema');
      notify(db, emp.superior_slug || OWNER, 'falha', `Tarefa #${task.id} (${emp.nome}): ${motivo}`, task.id);
      resultado = { status: limiteCusto ? 'bloqueada' : 'falhou', motivo };
    }
  } else if (isChat) {
    const resposta = finalText || '(sem resposta)';
    db.prepare('INSERT INTO messages (employee_slug, client_id, autor, conteudo, run_id, created_at) VALUES (?,?,?,?,?,?)').run(emp.slug, task.client_id ?? null, emp.slug, resposta, runId, now());
    finishTask(db, task.id, 'concluida', null, emp.slug);
    resultado = { status: 'concluida', resposta };
  } else if (ctx.state.final?.status === 'revisada') {
    resultado = { status: getTask(db, task.id).status };
  } else if (ctx.state.final) {
    db.prepare(`UPDATE tasks SET status=?, motivo=?, locked_until=NULL, lock_owner=NULL, updated_at=? WHERE id=?`).run(ctx.state.final.status, ctx.state.final.motivo, now(), task.id);
    audit(db, { ator: emp.slug, acao: `tarefa_${ctx.state.final.status}`, alvo: `tarefa:${task.id}`, task_id: task.id, client_id: task.client_id, detalhes: { motivo: ctx.state.final.motivo } });
    resultado = { ...ctx.state.final };
  } else if (ctx.state.deliverableId) {
    const d = db.prepare('SELECT * FROM deliverables WHERE id=?').get(ctx.state.deliverableId);
    d.arquivos = P(d.arquivos, []);
    const v = validateDeliverable(db, task, d, runId);
    db.prepare('UPDATE deliverables SET validacao=? WHERE id=?').run(J(v), d.id);
    audit(db, { ator: 'sistema', acao: v.ok ? 'entrega_validada' : 'entrega_invalida', alvo: `entrega:${d.id}`, task_id: task.id, client_id: task.client_id, detalhes: v });
    if (v.ok) resultado = { ...afterValidDelivery(db, task, emp.slug, d.id), entrega: d.id };
    else if (task.attempts < task.max_attempts) {
      const fb = [task.feedback, `[${now()}] validação automática: ${v.falhas.join('; ')}`].filter(Boolean).join('\n');
      db.prepare(`UPDATE tasks SET status='pendente', feedback=?, motivo=?, locked_until=NULL, lock_owner=NULL, updated_at=? WHERE id=?`).run(fb, 'entrega não cumpriu os critérios de conclusão', now(), task.id);
      resultado = { status: 'pendente', falhas: v.falhas };
    } else {
      finishTask(db, task.id, 'bloqueada', `entrega não cumpriu os critérios após ${task.attempts} tentativas: ${v.falhas.join('; ')}`, 'sistema');
      notify(db, emp.superior_slug || OWNER, 'bloqueio', `Tarefa #${task.id} bloqueada: critérios não atendidos.`, task.id);
      resultado = { status: 'bloqueada', falhas: v.falhas };
    }
  } else {
    const motivo = 'execução terminou sem entrega (texto solto não conclui tarefa)';
    if (task.attempts < task.max_attempts) {
      db.prepare(`UPDATE tasks SET status='pendente', motivo=?, locked_until=NULL, lock_owner=NULL, updated_at=? WHERE id=?`).run(motivo, now(), task.id);
      resultado = { status: 'pendente', motivo };
    } else {
      finishTask(db, task.id, 'falhou', motivo, 'sistema');
      notify(db, emp.superior_slug || OWNER, 'falha', `Tarefa #${task.id}: ${motivo}`, task.id);
      resultado = { status: 'falhou', motivo };
    }
  }

  db.prepare(`UPDATE runs SET status=?, erro=?, resultado=?, finished_at=? WHERE id=?`)
    .run(erro ? 'erro' : abort ? 'interrompida' : 'concluida', erro || abort, J(resultado), now(), runId);
  refreshEmployeeState(db, emp.slug);
  audit(db, { ator: emp.slug, acao: 'execucao_finalizada', alvo: `tarefa:${task.id}`, task_id: task.id, client_id: task.client_id,
    detalhes: { run: runId, resultado, custo_usd: Number(totals.cost.toFixed(6)), tokens: { in: totals.input_tokens, out: totals.output_tokens } } });
  return { ...resultado, run_id: runId, custo_usd: totals.cost };
}

// Conversa direta do proprietário com qualquer funcionário
export async function chat(ctxBase, slug, mensagem, clientId = null) {
  const { db } = ctxBase;
  const emp = getEmployee(db, slug);
  if (!emp) throw new Error('funcionário inexistente');
  if (clientId !== null && !db.prepare('SELECT id FROM clients WHERE id=?').get(clientId)) throw new Error('cliente inexistente');
  db.prepare('INSERT INTO messages (employee_slug, client_id, autor, conteudo, created_at) VALUES (?,?,?,?,?)').run(slug, clientId, OWNER, mensagem, now());
  const t = now();
  const r = db.prepare(`INSERT INTO tasks (titulo, descricao, tipo, client_id, assigned_slug, created_by, prioridade, criterios_aceitacao, auto_execute, created_at, updated_at)
    VALUES (?,?, 'conversa', ?, ?, ?, 5, '[]', 0, ?, ?)`).run(`Conversa: ${mensagem.slice(0, 80)}`, mensagem, clientId, slug, OWNER, t, t);
  const taskId = Number(r.lastInsertRowid);
  audit(db, { ator: OWNER, acao: 'mensagem_ao_funcionario', alvo: slug, task_id: taskId, client_id: clientId });
  const res = await runTask(ctxBase, taskId, { owner: 'chat' });
  if (res.status === 'sem_provedor') {
    db.prepare(`UPDATE tasks SET status='cancelada', motivo=? WHERE id=?`).run('provedor de IA não configurado', taskId);
    return { status: 'sem_provedor', resposta: null, aviso: 'Provedor de IA não configurado: defina ANTHROPIC_API_KEY. A mensagem foi registrada.' };
  }
  return { ...res, tarefa_id: taskId };
}

// Recuperação após reinício: nada pode ficar "trabalhando" sem execução real.
export function recoverOnBoot(db) {
  const t = now();
  const runs = db.prepare(`UPDATE runs SET status='interrompida', erro='servidor reiniciado durante a execução', finished_at=? WHERE status='em_andamento'`).run(t).changes;
  const tasks = db.prepare(`UPDATE tasks SET status='pendente', locked_until=NULL, lock_owner=NULL, motivo='retomada após reinício', updated_at=? WHERE status='em_execucao'`).run(t).changes;
  db.prepare(`UPDATE employees SET estado=CASE WHEN ativo=1 THEN 'disponivel' ELSE 'pausado' END, estado_desde=? WHERE estado <> CASE WHEN ativo=1 THEN 'disponivel' ELSE 'pausado' END`).run(t);
  if (runs || tasks) audit(db, { ator: 'sistema', acao: 'recuperacao_reinicio', detalhes: { execucoes_interrompidas: runs, tarefas_retomadas: tasks } });
  return { runs, tasks };
}
