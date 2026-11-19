import type { EmailRow, Preferences, SummaryRow } from '../data/types';

// Regras determinísticas (sem IA) aplicadas ANTES do modelo.
// Usam remetente, cabeçalhos e rótulos do Gmail — nunca apenas o assunto.

const NOREPLY = /^(no-?reply|do-?not-?reply|nao-?responda|naoresponda|mailer-daemon|notifications?|news(letter)?|marketing|promo)/i;

function domainOf(email: string) { return email.split('@')[1]?.toLowerCase() ?? ''; }

function listHas(list: string[], email: string) {
  const e = email.toLowerCase();
  const d = domainOf(e);
  return list.some((x) => {
    const v = x.trim().toLowerCase();
    return v && (v === e || v === d || v === `@${d}`);
  });
}

export type RuleDecision =
  | { kind: 'skip' }                      // não precisa de triagem (ex.: enviados pelo próprio usuário)
  | { kind: 'final'; summary: Omit<SummaryRow, 'email_id' | 'user_id'> } // resolvido sem IA
  | { kind: 'ai'; hints: string[] };      // vai para o modelo, com dicas de contexto

export function applyRules(email: EmailRow, prefs: Preferences): RuleDecision {
  if (email.is_sent) return { kind: 'skip' };

  const hints: string[] = [];
  const vip = listHas(prefs.vip_senders, email.from_email);
  const work = listHas(prefs.work_domains, email.from_email);
  if (vip) hints.push('remetente marcado como VIP pelo usuário');
  if (work) hints.push('remetente do domínio de trabalho do usuário');

  if (!vip && listHas(prefs.ignored_senders, email.from_email)) {
    return { kind: 'final', summary: lowPriority(email, 'Remetente está na sua lista de ignorados', 'Pode ignorar') };
  }

  const promo = email.label_ids.includes('CATEGORY_PROMOTIONS');
  const bulk = email.has_list_unsubscribe || NOREPLY.test(email.from_email.split('@')[0] ?? '');
  if (!vip && !work && promo && email.has_list_unsubscribe) {
    return { kind: 'final', summary: lowPriority(email, 'Mensagem promocional em massa (Gmail: Promoções, com descadastro)', 'Pode ignorar ou descadastrar') };
  }
  if (bulk) hints.push('mensagem enviada em massa/automática (lista ou no-reply)');
  if (email.label_ids.includes('CATEGORY_SOCIAL')) hints.push('Gmail: aba Social');
  if (email.label_ids.includes('CATEGORY_UPDATES')) hints.push('Gmail: aba Atualizações');
  if (email.label_ids.includes('IMPORTANT')) hints.push('Gmail marcou como importante');
  if (email.label_ids.includes('STARRED')) hints.push('usuário marcou com estrela');
  return { kind: 'ai', hints };
}

function lowPriority(email: EmailRow, reason: string, action: string): Omit<SummaryRow, 'email_id' | 'user_id'> {
  return {
    category: 'informativos',
    priority: 'baixa',
    relevance_score: 5,
    summary: email.snippet.slice(0, 240) || email.subject.slice(0, 240) || 'Mensagem sem conteúdo',
    reason,
    recommended_action: action,
    needs_reply: false,
    deadline: null,
    is_bill: false,
    bill_amount: null,
    is_appointment: false,
    appointment_at: null,
    source: 'rules',
    model: null,
  };
}
