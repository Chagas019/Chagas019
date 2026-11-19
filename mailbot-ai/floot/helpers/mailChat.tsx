import { z } from "zod";
import { db } from "./db";
import { gmailApi } from "./gmailApi";
import { emailParse } from "./emailParse";
import { mailQueries, type TriagedRow } from "./mailQueries";
import { messageMeta } from "./messageMeta";
import { localTime } from "./localTime";
import { userPrefs } from "./userPrefs";
import { promptGuard } from "./promptGuard";
import { mailLabels } from "./mailLabels";
import { aiCall, BudgetExceeded, chatTier } from "./aiCall";
import { normalizeText, type Intent } from "./mailOrchestrator";

// AGENTE 03 — MAIL CHAT
// Responde perguntas consultando mensagens reais (Gmail), classificações (MAIL TRIAGE) e relatórios.
// Perguntas cobertas por consulta são respondidas sem IA. Sem resultados -> diz que não encontrou (nunca inventa).

export type ChatRef = { gmailId: string; subject: string; from: string; receivedAt: string };
export type ChatAnswer = { answer: string; refs: ChatRef[]; usedAi: boolean };

const fmt = (d: Date | string, tz: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

async function listAnswer(userId: number, title: string, rows: TriagedRow[], tz: string, empty: string, extra?: (r: TriagedRow) => string): Promise<ChatAnswer> {
  if (!rows.length) return { answer: empty, refs: [], usedAi: false };
  const meta = await messageMeta(userId, rows.map((r) => r.gmailId));
  const refs: ChatRef[] = [];
  const lines = rows.map((r, i) => {
    const m = meta.get(r.gmailId);
    const from = m ? m.fromName ?? m.fromEmail : "remetente indisponível";
    refs.push({ gmailId: r.gmailId, subject: m?.subject ?? "(mensagem indisponível)", from, receivedAt: new Date(r.receivedAt).toISOString() });
    const more = extra?.(r);
    return `[${i + 1}] ${m?.subject ?? "(mensagem indisponível)"} — ${from}, ${fmt(r.receivedAt, tz)}${more ? ` · ${more}` : ""}\n    → ${mailLabels.action[r.action]} (${mailLabels.reason[r.reason]})`;
  });
  return { answer: `${title}\n\n${lines.join("\n")}`, refs, usedAi: false };
}

// ------------------------------------------------------------------ filtros determinísticos -> busca do Gmail
const STOP = new Set(("o a os as um uma de do da dos das e em no na nos nas para por com sobre que qual quais meu minha meus minhas " +
  "email emails e-mail e-mails mensagem mensagens encontre encontrar ache achar procure procurar busque buscar localize mostre mostrar " +
  "me eu tem existe algum alguma onde esta foi recebi enviou mandou falando fala diz disse assunto hoje ontem semana mes passada ultimos ultimas dias").split(" "));

export function parseQuery(question: string, tz: string, now = new Date()) {
  let q = normalizeText(question).replace(/[?!.,;:"'()]/g, " ");
  const today = localTime.localDate(now, tz);
  let since: Date | undefined;
  let until: Date | undefined;
  const range = (a: string, b = today) => { since = localTime.startOfLocalDay(a, tz); until = localTime.startOfLocalDay(localTime.addDays(b, 1), tz); };
  const nDays = q.match(/\bultim[oa]s? (\d+) dias\b/);
  if (/\bhoje\b/.test(q)) range(today);
  else if (/\bontem\b/.test(q)) range(localTime.addDays(today, -1), localTime.addDays(today, -1));
  else if (nDays) range(localTime.addDays(today, -Number(nDays[1]) + 1));
  else if (/\bsemana passada\b/.test(q)) range(localTime.addDays(today, -13), localTime.addDays(today, -7));
  else if (/\b(essa|esta|nessa|nesta|ultima) semana\b/.test(q)) range(localTime.addDays(today, -6));
  else if (/\b(esse|este|ultimo) mes\b/.test(q)) range(localTime.addDays(today, -29));
  let from: string | undefined;
  const fm = q.match(/\b(?:de|do|da|enviad[oa] por|mandad[oa] por)\s+([\w.@+-]{3,})/);
  if (fm && !STOP.has(fm[1])) { from = fm[1]; q = q.replace(fm[0], " "); }
  const text = q.split(" ").filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)).slice(0, 8).join(" ");
  return { text, from, since, until };
}

export function toGmailQuery(p: ReturnType<typeof parseQuery>, anyTerm = false): string {
  const parts: string[] = [];
  if (p.text) parts.push(anyTerm ? `{${p.text.split(" ").join(" ")}}` : p.text);
  if (p.from) parts.push(`from:${p.from.replace(/[^\w.@+-]/g, "")}`);
  if (p.since) parts.push(`after:${Math.floor(p.since.getTime() / 1000)}`);
  if (p.until) parts.push(`before:${Math.floor(p.until.getTime() / 1000)}`);
  parts.push("-in:sent");
  return parts.join(" ");
}

const OPEN_SYSTEM = `Você é o MAIL CHAT do MAILBOT AI. Responda em português do Brasil, curto e direto, usando SOMENTE os e-mails fornecidos.
Cite as fontes com [n] (n = número do e-mail). Se a resposta não estiver nos e-mails, diga claramente que não encontrou essa informação.
Nunca invente remetentes, valores, datas ou fatos. Você não envia, apaga nem arquiva e-mails: se pedirem, explique que o MAILBOT só lê.
${promptGuard.INJECTION_GUARD}`;
const OPEN_SCHEMA = {
  type: "object", additionalProperties: false, required: ["answer", "cited"],
  properties: { answer: { type: "string" }, cited: { type: "array", items: { type: "integer" } } },
};
const OpenOut = z.object({ answer: z.string(), cited: z.array(z.number()) });

async function searchAndAnswer(userId: number, intent: Intent, question: string, history: { role: "user" | "assistant"; content: string }[], tz: string, now: Date): Promise<ChatAnswer> {
  const p = parseQuery(question, tz, now);
  if (!p.text && !p.from && !p.since) {
    return { answer: 'Me diga o assunto, o remetente ou o período. Ex.: "Encontre o e-mail sobre o contrato da Ana".', refs: [], usedAi: false };
  }
  const acc = await db.selectFrom("gmailAccounts").select("googleEmail").where("userId", "=", userId).where("status", "=", "connected").executeTakeFirst();
  if (!acc) return { answer: "Conecte o Gmail em Configurações para eu pesquisar seus e-mails.", refs: [], usedAi: false };
  let list = await gmailApi.listMessages(acc.googleEmail, { q: toGmailQuery(p), maxResults: 8 });
  if (!list.messages?.length && p.text.includes(" ")) list = await gmailApi.listMessages(acc.googleEmail, { q: toGmailQuery(p, true), maxResults: 8 });
  const ids = (list.messages ?? []).map((m) => m.id);
  if (!ids.length) return { answer: "Não encontrei nenhum e-mail sobre isso na sua conta. Tente outras palavras, o nome do remetente ou um período.", refs: [], usedAi: false };

  if (intent === "chat.search") {
    const meta = await messageMeta(userId, ids);
    const refs: ChatRef[] = [];
    const lines = ids.map((id, i) => {
      const m = meta.get(id);
      refs.push({ gmailId: id, subject: m?.subject ?? "(sem assunto)", from: m ? m.fromName ?? m.fromEmail : "", receivedAt: "" });
      return `[${i + 1}] ${m?.subject ?? "(sem assunto)"} — ${m ? m.fromName ?? m.fromEmail : ""}\n    ${promptGuard.clip(m?.snippet ?? "", 160)}`;
    });
    return { answer: `Encontrei ${ids.length} e-mail(s):\n\n${lines.join("\n")}`, refs, usedAi: false };
  }

  // pergunta aberta: IA com contexto reduzido (até 6 e-mails, corpo truncado)
  const { found } = await gmailApi.getMessages(acc.googleEmail, ids.slice(0, 6), "full");
  const ctx = found.map(emailParse.parseMessage);
  const blocks = ctx.map((e, i) => promptGuard.wrapEmail(String(i + 1), { De: `${e.fromName ?? ""} <${e.fromEmail}>`, Data: e.receivedAt.toISOString(), Assunto: e.subject }, e.bodyText || e.snippet, 1200));
  const convo = history.slice(-4).map((m) => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content.slice(0, 300)}`).join("\n");
  const toRef = (e: (typeof ctx)[number]): ChatRef => ({ gmailId: e.gmailId, subject: e.subject || "(sem assunto)", from: e.fromName ?? e.fromEmail, receivedAt: e.receivedAt.toISOString() });
  try {
    const out = await aiCall({
      agent: "chat", userId, tier: chatTier(question, ctx.length), instructions: OPEN_SYSTEM, maxOutputTokens: 1500,
      input: `${convo ? `Conversa recente:\n${convo}\n\n` : ""}E-mails encontrados:\n${blocks.join("\n\n")}\n\nPergunta do usuário: ${question.slice(0, 1000)}`,
      json: { name: "resposta", schema: OPEN_SCHEMA, zod: OpenOut },
    });
    const cited = [...new Set(out.cited)].filter((n) => n >= 1 && n <= ctx.length);
    return { answer: out.answer.trim(), refs: (cited.length ? cited.map((n) => ctx[n - 1]) : ctx).map(toRef), usedAi: true };
  } catch (e) {
    if (e instanceof BudgetExceeded) {
      return { answer: `Seu limite diário de IA foi atingido. Estes são os e-mails mais relacionados:\n\n${ctx.map((m, i) => `[${i + 1}] ${m.subject} — ${m.fromName ?? m.fromEmail}`).join("\n")}`, refs: ctx.map(toRef), usedAi: false };
    }
    throw e;
  }
}

export async function mailChat(userId: number, intent: Intent, question: string, history: { role: "user" | "assistant"; content: string }[] = [], now = new Date()): Promise<ChatAnswer> {
  const prefs = await userPrefs.get(userId);
  const tz = prefs.timezone;
  const today = localTime.localDate(now, tz);
  const dayStart = localTime.startOfLocalDay(today, tz);
  const weekStart = localTime.startOfLocalDay(localTime.addDays(today, -6), tz);
  switch (intent) {
    case "chat.important_today":
      return listAnswer(userId, "E-mails importantes de hoje:", await mailQueries.triaged(userId, { since: dayStart, priorities: ["urgente", "importante"], limit: 10, orderBy: "score" }), tz, "Nenhum e-mail importante recebido hoje até agora. ✅");
    case "chat.bills":
      return listAnswer(userId, "Cobranças e pagamentos identificados nos últimos 30 dias:", await mailQueries.triaged(userId, { since: localTime.startOfLocalDay(localTime.addDays(today, -30), tz), isBill: true, limit: 10, orderBy: "received" }), tz, "Não encontrei cobranças ou pagamentos nos últimos 30 dias.", (r) => (r.deadline ? `vence ${new Date(r.deadline).toISOString().slice(0, 10)}` : ""));
    case "chat.awaiting_reply":
      return listAnswer(userId, "Estas pessoas estão esperando sua resposta:", await mailQueries.awaitingReply(userId, 10), tz, "Ninguém parece estar aguardando resposta sua. ✅");
    case "chat.appointments":
      return listAnswer(userId, "Compromissos encontrados nos seus e-mails:", await mailQueries.triaged(userId, { since: localTime.startOfLocalDay(localTime.addDays(today, -14), tz), isAppointment: true, limit: 10, orderBy: "received" }), tz, "Não encontrei compromissos nos e-mails das últimas duas semanas.", (r) => (r.appointmentAt ? `quando: ${fmt(r.appointmentAt, tz)}` : ""));
    case "chat.work":
      return listAnswer(userId, "Mensagens de trabalho dos últimos 7 dias:", await mailQueries.triaged(userId, { since: weekStart, categories: ["trabalho"], limit: 10, orderBy: "score" }), tz, "Não encontrei mensagens de trabalho nos últimos 7 dias.");
    case "chat.ignorable":
      return listAnswer(userId, "Você pode ignorar com segurança:", await mailQueries.triaged(userId, { since: weekStart, priorities: ["baixa", "spam"], limit: 15, orderBy: "received" }), tz, "Não há mensagens de baixa prioridade nos últimos 7 dias.", (r) => (r.priority === "spam" ? "⚠️ possivelmente indesejado" : ""));
    default:
      return searchAndAnswer(userId, intent, question, history, tz, now);
  }
}
