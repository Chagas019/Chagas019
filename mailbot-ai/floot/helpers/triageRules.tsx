import type { ParsedEmail } from "./emailParse";
import type { MbAction, MbCategory, MbPriority, MbReason } from "./schema";

// Regras determinísticas (sem IA) aplicadas ANTES do modelo.
// Usam remetente, cabeçalhos e rótulos do Gmail — nunca apenas o assunto.

export type RuleResult = {
  category: MbCategory;
  priority: MbPriority;
  relevanceScore: number;
  needsReply: boolean;
  deadline: string | null;
  isBill: boolean;
  isAppointment: boolean;
  appointmentAt: string | null;
  action: MbAction;
  reason: MbReason;
};

export type RuleDecision = { kind: "skip" } | { kind: "final"; result: RuleResult } | { kind: "ai"; hints: string[] };

type Prefs = { vipSenders: string[]; workDomains: string[]; ignoredSenders: string[] };

const NOREPLY = /^(no-?reply|do-?not-?reply|nao-?responda|naoresponda|mailer-daemon|notifications?|news(letter)?|marketing|promo)/i;

function listHas(list: string[], email: string) {
  const e = email.toLowerCase();
  const d = e.split("@")[1] ?? "";
  return list.some((x) => {
    const v = x.trim().toLowerCase();
    return Boolean(v) && (v === e || v === d || v === `@${d}`);
  });
}

const low = (reason: MbReason): RuleResult => ({
  category: "informativos", priority: "baixa", relevanceScore: 5, needsReply: false, deadline: null,
  isBill: false, isAppointment: false, appointmentAt: null, action: "ignorar", reason,
});

export function triageRules(email: ParsedEmail, prefs: Prefs): RuleDecision {
  if (email.isSent) return { kind: "skip" };
  const hints: string[] = [];
  const vip = listHas(prefs.vipSenders, email.fromEmail);
  const work = listHas(prefs.workDomains, email.fromEmail);
  if (vip) hints.push("remetente marcado como VIP pelo usuário");
  if (work) hints.push("remetente do domínio de trabalho do usuário");
  if (!vip && listHas(prefs.ignoredSenders, email.fromEmail)) return { kind: "final", result: low("remetente_ignorado") };
  const promo = email.labelIds.includes("CATEGORY_PROMOTIONS");
  if (!vip && !work && promo && email.hasListUnsubscribe) return { kind: "final", result: low("promocional") };
  if (email.hasListUnsubscribe || NOREPLY.test(email.fromEmail.split("@")[0] ?? "")) hints.push("mensagem enviada em massa/automática (lista ou no-reply)");
  if (email.labelIds.includes("CATEGORY_SOCIAL")) hints.push("Gmail: aba Social");
  if (email.labelIds.includes("CATEGORY_UPDATES")) hints.push("Gmail: aba Atualizações");
  if (email.labelIds.includes("IMPORTANT")) hints.push("Gmail marcou como importante");
  if (email.labelIds.includes("STARRED")) hints.push("usuário marcou com estrela");
  return { kind: "ai", hints };
}
