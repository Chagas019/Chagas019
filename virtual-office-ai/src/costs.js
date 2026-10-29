// Cálculo e limites de custo de IA.
import { getSetting } from './approvals.js';

export function costOf(config, modelo, usage = {}) {
  const p = config.pricing[modelo] || config.pricing[config.defaultModel];
  const input = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) * 1.25 + (usage.cache_read_input_tokens || 0) * 0.1;
  const web = usage.server_tool_use?.web_search_requests || 0;
  return (input * p.input + (usage.output_tokens || 0) * p.output) / 1e6 + web * config.webSearchPriceUsd;
}

const today = () => new Date().toISOString().slice(0, 10);

export function spentToday(db, slug = null) {
  const q = slug
    ? db.prepare(`SELECT COALESCE(SUM(custo_usd),0) AS v FROM runs WHERE employee_slug=? AND substr(started_at,1,10)=?`).get(slug, today())
    : db.prepare(`SELECT COALESCE(SUM(custo_usd),0) AS v FROM runs WHERE substr(started_at,1,10)=?`).get(today());
  return q.v;
}

export function companyBudget(db, config) {
  return Number(getSetting(db, 'orcamento_diario_usd', config.companyDailyBudgetUsd));
}

// Verifica se ainda há orçamento antes de iniciar uma execução
export function budgetCheck(db, config, emp) {
  const lim = emp.limites_custo;
  const gastoEmp = spentToday(db, emp.slug);
  if (gastoEmp >= lim.diario_usd) return { ok: false, motivo: `limite diário de custo de ${emp.nome} atingido (US$ ${gastoEmp.toFixed(4)} de ${lim.diario_usd})` };
  const gastoEmpresa = spentToday(db);
  const orc = companyBudget(db, config);
  if (gastoEmpresa >= orc) return { ok: false, motivo: `orçamento diário da empresa atingido (US$ ${gastoEmpresa.toFixed(4)} de ${orc})` };
  return { ok: true, restante_tarefa: lim.por_tarefa_usd, restante_dia: Math.min(lim.diario_usd - gastoEmp, orc - gastoEmpresa) };
}

export function costSummary(db) {
  return {
    hoje_usd: spentToday(db),
    por_funcionario: db.prepare(`SELECT employee_slug, COUNT(*) AS execucoes, SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens, ROUND(SUM(custo_usd),6) AS custo_usd FROM runs GROUP BY employee_slug ORDER BY custo_usd DESC`).all(),
    por_cliente: db.prepare(`SELECT r.client_id, c.nome, ROUND(SUM(r.custo_usd),6) AS custo_usd FROM runs r LEFT JOIN clients c ON c.id=r.client_id GROUP BY r.client_id`).all(),
    por_dia: db.prepare(`SELECT substr(started_at,1,10) AS dia, ROUND(SUM(custo_usd),6) AS custo_usd, COUNT(*) AS execucoes FROM runs GROUP BY dia ORDER BY dia DESC LIMIT 30`).all(),
  };
}
