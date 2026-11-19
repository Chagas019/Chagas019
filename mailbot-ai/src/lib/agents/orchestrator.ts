import type { AgentName } from '../data/types';

// ORQUESTRADOR — roteamento determinístico (sem IA, custo zero).
// Cada intenção pertence a exatamente UM agente; nenhum agente é executado sem necessidade.

export type Intent =
  | 'triage.run'
  | 'summary.daily'
  | 'summary.weekly'
  | 'chat.important_today'
  | 'chat.bills'
  | 'chat.awaiting_reply'
  | 'chat.appointments'
  | 'chat.work'
  | 'chat.ignorable'
  | 'chat.search'
  | 'chat.open';

export interface Route { agent: AgentName; intent: Intent }

export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

const RULES: [RegExp, Intent][] = [
  [/\b(classifi(que|car)|reclassifi|analis(e|ar) (os |meus )?(novos )?e-?mails|triag)/, 'triage.run'],
  [/\b(resum\w*|relatorio)\b.*\b(7|sete) dias|\b(resum\w*|relatorio)\b.*\bsemana|\bsemana(l)?\b.*\bresum/, 'summary.weekly'],
  [/\b(resum\w*|relatorio)\b.*\b(hoje|dia|diario)\b|\bresumo do dia\b|\bcomo foi (o )?meu dia\b/, 'summary.daily'],
  [/\b(cobranc|boleto|fatura|pagament|pagar|vencid|venciment|conta a pagar|pix)/, 'chat.bills'],
  [/\b(esperando|aguardando|aguarda|espera)\b.*\b(resposta|retorno)|\bprecis\w* (de )?respo|\bdevo responder|\bresponder\b.*\?$/, 'chat.awaiting_reply'],
  [/\b(compromisso|reuni|agenda|evento|consulta|encontro|marcad)/, 'chat.appointments'],
  [/\b(posso ignorar|ignorar|irrelevant|sem importancia|lixo|spam|propaganda)/, 'chat.ignorable'],
  [/\b(importante|urgente|prioridade|prioritari)\w*/, 'chat.important_today'],
  [/\b(trabalho|emprego|chefe|cliente|projeto|empresa)\b/, 'chat.work'],
  [/\b(encontr|ach(e|ar)|procur|busc|localiz|onde esta|qual (foi )?o e-?mail|mostre o e-?mail)/, 'chat.search'],
];

export function route(question: string): Route {
  const q = normalize(question);
  for (const [re, intent] of RULES) {
    if (re.test(q)) return { agent: intent.split('.')[0] as AgentName, intent };
  }
  return { agent: 'chat', intent: 'chat.open' };
}
