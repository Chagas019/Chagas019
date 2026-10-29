// Ferramentas dos funcionários. Cada ferramenta declara a integração que usa; o motor só oferece ao
// modelo as ferramentas que o cargo tem permissão de usar e, na execução, confere a permissão de novo.
import fs from 'node:fs';
import path from 'node:path';
import { now, J } from '../db.js';
import { audit, notify } from '../audit.js';
import { createTask, startWorkflow, recordReview, addNote, getEmployee, OWNER } from '../tasks.js';
import { requestApproval, APPROVAL_ACTIONS } from '../approvals.js';
import { WORKFLOWS } from '../data/workflows.js';
import { TASK_TYPES } from '../data/taskTypes.js';
import { costSummary } from '../costs.js';
import { callWebhook, isConnected } from './integrations.js';

const str = (description) => ({ type: 'string', description });
const arr = (description) => ({ type: 'array', items: { type: 'string' }, description });

// Isolamento de dados: com cliente definido, só aquele cliente; sem cliente, só líderes veem a empresa toda.
export function canSeeClient(ctx, clientId) {
  if (ctx.task.client_id !== null && ctx.task.client_id !== undefined) return clientId === ctx.task.client_id;
  return ['executivo', 'diretor'].includes(ctx.emp.nivel) || clientId === null;
}

function saveFile(ctx, nome, conteudo, mime, encoding = 'utf8') {
  const safe = String(nome).replace(/[^\w.\-]+/g, '_').slice(0, 120) || 'arquivo.txt';
  const dir = path.join(ctx.config.dataDir, 'files', String(ctx.task.client_id ?? 'interno'), String(ctx.task.id));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${Date.now()}_${safe}`);
  fs.writeFileSync(file, conteudo, encoding);
  const r = ctx.db.prepare('INSERT INTO files (client_id, task_id, nome, caminho, mime, bytes, criado_por, created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(ctx.task.client_id ?? null, ctx.task.id, safe, file, mime || 'text/plain', fs.statSync(file).size, ctx.emp.slug, now());
  return Number(r.lastInsertRowid);
}

async function webhookWithFile(ctx, integ, acao, dados, nomeBase) {
  const r = await callWebhook(integ, acao, { ...dados, cliente_id: ctx.task.client_id, tarefa_id: ctx.task.id }, ctx.env, ctx.fetchImpl);
  if (!r.ok) return r;
  const resp = r.resposta || {};
  const ids = [];
  if (resp.base64) ids.push(saveFile(ctx, resp.nome || nomeBase, Buffer.from(resp.base64, 'base64'), resp.mime || 'application/octet-stream', undefined));
  if (resp.url) ids.push(saveFile(ctx, `${nomeBase}.url.txt`, String(resp.url), 'text/uri-list'));
  return { ok: true, arquivos: ids, resposta: { ...resp, base64: resp.base64 ? '[salvo em arquivo]' : undefined } };
}

export const TOOLS = {
  consultar_tarefas: {
    integracao: 'interno',
    description: 'Lista tarefas da empresa visíveis para você (filtradas pelo cliente da tarefa atual).',
    input_schema: { type: 'object', properties: { status: str('pendente, em_execucao, em_revisao, aguardando_info, aguardando_aprovacao, bloqueada, concluida, falhou'), responsavel: str('slug do funcionário'), limite: { type: 'integer' } } },
    run(ctx, i) {
      const rows = ctx.db.prepare(`SELECT id, titulo, tipo, assigned_slug AS responsavel, status, prioridade, prazo, client_id, parent_id FROM tasks
        WHERE (? IS NULL OR status = ?) AND (? IS NULL OR assigned_slug = ?) ORDER BY prioridade DESC, id DESC LIMIT 200`)
        .all(i.status ?? null, i.status ?? null, i.responsavel ?? null, i.responsavel ?? null);
      return { tarefas: rows.filter((r) => canSeeClient(ctx, r.client_id)).slice(0, Math.min(i.limite || 30, 100)) };
    },
  },
  consultar_entregas: {
    integracao: 'interno',
    description: 'Lê as entregas, revisões e notas de uma tarefa (somente do mesmo cliente).',
    input_schema: { type: 'object', properties: { tarefa_id: { type: 'integer' } }, required: ['tarefa_id'] },
    run(ctx, i) {
      const t = ctx.db.prepare('SELECT id, titulo, tipo, status, client_id, assigned_slug, feedback FROM tasks WHERE id=?').get(i.tarefa_id);
      if (!t || !canSeeClient(ctx, t.client_id)) return { erro: 'tarefa não encontrada' };
      return {
        tarefa: t,
        entregas: ctx.db.prepare('SELECT id, titulo, formato, conteudo, arquivos, limitacoes, aprovado, created_at FROM deliverables WHERE task_id=? ORDER BY id DESC LIMIT 3').all(t.id),
        revisoes: ctx.db.prepare('SELECT revisor_slug, decisao, motivos, ajustes, created_at FROM reviews WHERE task_id=? ORDER BY id DESC LIMIT 5').all(t.id),
        notas: ctx.db.prepare('SELECT autor, tipo, texto, created_at FROM task_notes WHERE task_id=? ORDER BY id DESC LIMIT 10').all(t.id),
      };
    },
  },
  consultar_equipe: {
    integracao: 'interno',
    description: 'Lista a equipe: cargo, departamento, superior, estado atual e tamanho da fila.',
    input_schema: { type: 'object', properties: { departamento: str('id do departamento (opcional)') } },
    run(ctx, i) {
      return { equipe: ctx.db.prepare(`SELECT e.slug, e.nome, e.cargo, e.departamento_id, e.superior_slug, e.estado,
        (SELECT COUNT(*) FROM tasks t WHERE t.assigned_slug=e.slug AND t.status IN ('pendente','em_execucao')) AS fila
        FROM employees e WHERE e.ativo=1 AND (? IS NULL OR e.departamento_id=?) ORDER BY e.numero`).all(i.departamento ?? null, i.departamento ?? null) };
    },
  },
  registrar_progresso: {
    integracao: 'interno',
    description: 'Registra uma nota de progresso na tarefa atual.',
    input_schema: { type: 'object', properties: { nota: str('progresso') }, required: ['nota'] },
    run(ctx, i) { addNote(ctx.db, ctx.task.id, ctx.emp.slug, 'progresso', i.nota); return { ok: true }; },
  },
  solicitar_informacao: {
    integracao: 'interno', terminal: true,
    description: 'Pede uma informação essencial que falta. A tarefa fica aguardando resposta e esta execução termina.',
    input_schema: { type: 'object', properties: { pergunta: str('o que falta e por quê') }, required: ['pergunta'] },
    run(ctx, i) {
      const para = ctx.task.created_by === 'sistema' ? OWNER : ctx.task.created_by;
      addNote(ctx.db, ctx.task.id, ctx.emp.slug, 'pergunta', i.pergunta);
      notify(ctx.db, para, 'pergunta', `${ctx.emp.nome} precisa de informação na tarefa #${ctx.task.id}: ${i.pergunta}`, ctx.task.id);
      ctx.state.final = { status: 'aguardando_info', motivo: i.pergunta };
      return { ok: true, encaminhada_para: para };
    },
  },
  reportar_bloqueio: {
    integracao: 'interno', terminal: true,
    description: 'Reporta um bloqueio (falta de ferramenta, de acesso ou tarefa fora do escopo). A tarefa fica bloqueada e o superior é avisado.',
    input_schema: { type: 'object', properties: { motivo: str('motivo do bloqueio') }, required: ['motivo'] },
    run(ctx, i) {
      addNote(ctx.db, ctx.task.id, ctx.emp.slug, 'bloqueio', i.motivo);
      notify(ctx.db, ctx.emp.superior_slug || OWNER, 'bloqueio', `Tarefa #${ctx.task.id} bloqueada por ${ctx.emp.nome}: ${i.motivo}`, ctx.task.id);
      ctx.state.final = { status: 'bloqueada', motivo: i.motivo };
      return { ok: true };
    },
  },
  entregar: {
    integracao: 'interno', terminal: true,
    description: 'Entrega o resultado da tarefa. A entrega é validada pelos critérios do tipo de tarefa e, quando exigido, vai para revisão independente.',
    input_schema: { type: 'object', properties: {
      titulo: str('título da entrega'), formato: str('ex.: documento, calendário, roteiro, código'),
      conteudo: str('entrega completa em Markdown'), arquivos: { type: 'array', items: { type: 'integer' }, description: 'ids de arquivos salvos' },
      limitacoes: str('o que não foi possível fazer e por quê (ferramentas não conectadas, dados ausentes)'),
    }, required: ['titulo', 'conteudo'] },
    run(ctx, i) {
      const arquivos = (i.arquivos || []).map(Number);
      const r = ctx.db.prepare(`INSERT INTO deliverables (task_id, employee_slug, client_id, titulo, formato, conteudo, arquivos, limitacoes, created_at) VALUES (?,?,?,?,?,?,?,?,?)`)
        .run(ctx.task.id, ctx.emp.slug, ctx.task.client_id ?? null, i.titulo, i.formato || null, i.conteudo, J(arquivos), i.limitacoes || null, now());
      ctx.state.deliverableId = Number(r.lastInsertRowid);
      return { ok: true, entrega_id: ctx.state.deliverableId, aviso: 'Entrega registrada; será validada.' };
    },
  },
  criar_tarefa: {
    integracao: 'interno',
    description: 'Cria uma tarefa/subtarefa para outro funcionário, com responsável, prazo, critérios de aceitação e dependências.',
    input_schema: { type: 'object', properties: {
      titulo: str('título'), descricao: str('contexto e instruções completas'), tipo: { type: 'string', enum: Object.keys(TASK_TYPES).filter((t) => t !== 'conversa') },
      responsavel: str('slug do funcionário'), prazo: str('data ISO (AAAA-MM-DD)'), prioridade: { type: 'integer', minimum: 1, maximum: 5 },
      criterios_aceitacao: arr('critérios de aceitação verificáveis'), depende_de: { type: 'array', items: { type: 'integer' }, description: 'ids de tarefas das quais esta depende' },
      complexidade: { type: 'string', enum: ['simples', 'normal', 'complexa'] },
    }, required: ['titulo', 'descricao', 'tipo', 'responsavel', 'prazo', 'criterios_aceitacao'] },
    run(ctx, i) {
      if (!i.criterios_aceitacao?.length) return { erro: 'informe ao menos um critério de aceitação' };
      const id = createTask(ctx.db, { ...i, parent_id: ctx.task.id, client_id: ctx.task.client_id, project_id: ctx.task.project_id }, ctx.emp.slug);
      return { ok: true, tarefa_id: id };
    },
  },
  iniciar_fluxo: {
    integracao: 'interno',
    description: `Inicia um fluxo de trabalho entre departamentos (cria todas as tarefas encadeadas). Fluxos: ${Object.entries(WORKFLOWS).map(([k, w]) => `${k} (${w.nome})`).join('; ')}.`,
    input_schema: { type: 'object', properties: { fluxo: { type: 'string', enum: Object.keys(WORKFLOWS) }, briefing: str('briefing completo'), prazo: str('data ISO') }, required: ['fluxo', 'briefing'] },
    run(ctx, i) { return { ok: true, ...startWorkflow(ctx.db, i.fluxo, { client_id: ctx.task.client_id ?? null, briefing: i.briefing, prazo: i.prazo || null }, ctx.emp.slug) }; },
  },
  revisar_entrega: {
    integracao: 'interno', terminal: true,
    description: 'Registra a decisão da revisão (só em tarefas de revisão). Toda reprovação precisa de motivos e ajustes.',
    input_schema: { type: 'object', properties: {
      decisao: { type: 'string', enum: ['aprovar', 'reprovar'] }, motivos: arr('motivos'), ajustes: arr('ajustes exigidos'),
      reabrir_tarefas: { type: 'array', items: { type: 'integer' }, description: 'em fluxos: ids das tarefas a corrigir (padrão: as dependências diretas)' },
    }, required: ['decisao', 'motivos'] },
    run(ctx, i) {
      if (ctx.task.tipo !== 'revisao_qualidade') return { erro: 'revisar_entrega só pode ser usada em tarefas de revisão' };
      const r = recordReview(ctx.db, ctx.task, ctx.emp.slug, { decisao: i.decisao, motivos: i.motivos || [], ajustes: i.ajustes || [], reabrir: i.reabrir_tarefas || [] });
      ctx.state.final = { status: 'revisada' };
      return { ok: true, ...r };
    },
  },
  solicitar_aprovacao: {
    integracao: 'interno',
    description: `Pede ao proprietário autorização para uma ação externa/crítica. Ações: ${Object.entries(APPROVAL_ACTIONS).map(([k, v]) => `${k} (${v.nome})`).join('; ')}. Nada é executado até a aprovação.`,
    input_schema: { type: 'object', properties: { acao: { type: 'string', enum: Object.keys(APPROVAL_ACTIONS) }, descricao: str('o que será feito, para quem, valores'), payload: { type: 'object', description: 'dados necessários para executar (destinatário, texto, valor, arquivo_id, plataforma...)' } }, required: ['acao', 'descricao'] },
    run(ctx, i) {
      const id = requestApproval(ctx.db, { acao: i.acao, descricao: i.descricao, payload: i.payload || {}, solicitado_por: ctx.emp.slug, task_id: ctx.task.id, client_id: ctx.task.client_id ?? null });
      return { ok: true, aprovacao_id: id, status: 'aguardando aprovação do proprietário — a ação NÃO foi executada' };
    },
  },
  arquivos_salvar: {
    integracao: 'armazenamento',
    description: 'Salva um arquivo de texto (Markdown, HTML, SVG, CSV, código) no armazenamento do cliente e devolve o id.',
    input_schema: { type: 'object', properties: { nome: str('nome do arquivo com extensão'), conteudo: str('conteúdo'), mime: str('tipo MIME') }, required: ['nome', 'conteudo'] },
    run(ctx, i) { return { ok: true, arquivo_id: saveFile(ctx, i.nome, i.conteudo, i.mime) }; },
  },
  arquivos_listar: {
    integracao: 'armazenamento',
    description: 'Lista os arquivos do cliente da tarefa atual.',
    input_schema: { type: 'object', properties: {} },
    run(ctx) {
      const rows = ctx.db.prepare('SELECT id, nome, mime, bytes, task_id, criado_por, client_id, created_at FROM files WHERE excluido=0 ORDER BY id DESC LIMIT 200').all();
      return { arquivos: rows.filter((r) => canSeeClient(ctx, r.client_id)).slice(0, 50) };
    },
  },
  crm_registrar: {
    integracao: 'crm',
    description: 'Registra ou atualiza um lead no CRM (somente dados de fontes públicas/autorizadas).',
    input_schema: { type: 'object', properties: { id: { type: 'integer' }, empresa: str('empresa'), segmento: str(''), contato: str('contato profissional público'), fonte: str('link ou origem do dado'), etapa: { type: 'string', enum: ['novo', 'qualificado', 'contato_preparado', 'proposta', 'ganho', 'perdido'] }, qualificacao: str(''), notas: str('') }, required: ['empresa', 'fonte'] },
    run(ctx, i) {
      const t = now();
      if (i.id) {
        ctx.db.prepare(`UPDATE crm_leads SET empresa=?, segmento=COALESCE(?,segmento), contato=COALESCE(?,contato), fonte=?, etapa=COALESCE(?,etapa), qualificacao=COALESCE(?,qualificacao), notas=COALESCE(?,notas), updated_at=? WHERE id=?`)
          .run(i.empresa, i.segmento ?? null, i.contato ?? null, i.fonte, i.etapa ?? null, i.qualificacao ?? null, i.notas ?? null, t, i.id);
        return { ok: true, lead_id: i.id };
      }
      const r = ctx.db.prepare(`INSERT INTO crm_leads (empresa, segmento, contato, fonte, etapa, qualificacao, notas, registrado_por, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(i.empresa, i.segmento ?? null, i.contato ?? null, i.fonte, i.etapa || 'novo', i.qualificacao ?? null, i.notas ?? null, ctx.emp.slug, t, t);
      return { ok: true, lead_id: Number(r.lastInsertRowid) };
    },
  },
  crm_consultar: {
    integracao: 'crm',
    description: 'Consulta leads do CRM.',
    input_schema: { type: 'object', properties: { etapa: str('') } },
    run(ctx, i) { return { leads: ctx.db.prepare('SELECT * FROM crm_leads WHERE (? IS NULL OR etapa=?) ORDER BY id DESC LIMIT 50').all(i.etapa ?? null, i.etapa ?? null) }; },
  },
  financeiro_lancar: {
    integracao: 'financeiro',
    description: 'Registra um lançamento autorizado no livro-caixa interno (não movimenta dinheiro).',
    input_schema: { type: 'object', properties: { tipo: { type: 'string', enum: ['receita', 'despesa'] }, categoria: str(''), descricao: str(''), valor: { type: 'number' }, data: str('AAAA-MM-DD'), status: { type: 'string', enum: ['previsto', 'realizado'] }, origem_autorizacao: str('documento, aprovação ou instrução que autoriza o lançamento') }, required: ['tipo', 'categoria', 'descricao', 'valor', 'data', 'origem_autorizacao'] },
    run(ctx, i) {
      const r = ctx.db.prepare(`INSERT INTO finance_entries (tipo, categoria, descricao, valor, data, client_id, status, registrado_por, created_at) VALUES (?,?,?,?,?,?,?,?,?)`)
        .run(i.tipo, i.categoria, `${i.descricao} [autorização: ${i.origem_autorizacao}]`, Number(i.valor), i.data, ctx.task.client_id ?? null, i.status || 'previsto', ctx.emp.slug, now());
      return { ok: true, lancamento_id: Number(r.lastInsertRowid) };
    },
  },
  financeiro_consultar: {
    integracao: 'financeiro',
    description: 'Consulta lançamentos e totais do livro-caixa interno.',
    input_schema: { type: 'object', properties: { de: str('AAAA-MM-DD'), ate: str('AAAA-MM-DD') } },
    run(ctx, i) {
      const rows = ctx.db.prepare(`SELECT * FROM finance_entries WHERE (? IS NULL OR data >= ?) AND (? IS NULL OR data <= ?) ORDER BY data DESC LIMIT 200`).all(i.de ?? null, i.de ?? null, i.ate ?? null, i.ate ?? null);
      const tot = (tp) => rows.filter((r) => r.tipo === tp).reduce((s, r) => s + r.valor, 0);
      return { lancamentos: rows, totais: { receitas: tot('receita'), despesas: tot('despesa') } };
    },
  },
  consultar_custos_ia: {
    integracao: 'interno',
    description: 'Consumo e custo de IA registrados pelo sistema, por funcionário, cliente e dia.',
    input_schema: { type: 'object', properties: {} },
    run(ctx) { return costSummary(ctx.db); },
  },
  gerar_imagem: {
    integracao: 'imagem',
    description: 'Gera uma imagem real pela ferramenta gráfica conectada e salva o arquivo.',
    input_schema: { type: 'object', properties: { prompt: str('descrição detalhada da imagem'), formato: str('ex.: 1080x1350'), nome: str('nome do arquivo') }, required: ['prompt'] },
    run(ctx, i) { return webhookWithFile(ctx, 'imagem', 'gerar_imagem', i, i.nome || 'imagem'); },
  },
  video_render: {
    integracao: 'video',
    description: 'Envia um projeto de edição para a ferramenta de vídeo conectada e salva o resultado.',
    input_schema: { type: 'object', properties: { projeto: str('instruções/estrutura de edição'), formato: str('9:16, 16:9...'), nome: str('') }, required: ['projeto'] },
    run(ctx, i) { return webhookWithFile(ctx, 'video', 'renderizar', i, i.nome || 'video'); },
  },
  analytics_consultar: {
    integracao: 'analytics',
    description: 'Consulta métricas reais na ferramenta de analytics conectada.',
    input_schema: { type: 'object', properties: { fonte: str('site, instagram, ads...'), metricas: arr('métricas'), periodo: str('ex.: 2026-10-01..2026-10-28') }, required: ['metricas', 'periodo'] },
    run(ctx, i) { return callWebhook('analytics', 'consultar', { ...i, cliente_id: ctx.task.client_id }, ctx.env, ctx.fetchImpl); },
  },
  calendario_consultar: {
    integracao: 'calendario',
    description: 'Consulta a agenda conectada.',
    input_schema: { type: 'object', properties: { de: str(''), ate: str('') } },
    run(ctx, i) { return callWebhook('calendario', 'consultar', i, ctx.env, ctx.fetchImpl); },
  },
  ci_executar: {
    integracao: 'ci',
    description: 'Executa testes ou publica em homologação pela integração de CI conectada (nunca produção).',
    input_schema: { type: 'object', properties: { acao: { type: 'string', enum: ['testes', 'homologacao'] }, arquivos: { type: 'array', items: { type: 'integer' } }, instrucoes: str('') }, required: ['acao'] },
    run(ctx, i) { return callWebhook('ci', i.acao, { ...i, tarefa_id: ctx.task.id }, ctx.env, ctx.fetchImpl); },
  },
  // Ferramenta do servidor do provedor de IA (executada pela Anthropic, não por nós)
  pesquisa_web: { integracao: 'pesquisa_web', server: true, description: 'Pesquisa web com fontes.' },
};

// Ferramentas que o funcionário pode usar e que estão conectadas
export function toolsFor(emp, env) {
  const allowed = emp.ferramentas.filter((n) => TOOLS[n]);
  const out = { client: [], server: [], indisponiveis: [] };
  for (const n of allowed) {
    const t = TOOLS[n];
    const ok = t.integracao === 'interno' || isConnected(t.integracao, env);
    if (!ok) { out.indisponiveis.push(n); continue; }
    if (t.server) out.server.push(n);
    else out.client.push(n);
  }
  if (!emp.acoes_aprovacao?.length) out.client = out.client.filter((n) => n !== 'solicitar_aprovacao');
  return out;
}

export function toolDefinitions(names) {
  return names.map((n) => ({ name: n, description: TOOLS[n].description, input_schema: TOOLS[n].input_schema }));
}

// Executa uma ferramenta com checagem de permissão, registro e auditoria
export async function executeTool(ctx, name, input) {
  const t = TOOLS[name];
  let ok = false; let result;
  if (!t || t.server) result = { erro: `ferramenta desconhecida: ${name}` };
  else if (!ctx.emp.ferramentas.includes(name)) {
    result = { erro: `permissão negada: ${ctx.emp.cargo} não pode usar ${name}` };
    audit(ctx.db, { ator: ctx.emp.slug, acao: 'ferramenta_negada', alvo: name, task_id: ctx.task.id, client_id: ctx.task.client_id });
  } else if (t.integracao !== 'interno' && !isConnected(t.integracao, ctx.env)) {
    result = { erro: `ferramenta ${name} não conectada; informe a limitação e entregue apenas o que conseguir produzir` };
  } else {
    try {
      result = await t.run(ctx, input || {});
      ok = !result?.erro && result?.ok !== false;
    } catch (e) { result = { erro: e.message }; }
  }
  const out = JSON.stringify(result ?? {});
  ctx.db.prepare(`INSERT INTO tool_executions (run_id, task_id, employee_slug, ferramenta, entrada, ok, resultado, created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(ctx.runId, ctx.task.id, ctx.emp.slug, name, J(input).slice(0, 20000), ok ? 1 : 0, out.slice(0, 20000), now());
  return { ok, content: out.length > 30000 ? out.slice(0, 30000) + '…(truncado)' : out };
}

export { getEmployee };
