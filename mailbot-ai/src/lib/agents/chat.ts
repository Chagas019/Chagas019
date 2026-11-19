import { z } from 'zod';
import type { Repo } from '../data/repo';
import type { EmailRef, TriagedEmail } from '../data/types';
import { BudgetExceededError, type Llm } from '../ai/llm';
import { chatTier, modelFor } from '../ai/models';
import { INJECTION_GUARD, wrapEmail } from '../ai/sanitize';
import { normalize, type Intent } from './orchestrator';
import { addDays, localDate, startOfLocalDay } from './time';

// AGENTE 03 — MAIL CHAT
// Responde perguntas consultando mensagens reais, classificações (MAIL TRIAGE) e
// relatórios (MAIL SUMMARY). Perguntas cobertas por consulta SQL são respondidas sem IA.
// Sem resultados -> responde que não encontrou (nunca inventa).

export interface ChatAnswer { answer: string; refs: EmailRef[]; usedAi: boolean }

const fmtDate = (iso: string, tz: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: tz, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

function ref(e: { id: string; subject: string; from_name: string | null; from_email: string; received_at: string }): EmailRef {
  return { id: e.id, subject: e.subject || '(sem assunto)', from: e.from_name || e.from_email, received_at: e.received_at };
}

function listAnswer(title: string, items: TriagedEmail[], tz: string, empty: string, extra?: (e: TriagedEmail) => string): ChatAnswer {
  if (!items.length) return { answer: empty, refs: [], usedAi: false };
  const lines = items.map((e, i) => {
    const more = extra?.(e);
    return `[${i + 1}] ${e.summary.summary} — ${e.from_name || e.from_email}, ${fmtDate(e.received_at, tz)}${more ? ` · ${more}` : ''}\n    → ${e.summary.recommended_action}`;
  });
  return { answer: `${title}\n\n${lines.join('\n')}`, refs: items.map(ref), usedAi: false };
}

// ------------------------------------------------------------------ filtros determinísticos
export interface ParsedQuery { text: string; from?: string; since?: string; until?: string }

const STOP = new Set(('o a os as um uma de do da dos das e em no na nos nas para por com sobre que qual quais meu minha meus minhas ' +
  'email emails e-mail e-mails mensagem mensagens encontre encontrar ache achar procure procurar busque buscar localize mostre mostrar ' +
  'me eu tem existe algum alguma onde esta foi recebi enviou mandou falando fala diz disse sobre assunto hoje ontem semana mes passada ultimos ultimas dias').split(' '));

export function parseQuery(question: string, tz: string, now = new Date()): ParsedQuery {
  let q = normalize(question).replace(/[?!.,;:"']/g, ' ');
  const today = localDate(now, tz);
  const out: ParsedQuery = { text: '' };
  const range = (startDate: string, endDate = today) => { out.since = startOfLocalDay(startDate, tz); out.until = startOfLocalDay(addDays(endDate, 1), tz); };
  if (/\bhoje\b/.test(q)) range(today);
  else if (/\bontem\b/.test(q)) range(addDays(today, -1), addDays(today, -1));
  else if (/\bultim[oa]s? (\d+) dias\b/.test(q)) range(addDays(today, -Number(q.match(/\bultim[oa]s? (\d+) dias\b/)![1]) + 1));
  else if (/\b(essa|esta|nessa|nesta|ultima) semana\b|\bsemana passada\b/.test(q)) range(addDays(today, /passada/.test(q) ? -13 : -6), /passada/.test(q) ? addDays(today, -7) : today);
  else if (/\b(esse|este|ultimo) mes\b/.test(q)) range(addDays(today, -29));
  const fromMatch = q.match(/\b(?:de|do|da|enviad[oa] por|mandad[oa] por)\s+([\w.@+-]{3,})/);
  if (fromMatch && !STOP.has(fromMatch[1])) {
    out.from = fromMatch[1];
    q = q.replace(fromMatch[0], ' ');
  }
  out.text = q.split(' ').filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)).slice(0, 8).join(' ');
  return out;
}

const OPEN_SYSTEM = `Você é o MAIL CHAT do MAILBOT AI. Responda em português do Brasil, de forma curta e direta,
usando SOMENTE os e-mails fornecidos. Cite as fontes com [n] (n = número do e-mail). Se a resposta não estiver nos e-mails,
diga claramente que não encontrou essa informação. Nunca invente remetentes, valores, datas ou fatos.
Você não envia, apaga nem responde e-mails: se o usuário pedir, explique que nesta versão o acesso é somente leitura.

${INJECTION_GUARD}`;

const OpenOutput = z.object({ answer: z.string(), cited: z.array(z.number().int()) });

export async function runChat(repo: Repo, llm: Llm | null, userId: string, intent: Intent, question: string, history: { role: 'user' | 'assistant'; content: string }[] = [], now = new Date()): Promise<ChatAnswer> {
  const prefs = await repo.getPrefs(userId);
  const tz = prefs.timezone;
  const today = localDate(now, tz);
  const dayStart = startOfLocalDay(today, tz);
  const weekStart = startOfLocalDay(addDays(today, -6), tz);

  switch (intent) {
    case 'chat.important_today': {
      const items = await repo.queryTriaged(userId, { since: dayStart, priorities: ['urgente', 'importante'], limit: 10, orderBy: 'score' });
      return listAnswer(`E-mails importantes de hoje (${items.length}):`, items, tz, 'Nenhum e-mail importante recebido hoje até agora. ✅');
    }
    case 'chat.bills': {
      const items = await repo.queryTriaged(userId, { since: startOfLocalDay(addDays(today, -30), tz), isBill: true, limit: 10, orderBy: 'received' });
      return listAnswer('Cobranças e pagamentos identificados nos últimos 30 dias:', items, tz, 'Não encontrei cobranças ou pagamentos nos últimos 30 dias.',
        (e) => [e.summary.bill_amount && `valor ${e.summary.bill_amount}`, e.summary.deadline && `vence ${e.summary.deadline}`].filter(Boolean).join(', '));
    }
    case 'chat.awaiting_reply': {
      const items = await repo.awaitingReply(userId, 10);
      return listAnswer('Estas pessoas estão esperando sua resposta:', items, tz, 'Ninguém parece estar aguardando resposta sua. ✅');
    }
    case 'chat.appointments': {
      const items = await repo.queryTriaged(userId, { since: startOfLocalDay(addDays(today, -14), tz), isAppointment: true, limit: 10, orderBy: 'received' });
      return listAnswer('Compromissos encontrados nos seus e-mails:', items, tz, 'Não encontrei compromissos nos e-mails das últimas duas semanas.',
        (e) => (e.summary.appointment_at ? `quando: ${fmtDate(e.summary.appointment_at, tz)}` : ''));
    }
    case 'chat.work': {
      const items = await repo.queryTriaged(userId, { since: weekStart, categories: ['trabalho'], limit: 10, orderBy: 'score' });
      return listAnswer('Mensagens de trabalho dos últimos 7 dias:', items, tz, 'Não encontrei mensagens de trabalho nos últimos 7 dias.');
    }
    case 'chat.ignorable': {
      const items = await repo.queryTriaged(userId, { since: weekStart, priorities: ['baixa', 'spam'], limit: 15, orderBy: 'received' });
      return listAnswer(`Você pode ignorar com segurança (${items.length}):`, items, tz, 'Não há mensagens de baixa prioridade nos últimos 7 dias.',
        (e) => (e.summary.priority === 'spam' ? '⚠️ possivelmente indesejado' : ''));
    }
    case 'chat.search':
    case 'chat.open':
      return searchAndAnswer(repo, llm, userId, intent, question, history, tz, now);
    default:
      return { answer: 'Não entendi o pedido.', refs: [], usedAi: false };
  }
}

async function searchAndAnswer(repo: Repo, llm: Llm | null, userId: string, intent: Intent, question: string, history: { role: 'user' | 'assistant'; content: string }[], tz: string, now: Date): Promise<ChatAnswer> {
  const pq = parseQuery(question, tz, now);
  if (!pq.text && !pq.from && !pq.since) {
    return { answer: 'Pode me dizer o assunto, remetente ou período que você procura? Ex.: "Encontre o e-mail sobre contrato da Ana".', refs: [], usedAi: false };
  }
  let found = await repo.searchEmails(userId, { text: pq.text || undefined, from: pq.from, since: pq.since, until: pq.until, limit: 8 });
  // relaxa: se a busca exata não retornou, tenta qualquer termo
  if (!found.length && pq.text.includes(' ')) {
    found = await repo.searchEmails(userId, { text: pq.text.split(' ').join(' or '), from: pq.from, since: pq.since, until: pq.until, limit: 8 });
  }
  if (!found.length) {
    return { answer: 'Não encontrei nenhum e-mail sincronizado sobre isso. Tente outras palavras, o nome do remetente ou um período.', refs: [], usedAi: false };
  }

  if (intent === 'chat.search' || !llm) {
    const lines = found.map((e, i) => `[${i + 1}] ${e.subject || '(sem assunto)'} — ${e.from_name || e.from_email}, ${fmtDate(e.received_at, tz)}\n    ${e.summary?.summary ?? e.snippet.slice(0, 160)}`);
    return { answer: `Encontrei ${found.length} e-mail(s):\n\n${lines.join('\n')}`, refs: found.map(ref), usedAi: false };
  }

  // pergunta aberta: IA com contexto reduzido (top 6, corpo truncado)
  const ctx = found.slice(0, 6);
  const blocks = ctx.map((e, i) => wrapEmail(String(i + 1), {
    De: `${e.from_name ?? ''} <${e.from_email}>`, Data: e.received_at, Assunto: e.subject,
    ...(e.summary ? { 'Classificação': `${e.summary.priority}/${e.summary.category}` } : {}),
  }, e.body_text || e.snippet, 1200));
  const convo = history.slice(-4).map((m) => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content.slice(0, 300)}`).join('\n');
  try {
    const out = await llm.run<z.infer<typeof OpenOutput>>({
      agent: 'chat', userId, model: modelFor(chatTier(question, ctx.length)), system: OPEN_SYSTEM,
      maxTokens: 3000, effort: 'low', schema: OpenOutput,
      user: `${convo ? `Conversa recente:\n${convo}\n\n` : ''}E-mails encontrados:\n${blocks.join('\n\n')}\n\nPergunta do usuário: ${question.slice(0, 1000)}`,
    });
    const cited = [...new Set(out.cited)].filter((n) => n >= 1 && n <= ctx.length);
    const refs = (cited.length ? cited.map((n) => ctx[n - 1]) : ctx).map(ref);
    return { answer: out.answer.trim(), refs, usedAi: true };
  } catch (e) {
    if (e instanceof BudgetExceededError) {
      const lines = ctx.map((m, i) => `[${i + 1}] ${m.subject} — ${m.from_name || m.from_email}`);
      return { answer: `Seu limite diário de IA foi atingido. Estes são os e-mails mais relacionados:\n\n${lines.join('\n')}`, refs: ctx.map(ref), usedAi: false };
    }
    throw e;
  }
}
