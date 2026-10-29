// Aprovações do proprietário. Nenhum funcionário (nem o CEO) executa estas ações sem aprovação.
import fs from 'node:fs';
import { now, J, P, tx } from './db.js';
import { audit, notify } from './audit.js';
import { callWebhook } from './tools/integrations.js';
import { OWNER } from './tasks.js';

export const APPROVAL_ACTIONS = {
  publicar_campanha: { nome: 'Publicar campanha ou conteúdo', integracao: (p) => (p?.plataforma === 'anuncios' ? 'anuncios' : 'social') },
  enviar_mensagem_externa: { nome: 'Enviar mensagem externa', integracao: () => 'email' },
  enviar_proposta_final: { nome: 'Enviar proposta comercial definitiva', integracao: () => 'email' },
  assinar_contrato: { nome: 'Assinar contrato', integracao: () => 'assinatura' },
  fazer_pagamento: { nome: 'Fazer pagamento', integracao: () => 'pagamentos' },
  contratar_servico: { nome: 'Contratar serviço pago', integracao: () => 'pagamentos' },
  alterar_orcamento_anuncios: { nome: 'Alterar orçamento de anúncios', integracao: () => 'anuncios' },
  excluir_arquivo_permanente: { nome: 'Excluir arquivo permanentemente', integracao: () => 'interno' },
  publicar_producao: { nome: 'Publicar site em produção', integracao: () => 'deploy' },
  alterar_configuracao_critica: { nome: 'Alterar configuração crítica', integracao: () => 'interno' },
};

// Configurações críticas que podem ser alteradas por aprovação
export const CRITICAL_SETTINGS = ['orcamento_diario_usd', 'trabalhar_fora_do_expediente'];

export function getSetting(db, key, def = null) {
  const r = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return r ? P(r.value, def) : def;
}
export function setSetting(db, key, value) {
  db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).run(key, J(value), now());
}

export function requestApproval(db, { acao, descricao, payload = {}, solicitado_por, task_id = null, client_id = null }) {
  if (!APPROVAL_ACTIONS[acao]) throw new Error(`ação desconhecida: ${acao}`);
  if (solicitado_por !== OWNER) {
    const emp = db.prepare('SELECT acoes_aprovacao FROM employees WHERE slug=?').get(solicitado_por);
    if (!emp || !P(emp.acoes_aprovacao, []).includes(acao)) throw new Error(`${solicitado_por} não tem permissão para solicitar "${acao}"`);
  }
  const r = db.prepare(`INSERT INTO approvals (acao, descricao, payload, solicitado_por, task_id, client_id, created_at) VALUES (?,?,?,?,?,?,?)`)
    .run(acao, descricao, J(payload), solicitado_por, task_id, client_id, now());
  const id = Number(r.lastInsertRowid);
  audit(db, { ator: solicitado_por, acao: 'aprovacao_solicitada', alvo: `aprovacao:${id}`, approval_id: id, task_id, client_id, detalhes: { acao, descricao } });
  notify(db, OWNER, 'aprovacao', `${APPROVAL_ACTIONS[acao].nome}: ${descricao}`, task_id);
  return id;
}

// Somente o proprietário decide. O CEO não pode aprovar.
export async function decideApproval(db, id, { decisao, decidido_por, observacao = '' }, env = process.env, fetchImpl = fetch) {
  if (decidido_por !== OWNER) throw new Error('somente o proprietário pode decidir aprovações');
  const a = db.prepare('SELECT * FROM approvals WHERE id=?').get(id);
  if (!a) throw new Error('aprovação inexistente');
  if (a.status !== 'pendente') throw new Error(`aprovação já ${a.status}`);
  if (!['aprovar', 'rejeitar'].includes(decisao)) throw new Error('decisão deve ser aprovar ou rejeitar');
  const status = decisao === 'aprovar' ? 'aprovada' : 'rejeitada';
  // Marca a decisão antes de executar (evita execução dupla em cliques repetidos)
  const upd = db.prepare(`UPDATE approvals SET status=?, decidido_por=?, decidido_em=?, observacao=? WHERE id=? AND status='pendente'`).run(status, decidido_por, now(), observacao, id);
  if (!upd.changes) throw new Error('aprovação já decidida');
  audit(db, { ator: decidido_por, acao: `aprovacao_${status}`, alvo: `aprovacao:${id}`, approval_id: id, task_id: a.task_id, client_id: a.client_id, detalhes: { acao: a.acao, observacao } });
  if (a.task_id) notify(db, a.solicitado_por, 'aprovacao', `Sua solicitação #${id} (${a.acao}) foi ${status}.`, a.task_id);
  if (status === 'rejeitada') return { status };
  return executeApproval(db, id, env, fetchImpl);
}

export async function executeApproval(db, id, env = process.env, fetchImpl = fetch) {
  const a = db.prepare('SELECT * FROM approvals WHERE id=?').get(id);
  if (a.status !== 'aprovada') throw new Error('só é possível executar uma ação aprovada');
  const payload = P(a.payload, {});
  const integ = APPROVAL_ACTIONS[a.acao].integracao(payload);
  let resultado;
  if (integ === 'interno') resultado = executeInternal(db, a.acao, payload, a.client_id);
  else resultado = await callWebhook(integ, a.acao, { ...payload, aprovacao_id: id, descricao: a.descricao }, env, fetchImpl);
  const status = resultado.ok ? 'executada' : resultado.nao_conectado ? 'aprovada_sem_integracao' : 'falhou';
  tx(db, () => {
    db.prepare('UPDATE approvals SET status=?, executado_por=?, executado_em=?, resultado=? WHERE id=?')
      .run(status, `sistema:${integ}`, now(), J(resultado), id);
    audit(db, { ator: `sistema:${integ}`, acao: `acao_${status}`, alvo: `aprovacao:${id}`, approval_id: id, task_id: a.task_id, client_id: a.client_id,
      detalhes: { acao: a.acao, solicitado_por: a.solicitado_por, autorizado_por: a.decidido_por, resultado } });
  });
  if (status !== 'executada') notify(db, OWNER, 'aprovacao', `Ação aprovada #${id} (${a.acao}) não foi executada: ${resultado.erro}`, a.task_id);
  return { status, resultado };
}

function executeInternal(db, acao, payload, clientId) {
  if (acao === 'excluir_arquivo_permanente') {
    const f = db.prepare('SELECT * FROM files WHERE id=?').get(Number(payload.arquivo_id));
    if (!f) return { ok: false, erro: 'arquivo inexistente' };
    if (clientId !== null && f.client_id !== clientId) return { ok: false, erro: 'arquivo pertence a outro cliente' };
    try { fs.rmSync(f.caminho, { force: true }); } catch (e) { return { ok: false, erro: e.message }; }
    db.prepare('UPDATE files SET excluido=1 WHERE id=?').run(f.id);
    return { ok: true, resposta: { excluido: f.id } };
  }
  if (acao === 'alterar_configuracao_critica') {
    if (!CRITICAL_SETTINGS.includes(payload.chave)) return { ok: false, erro: `configuração não permitida: ${payload.chave}` };
    setSetting(db, payload.chave, payload.valor);
    return { ok: true, resposta: { [payload.chave]: payload.valor } };
  }
  return { ok: false, erro: 'ação interna desconhecida' };
}
