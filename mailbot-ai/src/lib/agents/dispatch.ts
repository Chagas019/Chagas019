import type { Repo } from '../data/repo';
import type { AgentName, EmailRef } from '../data/types';
import type { Llm } from '../ai/llm';
import { runChat } from './chat';
import { route, type Intent } from './orchestrator';
import { buildReport, type ReportContent } from './summary';
import { runTriage } from './triage';

export interface DispatchResult { agent: AgentName; intent: Intent; answer: string; refs: EmailRef[]; usedAi: boolean }

/** Recebe a mensagem do usuário, roteia para UM agente e devolve a resposta com referências. */
export async function dispatch(repo: Repo, llm: Llm | null, userId: string, question: string, history: { role: 'user' | 'assistant'; content: string }[] = []): Promise<DispatchResult> {
  const r = route(question);
  if (r.agent === 'triage') {
    const t = await runTriage(repo, llm, userId, { limit: 40 });
    const answer = t.classified || t.skipped
      ? `Classifiquei ${t.classified} e-mail(s): ${t.byRules} por regras, ${t.byCache} reaproveitados do cache e ${t.byAi} pela IA.${t.budgetExceeded ? ' O limite diário de IA foi atingido; o restante fica para depois.' : ''}`
      : 'Não há e-mails pendentes de classificação. Tudo em dia! ✅';
    return { ...r, answer, refs: [], usedAi: t.byAi > 0 };
  }
  if (r.agent === 'summary') {
    const { report } = await buildReport(repo, llm, userId, { kind: r.intent === 'summary.weekly' ? 'weekly' : 'daily' });
    const c = report.content as ReportContent;
    const refs = [...c.top, ...c.needs_reply, ...c.bills, ...c.appointments]
      .filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i).slice(0, 10)
      .map(({ id, subject, from, received_at }) => ({ id, subject, from, received_at }));
    const period = report.kind === 'daily' ? `do dia ${report.period_start}` : `de ${report.period_start} a ${report.period_end}`;
    return { ...r, answer: `Resumo ${period}:\n\n${report.narrative}`, refs, usedAi: Boolean(report.model) };
  }
  const a = await runChat(repo, llm, userId, r.intent, question, history);
  return { ...r, ...a };
}
