// Interface do proprietário. Todos os dados vêm da API (banco de dados), nada é fixo aqui.
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (d) => (d ? new Date(d).toLocaleString('pt-BR') : '—');
const usd = (v) => `US$ ${Number(v || 0).toFixed(4)}`;
let token = '';
try { token = localStorage.getItem('voa-token') || ''; } catch {}
let view = 'escritorio';
try { view = localStorage.getItem('voa-view') || 'escritorio'; } catch {}
let clients = [];
let chatWith = 'ceo';
let chatClient = '';

async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (res.status === 401) { askLogin(); throw new Error('não autorizado'); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.erro || res.statusText);
  return data;
}

function askLogin(msg = '') {
  const d = $('#login');
  $('#login-erro').textContent = msg;
  if (!d.open) d.showModal();
}
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  token = $('#token').value.trim();
  try { await api('/api/overview'); try { localStorage.setItem('voa-token', token); } catch {} $('#login').close(); render(); } catch (err) { askLogin('Token inválido.'); }
});

const avatar = (e) => {
  const a = typeof e.avatar === 'string' ? JSON.parse(e.avatar) : e.avatar || {};
  return `<span class="avatar" style="background:${esc(a.cor || '#666')}">${esc(a.iniciais || '?')}<i class="dot ${esc(e.estado)}"></i></span>`;
};
const estadoLabel = { disponivel: 'disponível', trabalhando: 'trabalhando', pausado: 'pausado' };
const st = (s) => `<span class="st ${esc(s)}">${esc(String(s).replace(/_/g, ' '))}</span>`;
const clientName = (id) => (id ? clients.find((c) => c.id === id)?.nome || `#${id}` : 'interno');

// ─── Barra de status ───
async function statusBar() {
  const o = await api('/api/overview');
  $('#sub').textContent = `${o.empresa.funcionarios} funcionários · ${o.empresa.departamentos} departamentos · ${o.empresa.salas} salas`;
  const b = $('#badge-aprov'); b.hidden = !o.aprovacoes_pendentes; b.textContent = o.aprovacoes_pendentes;
  const n = $('#badge-notif'); n.hidden = !o.notificacoes_nao_lidas; n.textContent = o.notificacoes_nao_lidas;
  const ext = o.integracoes.filter((i) => i.conectado).length;
  $('#status').innerHTML = [
    o.provedor_ia ? `IA: <b>conectada</b>` : `<span class="alert">IA não configurada — defina ANTHROPIC_API_KEY no .env; os funcionários aguardam</span>`,
    `Trabalhando agora: <b>${o.trabalhando}</b>`,
    `Fila: ${o.tarefas.pendente || 0} pendentes · ${o.tarefas.em_revisao || 0} em revisão · ${o.tarefas.bloqueada || 0} bloqueadas`,
    `Custo hoje: ${usd(o.custo_hoje_usd)} de US$ ${o.orcamento_diario_usd}`,
    `Expediente ${o.expediente.inicio}–${o.expediente.fim}: ${o.expediente.aberto ? 'aberto' : 'fechado'}`,
    `Integrações: ${ext}/${o.integracoes.length}`,
  ].map((x) => `<span>${x}</span>`).join('');
}

// ─── Views ───
const views = {
  async escritorio() {
    const rooms = await api('/api/rooms');
    return `<div class="grid">${rooms.map((r) => `<section class="card room"><h3>${esc(r.nome)}<small>${esc(r.descricao)}</small></h3>
      ${r.funcionarios.map((e) => `<div class="person" data-emp="${esc(e.slug)}">${avatar(e)}<div class="info"><div>${esc(e.nome)}</div><small>${esc(e.cargo)}</small>
        ${e.tarefa_atual ? `<small>▶ #${e.tarefa_atual.id} ${esc(e.tarefa_atual.titulo)}</small>` : ''}</div>
        <span class="estado ${esc(e.estado)}">${esc(estadoLabel[e.estado] || e.estado)}</span>${e.fila ? `<span class="estado" title="tarefas na fila">${e.fila}</span>` : ''}</div>`).join('')}</section>`).join('')}</div>`;
  },
  async organograma() {
    const o = await api('/api/org-chart');
    const tree = (nodes) => `<ul>${nodes.map((n) => `<li><span class="node" data-emp="${esc(n.slug)}">${avatar(n)}<span><b>${esc(n.nome)}</b><br><small class="muted">${esc(n.cargo)}</small></span></span>${n.subordinados.length ? tree(n.subordinados) : ''}</li>`).join('')}</ul>`;
    return `<section class="card org"><ul><li><span class="node"><span class="avatar" style="background:#111">👤</span><span><b>${esc(o.proprietario)}</b><br><small class="muted">Proprietário</small></span></span>${tree(o.arvore)}</li></ul></section>`;
  },
  async equipe() {
    const deps = await api('/api/departments');
    return `<div class="grid">${deps.map((d) => `<section class="card"><h3>${esc(d.nome)}</h3><p class="muted">${esc(d.descricao)}</p>
      ${d.funcionarios.map((e) => `<div class="person" data-emp="${esc(e.slug)}">${avatar(e)}<div class="info"><div>${esc(e.nome)}</div><small>${esc(e.cargo)}</small></div><span class="estado ${esc(e.estado)}">${esc(estadoLabel[e.estado] || e.estado)}</span></div>`).join('')}</section>`).join('')}</div>`;
  },
  async tarefas() {
    const [tasks, emps, wfs, types] = await Promise.all([api('/api/tasks'), api('/api/employees'), api('/api/workflows'), api('/api/task-types')]);
    const empOpts = emps.map((e) => `<option value="${esc(e.slug)}">${esc(e.nome)} — ${esc(e.cargo)}</option>`).join('');
    const cliOpts = `<option value="">(interno)</option>` + clients.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
    return `<div class="stack">
      <section class="card"><h3>Nova tarefa</h3><form id="f-task" class="stack"><div class="form-grid">
        <div><label>Título</label><input name="titulo" required></div>
        <div><label>Responsável</label><select name="responsavel">${empOpts}</select></div>
        <div><label>Tipo</label><select name="tipo">${types.filter((t) => t.id !== 'conversa').map((t) => `<option value="${esc(t.id)}">${esc(t.nome)}</option>`).join('')}</select></div>
        <div><label>Cliente</label><select name="client_id">${cliOpts}</select></div>
        <div><label>Prazo</label><input name="prazo" type="date"></div>
        <div><label>Prioridade (1–5)</label><input name="prioridade" type="number" min="1" max="5" value="3"></div></div>
        <div><label>Descrição</label><textarea name="descricao"></textarea></div>
        <div><label>Critérios de aceitação (um por linha)</label><textarea name="criterios"></textarea></div>
        <div class="row"><button class="primary">Criar tarefa</button><span class="erro" id="task-erro"></span></div></form></section>
      <section class="card"><h3>Iniciar fluxo entre departamentos</h3><form id="f-wf" class="stack"><div class="form-grid">
        <div><label>Fluxo</label><select name="fluxo">${wfs.map((w) => `<option value="${esc(w.id)}">${esc(w.nome)}</option>`).join('')}</select></div>
        <div><label>Cliente</label><select name="client_id">${cliOpts}</select></div>
        <div><label>Prazo</label><input name="prazo" type="date"></div></div>
        <div><label>Briefing</label><textarea name="briefing" required></textarea></div>
        <div class="row"><button class="primary">Iniciar fluxo</button><span class="erro" id="wf-erro"></span></div></form></section>
      <section class="card table-wrap"><h3>Tarefas</h3><table><thead><tr><th>#</th><th>Título</th><th>Responsável</th><th>Cliente</th><th>Status</th><th>Prazo</th></tr></thead><tbody>
      ${tasks.map((t) => `<tr data-task="${t.id}" style="cursor:pointer"><td>${t.id}</td><td>${esc(t.titulo)}<br><small class="muted">${esc(t.tipo)}${t.motivo ? ' · ' + esc(t.motivo) : ''}</small></td><td>${esc(t.assigned_slug)}</td><td>${esc(clientName(t.client_id))}</td><td>${st(t.status)}</td><td>${esc(t.prazo || '—')}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nenhuma tarefa ainda. Converse com o CEO ou crie uma tarefa.</td></tr>'}
      </tbody></table></section></div>`;
  },
  async aprovacoes() {
    const list = await api('/api/approvals');
    return `<section class="card table-wrap"><h3>Aprovações do proprietário</h3><p class="muted">Nenhuma ação externa ou crítica acontece sem sua decisão. O CEO não pode aprovar.</p><table><thead><tr><th>#</th><th>Ação</th><th>Solicitante</th><th>Descrição</th><th>Status</th><th></th></tr></thead><tbody>
      ${list.map((a) => `<tr><td>${a.id}</td><td>${esc(a.acao)}</td><td>${esc(a.solicitado_por)}${a.task_id ? `<br><small class="muted">tarefa #${a.task_id}</small>` : ''}</td><td>${esc(a.descricao)}<details><summary class="muted">dados</summary><pre>${esc(JSON.stringify(a.payload, null, 1))}</pre></details>${a.resultado ? `<pre>${esc(JSON.stringify(a.resultado, null, 1))}</pre>` : ''}</td><td>${st(a.status)}</td>
        <td>${a.status === 'pendente' ? `<div class="row"><button class="primary" data-aprov="${a.id}" data-dec="aprovar">Aprovar</button><button data-aprov="${a.id}" data-dec="rejeitar">Rejeitar</button></div>` : `<small class="muted">${esc(a.decidido_por || '')} ${fmt(a.decidido_em)}</small>`}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nenhuma solicitação.</td></tr>'}
      </tbody></table></section>`;
  },
  async conversas() {
    const emps = await api('/api/employees');
    const msgs = await api(`/api/employees/${chatWith}/chat${chatClient ? `?client_id=${chatClient}` : ''}`);
    return `<section class="card stack"><div class="form-grid">
      <div><label>Conversar com</label><select id="chat-emp">${emps.map((e) => `<option value="${esc(e.slug)}" ${e.slug === chatWith ? 'selected' : ''}>${esc(e.nome)} — ${esc(e.cargo)}</option>`).join('')}</select></div>
      <div><label>Cliente (contexto isolado)</label><select id="chat-cli"><option value="">(interno)</option>${clients.map((c) => `<option value="${c.id}" ${String(c.id) === chatClient ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div></div>
      <div class="chat" id="chat-box">${msgs.map((m) => `<div class="msg ${m.autor === 'proprietario' ? 'me' : 'them'}">${esc(m.conteudo)}</div>`).join('') || '<p class="muted">Dê uma ordem ao CEO ou converse com qualquer funcionário.</p>'}</div>
      <form id="f-chat" class="row"><textarea name="mensagem" placeholder="Mensagem…" style="flex:1;min-height:60px" required></textarea><button class="primary">Enviar</button></form><p class="muted" id="chat-info"></p></section>`;
  },
  async clientes() {
    return `<div class="stack"><section class="card"><h3>Novo cliente</h3><form id="f-cli" class="stack"><div class="form-grid">
      <div><label>Nome</label><input name="nome" required></div><div><label>Segmento</label><input name="segmento"></div><div><label>Tom de voz</label><input name="tom_de_voz"></div></div>
      <div><label>Contexto (oferta, público, diferenciais, restrições)</label><textarea name="contexto"></textarea></div><button class="primary">Cadastrar</button></form></section>
      <section class="card table-wrap"><table><thead><tr><th>#</th><th>Cliente</th><th>Segmento</th><th>Contexto</th></tr></thead><tbody>${clients.map((c) => `<tr><td>${c.id}</td><td>${esc(c.nome)}</td><td>${esc(c.segmento || '')}</td><td>${esc(c.contexto || '')}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Nenhum cliente.</td></tr>'}</tbody></table></section></div>`;
  },
  async rotinas() {
    const [rs, rep] = await Promise.all([api('/api/routines'), api('/api/reports/daily')]);
    return `<div class="stack"><section class="card table-wrap"><h3>Rotinas agendadas no servidor</h3><table><thead><tr><th>Rotina</th><th>Horário</th><th>Ativa</th><th>Últimas execuções</th><th></th></tr></thead><tbody>
      ${rs.map((r) => `<tr><td><b>${esc(r.nome)}</b><br><small class="muted">${esc(r.descricao)}</small></td><td><input type="time" value="${esc(r.horario)}" data-rot-h="${esc(r.id)}"></td><td><input type="checkbox" ${r.enabled ? 'checked' : ''} data-rot-e="${esc(r.id)}" style="width:auto"></td>
      <td>${r.execucoes.map((x) => `${esc(x.data)} ${st(x.status)}`).join('<br>') || '<span class="muted">—</span>'}</td><td><button data-rot-run="${esc(r.id)}">Executar hoje</button></td></tr>`).join('')}</tbody></table></section>
      <section class="card table-wrap"><h3>Planos e relatórios de hoje</h3><table><thead><tr><th>Funcionário</th><th>Tipo</th><th>Conteúdo</th></tr></thead><tbody>${rep.map((r) => `<tr><td>${esc(r.employee_slug)}</td><td>${esc(r.tipo)}</td><td><pre>${esc(JSON.stringify(r.conteudo, null, 1))}</pre></td></tr>`).join('') || '<tr><td colspan="3" class="muted">Ainda não há relatórios hoje.</td></tr>'}</tbody></table></section></div>`;
  },
  async integracoes() {
    const list = await api('/api/integrations');
    return `<section class="card table-wrap"><h3>Integrações</h3><p class="muted">Quando uma integração não está conectada, os funcionários informam a limitação e entregam somente o que realmente produziram.</p><table><thead><tr><th>Integração</th><th>Status</th><th>Uso</th><th>Configuração</th></tr></thead><tbody>
      ${list.map((i) => `<tr><td>${esc(i.nome)}</td><td>${i.conectado ? st('conectada').replace('conectada', 'conectada') : '<span class="st falhou">não conectada</span>'}</td><td>${esc(i.uso)}</td><td><code>${esc(i.env.join(', ') || 'interna')}</code></td></tr>`).join('')}</tbody></table></section>`;
  },
  async custos() {
    const c = await api('/api/costs');
    return `<div class="stack"><div class="kpis"><div class="kpi"><small class="muted">Hoje</small><b>${usd(c.hoje_usd)}</b></div><div class="kpi"><small class="muted">Orçamento diário</small><b>US$ ${c.orcamento_diario_usd}</b></div></div>
      <section class="card table-wrap"><h3>Por funcionário</h3><table><thead><tr><th>Funcionário</th><th>Execuções</th><th>Tokens (entrada/saída)</th><th>Custo</th></tr></thead><tbody>${c.por_funcionario.map((r) => `<tr><td>${esc(r.employee_slug)}</td><td>${r.execucoes}</td><td>${r.input_tokens}/${r.output_tokens}</td><td>${usd(r.custo_usd)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Sem consumo ainda.</td></tr>'}</tbody></table></section>
      <section class="card table-wrap"><h3>Por cliente</h3><table><tbody>${c.por_cliente.map((r) => `<tr><td>${esc(r.nome || 'interno')}</td><td>${usd(r.custo_usd)}</td></tr>`).join('')}</tbody></table></section></div>`;
  },
  async auditoria() {
    const list = await api('/api/audit?limite=300');
    return `<section class="card table-wrap"><h3>Registro de auditoria</h3><table><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Alvo</th><th>Aprovação</th><th>Detalhes</th></tr></thead><tbody>
      ${list.map((a) => `<tr><td><small>${fmt(a.ts)}</small></td><td>${esc(a.ator)}</td><td>${esc(a.acao)}</td><td>${esc(a.alvo || '')}</td><td>${a.approval_id ? '#' + a.approval_id : ''}</td><td><small class="muted">${esc(JSON.stringify(a.detalhes) || '').slice(0, 300)}</small></td></tr>`).join('')}</tbody></table></section>`;
  },
};

// ─── Perfil e detalhes ───
async function openEmployee(slug) {
  const e = await api(`/api/employees/${slug}`);
  openDrawer(`<div class="stack"><div class="row">${avatar(e)}<div><h2>${esc(e.nome)}</h2><div class="muted">${esc(e.cargo)} · ${esc(e.departamento?.nome)} · ${esc(e.sala?.nome)}</div></div><span class="estado ${esc(e.estado)}">${esc(estadoLabel[e.estado] || e.estado)}</span></div>
    <div class="card"><b>Superior direto:</b> ${esc(e.superior?.nome)} (${esc(e.superior?.cargo)})${e.subordinados.length ? `<br><b>Equipe:</b> ${e.subordinados.map((s) => esc(s.nome)).join(', ')}` : ''}<br><b>Missão:</b> ${esc(e.missao)}</div>
    <div class="kpis"><div class="kpi"><small class="muted">Em andamento</small><b>${e.tarefas_atuais.length}</b></div><div class="kpi"><small class="muted">Concluídas</small><b>${e.tarefas_concluidas.length}</b></div>
      <div class="kpi"><small class="muted">Aprovadas/reprovadas</small><b>${e.qualidade.revisoes.aprovar || 0}/${e.qualidade.revisoes.reprovar || 0}</b></div><div class="kpi"><small class="muted">Consumo de IA</small><b>${usd(e.consumo.custo_usd)}</b><small class="muted">${e.consumo.execucoes} execuções</small></div></div>
    <div class="card"><h3>Competências</h3><div class="chips">${e.competencias.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
      <h3 style="margin-top:12px">Ferramentas permitidas</h3><div class="chips">${e.ferramentas.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
      <h3 style="margin-top:12px">Ações que pode solicitar (com sua aprovação)</h3><div class="chips">${e.acoes_aprovacao.map((c) => `<span>${esc(c)}</span>`).join('') || '<span>nenhuma</span>'}</div>
      <h3 style="margin-top:12px">Tipos de tarefa</h3><div class="chips">${e.tipos_tarefa.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
      <h3 style="margin-top:12px">Indicadores</h3><div class="chips">${e.kpis.map((c) => `<span>${esc(c)}</span>`).join('')}</div></div>
    <div class="card"><h3>Configuração</h3><div class="form-grid"><div><label>Modelo de IA</label><select id="p-modelo">${['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'].map((m) => `<option ${m === e.modelo ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
      <div><label>Esforço</label><select id="p-esforco">${['low', 'medium', 'high', 'xhigh', 'max'].map((m) => `<option ${m === e.esforco ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
      <div><label>Limite por tarefa (US$)</label><input id="p-lt" type="number" step="0.05" value="${e.limites_custo.por_tarefa_usd}"></div><div><label>Limite diário (US$)</label><input id="p-ld" type="number" step="0.1" value="${e.limites_custo.diario_usd}"></div></div>
      <div class="row" style="margin-top:10px"><button class="primary" id="p-save" data-slug="${esc(e.slug)}">Salvar</button><button id="p-toggle" data-slug="${esc(e.slug)}" data-ativo="${e.ativo}">${e.ativo ? 'Pausar' : 'Reativar'}</button><button id="p-chat" data-slug="${esc(e.slug)}">Conversar</button></div></div>
    <div class="card table-wrap"><h3>Tarefas atuais</h3><table><tbody>${e.tarefas_atuais.map((t) => `<tr data-task="${t.id}" style="cursor:pointer"><td>#${t.id}</td><td>${esc(t.titulo)}</td><td>${st(t.status)}</td></tr>`).join('') || '<tr><td class="muted">Nenhuma.</td></tr>'}</tbody></table></div>
    <div class="card table-wrap"><h3>Histórico de execuções</h3><table><thead><tr><th>Tarefa</th><th>Status</th><th>Tokens</th><th>Custo</th><th>Início</th></tr></thead><tbody>${e.execucoes.map((r) => `<tr><td>#${r.task_id}</td><td>${st(r.status)}${r.erro ? `<br><small class="erro">${esc(r.erro)}</small>` : ''}</td><td>${r.input_tokens}/${r.output_tokens}</td><td>${usd(r.custo_usd)}</td><td><small>${fmt(r.started_at)}</small></td></tr>`).join('') || '<tr><td class="muted">Nenhuma execução.</td></tr>'}</tbody></table></div>
    <details class="card"><summary>Instruções de sistema</summary><pre>${esc(e.system_prompt)}</pre></details></div>`);
}

async function openTask(id) {
  const t = await api(`/api/tasks/${id}`);
  openDrawer(`<div class="stack"><h2>#${t.id} ${esc(t.titulo)}</h2><div class="row">${st(t.status)}<span class="muted">${esc(t.tipo)} · responsável ${esc(t.assigned_slug)} · cliente ${esc(clientName(t.client_id))} · prazo ${esc(t.prazo || '—')} · tentativas ${t.attempts}/${t.max_attempts}</span></div>
    ${t.motivo ? `<p class="erro">${esc(t.motivo)}</p>` : ''}
    <div class="row">${t.status === 'pendente' ? `<button class="primary" data-run="${t.id}">Executar agora</button>` : ''}${!['concluida', 'cancelada'].includes(t.status) ? `<button data-cancel="${t.id}">Cancelar</button>` : ''}</div>
    ${['aguardando_info', 'bloqueada'].includes(t.status) ? `<form class="card stack" id="f-resp" data-id="${t.id}"><label>Responder / desbloquear</label><textarea name="texto" required></textarea><button class="primary">Enviar resposta e devolver à fila</button></form>` : ''}
    <div class="card"><b>Descrição</b><pre>${esc(t.descricao)}</pre>${t.criterios_aceitacao.length ? `<b>Critérios de aceitação</b><ul>${t.criterios_aceitacao.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
      ${t.dependencias.length ? `<b>Depende de:</b> ${t.dependencias.map((d) => `<a href="#" data-task="${d}">#${d}</a>`).join(', ')}` : ''}${t.subtarefas.length ? `<br><b>Subtarefas:</b> ${t.subtarefas.map((s) => `<a href="#" data-task="${s.id}">#${s.id}</a> (${esc(s.status)})`).join(', ')}` : ''}
      ${t.feedback ? `<b>Feedback de revisão</b><pre>${esc(t.feedback)}</pre>` : ''}</div>
    ${t.entregas.map((d) => `<div class="card"><h3>Entrega #${d.id}: ${esc(d.titulo)}</h3><div class="row">${d.validacao ? (d.validacao.ok ? st('concluida').replace('concluida', 'critérios atendidos') : `<span class="st falhou">critérios não atendidos</span>`) : ''}${d.aprovado === 1 ? st('aprovada') : d.aprovado === 0 ? st('rejeitada') : ''}</div>
      ${d.validacao?.falhas?.length ? `<ul class="erro">${d.validacao.falhas.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}${d.limitacoes ? `<p><b>Limitações:</b> ${esc(d.limitacoes)}</p>` : ''}
      ${d.arquivos.length ? `<p>Arquivos: ${d.arquivos.map((f) => `<a href="/api/files/${f}?token=${encodeURIComponent(token)}">#${f}</a>`).join(', ')}</p>` : ''}<pre>${esc(d.conteudo)}</pre></div>`).join('')}
    ${t.revisoes.length ? `<div class="card"><h3>Revisões</h3>${t.revisoes.map((r) => `<p>${st(r.decisao)} por ${esc(r.revisor_slug)} — ${esc(r.motivos)} ${esc(r.ajustes)}</p>`).join('')}</div>` : ''}
    ${t.notas.length ? `<div class="card"><h3>Notas</h3>${t.notas.map((n) => `<p><b>${esc(n.autor)}</b> [${esc(n.tipo)}]: ${esc(n.texto)}</p>`).join('')}</div>` : ''}
    <div class="card table-wrap"><h3>Execuções</h3><table><tbody>${t.execucoes.map((r) => `<tr><td>${esc(r.employee_slug)}</td><td>${st(r.status)}</td><td>${usd(r.custo_usd)}</td><td>${r.iteracoes} iter.</td><td><small>${esc(r.erro || '')}</small></td></tr>`).join('') || '<tr><td class="muted">Nenhuma.</td></tr>'}</tbody></table>
      ${t.ferramentas_usadas.length ? `<p class="muted">Ferramentas: ${t.ferramentas_usadas.map((f) => `${esc(f.ferramenta)}${f.ok ? '' : ' ✘'}`).join(', ')}</p>` : ''}</div></div>`);
}

function openDrawer(html) { $('#drawer-body').innerHTML = html; $('#drawer').hidden = false; }
$('#drawer-close').onclick = () => { $('#drawer').hidden = true; };
$('#drawer').addEventListener('click', (e) => { if (e.target.id === 'drawer') $('#drawer').hidden = true; });

$('#notif').onclick = async () => {
  const list = await api('/api/notifications');
  await api('/api/notifications/lidas', { method: 'POST' });
  openDrawer(`<h2>Notificações</h2>${list.map((n) => `<div class="card" style="margin-bottom:8px"><small class="muted">${fmt(n.created_at)} · ${esc(n.tipo)}</small><div>${esc(n.mensagem)}</div>${n.task_id ? `<a href="#" data-task="${n.task_id}">ver tarefa #${n.task_id}</a>` : ''}</div>`).join('') || '<p class="muted">Nada por aqui.</p>'}`);
  statusBar();
};

// ─── Eventos ───
document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-emp],[data-task],[data-aprov],[data-run],[data-cancel],[data-rot-run],#p-save,#p-toggle,#p-chat');
  if (!el) return;
  ev.preventDefault();
  try {
    if (el.dataset.emp) return openEmployee(el.dataset.emp);
    if (el.dataset.task) return openTask(el.dataset.task);
    if (el.dataset.aprov) {
      if (!confirm(`${el.dataset.dec === 'aprovar' ? 'Aprovar e executar' : 'Rejeitar'} a solicitação #${el.dataset.aprov}?`)) return;
      el.disabled = true;
      const r = await api(`/api/approvals/${el.dataset.aprov}/decidir`, { method: 'POST', body: { decisao: el.dataset.dec } });
      alert(`Resultado: ${r.status}${r.resultado?.erro ? ' — ' + r.resultado.erro : ''}`);
      return render();
    }
    if (el.dataset.run) { el.disabled = true; el.textContent = 'Executando…'; const r = await api(`/api/tasks/${el.dataset.run}/executar`, { method: 'POST' }); alert(`Resultado: ${r.status}${r.motivo ? ' — ' + r.motivo : ''}`); return openTask(el.dataset.run); }
    if (el.dataset.cancel) { if (confirm('Cancelar a tarefa?')) { await api(`/api/tasks/${el.dataset.cancel}/cancelar`, { method: 'POST' }); openTask(el.dataset.cancel); } return; }
    if (el.dataset.rotRun) { const r = await api(`/api/routines/${el.dataset.rotRun}/executar`, { method: 'POST' }); alert(JSON.stringify(r.resumo || r.status)); return render(); }
    if (el.id === 'p-save') { await api(`/api/employees/${el.dataset.slug}`, { method: 'PATCH', body: { modelo: $('#p-modelo').value, esforco: $('#p-esforco').value, limites_custo: { por_tarefa_usd: Number($('#p-lt').value), diario_usd: Number($('#p-ld').value) } } }); return openEmployee(el.dataset.slug); }
    if (el.id === 'p-toggle') { await api(`/api/employees/${el.dataset.slug}`, { method: 'PATCH', body: { ativo: el.dataset.ativo !== '1' } }); return openEmployee(el.dataset.slug); }
    if (el.id === 'p-chat') { chatWith = el.dataset.slug; $('#drawer').hidden = true; return go('conversas'); }
  } catch (err) { alert(err.message); }
});

document.addEventListener('change', async (ev) => {
  const t = ev.target;
  if (t.id === 'chat-emp') { chatWith = t.value; render(); }
  if (t.id === 'chat-cli') { chatClient = t.value; render(); }
  if (t.dataset.rotH) await api(`/api/routines/${t.dataset.rotH}`, { method: 'PATCH', body: { horario: t.value } });
  if (t.dataset.rotE) await api(`/api/routines/${t.dataset.rotE}`, { method: 'PATCH', body: { enabled: t.checked } });
});

document.addEventListener('submit', async (ev) => {
  const f = ev.target;
  if (f.id === 'login-form') return;
  ev.preventDefault();
  const d = Object.fromEntries(new FormData(f));
  const btn = f.querySelector('button'); btn.disabled = true;
  try {
    if (f.id === 'f-task') {
      const r = await api('/api/tasks', { method: 'POST', body: { ...d, client_id: d.client_id || null, criterios_aceitacao: d.criterios.split('\n').map((s) => s.trim()).filter(Boolean) } });
      openTask(r.id); render();
    } else if (f.id === 'f-wf') {
      const r = await api(`/api/workflows/${d.fluxo}/iniciar`, { method: 'POST', body: d });
      alert(`Fluxo iniciado: ${Object.keys(r.tarefas).length} tarefas criadas.`); render();
    } else if (f.id === 'f-cli') {
      await api('/api/clients', { method: 'POST', body: d }); clients = await api('/api/clients'); render();
    } else if (f.id === 'f-resp') {
      await api(`/api/tasks/${f.dataset.id}/responder`, { method: 'POST', body: d }); openTask(f.dataset.id);
    } else if (f.id === 'f-chat') {
      $('#chat-info').textContent = 'Aguardando resposta…';
      const box = $('#chat-box'); box.insertAdjacentHTML('beforeend', `<div class="msg me">${esc(d.mensagem)}</div>`); f.reset();
      const r = await api(`/api/employees/${chatWith}/chat`, { method: 'POST', body: { mensagem: d.mensagem, client_id: chatClient || null } });
      if (r.aviso) $('#chat-info').textContent = r.aviso;
      else if (r.status !== 'concluida') $('#chat-info').textContent = `Execução: ${r.status}${r.motivo ? ' — ' + r.motivo : ''}`;
      return render();
    }
  } catch (err) { const e = f.querySelector('.erro'); if (e) e.textContent = err.message; else alert(err.message); }
  finally { btn.disabled = false; }
});

function go(v) {
  view = v;
  try { localStorage.setItem('voa-view', v); } catch {}
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
  render();
}
document.querySelectorAll('#nav button').forEach((b) => (b.onclick = () => go(b.dataset.view)));

let rendering = false;
async function render() {
  if (!token) return askLogin();
  if (rendering) return;
  rendering = true;
  try {
    clients = await api('/api/clients');
    const html = await views[view]();
    // Não sobrescreve formulários enquanto o proprietário digita
    const focused = document.activeElement && $('#main').contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (!focused) $('#main').innerHTML = html;
    await statusBar();
    const box = $('#chat-box'); if (box) box.scrollTop = box.scrollHeight;
  } catch (e) { if (e.message !== 'não autorizado') $('#main').innerHTML = `<p class="erro">${esc(e.message)}</p>`; }
  finally { rendering = false; }
}
go(view);
// Estados sincronizados com o motor de execução
setInterval(() => { if (['escritorio', 'organograma', 'equipe', 'tarefas', 'aprovacoes'].includes(view) && $('#drawer').hidden) render(); }, 5000);
