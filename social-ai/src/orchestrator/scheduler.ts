import { getDb } from '../db/db.js';
import { getSettings } from '../db/repo.js';
import { dispatchDue, scheduleProject } from '../agents/publisher.js';
import { addDays, timeToMinutes, zonedParts } from '../lib/time.js';
import { logger } from '../lib/logger.js';
import { STAGES } from './handlers.js';
import { enqueue, recoverStale } from './queue.js';

/**
 * Orquestrador central — rotina diária automática:
 * Trend Scout → Strategist → Copywriter → Creative Studio → Validação → Publisher → Analyst (→ Strategist).
 * Cada etapa só é enfileirada no seu horário E depois que a etapa anterior do dia terminou (ou falhou definitivamente).
 */
export function stageStatus(date: string) {
  return STAGES.map((s) => {
    const j = getDb().get(`SELECT id, status, attempts, last_error, updated_at FROM jobs WHERE dedupe_key = ?`, `routine:${s.key}:${date}`);
    return { ...s, time: (getSettings().routine as any)[s.key] as string, job: j ?? null };
  });
}

export function tick(now = new Date()) {
  const s = getSettings();
  const local = zonedParts(now, s.timezone);
  const date = local.date;
  const mins = timeToMinutes(local.time);
  const actions: string[] = [];

  let prevDone = true;
  for (const st of STAGES) {
    const at = (s.routine as any)[st.key] as string;
    const key = `routine:${st.key}:${date}`;
    const existing = getDb().get(`SELECT status FROM jobs WHERE dedupe_key = ?`, key);
    if (!existing && prevDone && mins >= timeToMinutes(at)) {
      if (enqueue({ type: st.type, lane: st.lane, payload: { date }, dedupeKey: key })) actions.push(`enqueue:${st.key}`);
    }
    const status = existing?.status;
    prevDone = status === 'done' || status === 'dead' || status === 'cancelled';
  }

  if (mins >= timeToMinutes(s.routine.metrics)) {
    if (enqueue({ type: 'analyst.nightly', lane: 'analyst', payload: { date }, dedupeKey: `routine:metrics:${date}` })) actions.push('enqueue:metrics');
  }
  if (mins >= timeToMinutes('03:00')) enqueue({ type: 'system.backup', lane: 'system', dedupeKey: `backup:${date}` });

  // Mantém o calendário sempre com ~30 dias à frente.
  const last = getDb().get<{ d: string | null }>(`SELECT MAX(date) d FROM editorial_calendar`).d;
  if (last && last < addDays(date, 7)) {
    const start = addDays(last, 1);
    if (enqueue({ type: 'strategist.calendar', lane: 'strategist', payload: { startDate: start, days: 30 }, dedupeKey: `calendar:${start}` })) actions.push('enqueue:calendar');
  }

  // Sem aprovação humana obrigatória: agenda automaticamente o que passou no QA.
  if (!s.require_human_approval && !s.publishing_paused) {
    const approved = getDb().all(`SELECT id FROM content_projects WHERE status = 'approved'`);
    for (const p of approved) {
      try {
        scheduleProject(p.id);
        actions.push(`schedule:${p.id}`);
      } catch (e: any) {
        logger.warn(`Não foi possível agendar projeto #${p.id}: ${e.message}`);
      }
    }
  }

  const dispatched = dispatchDue(now);
  if (dispatched) actions.push(`publish:${dispatched}`);
  recoverStale(30);
  return actions;
}

export class Scheduler {
  private timer: NodeJS.Timeout | null = null;
  start(intervalMs = 30_000) {
    const run = () => {
      try {
        const a = tick();
        if (a.length) logger.info('Orquestrador', { actions: a });
      } catch (e: any) {
        logger.error(`Falha no orquestrador: ${e.message}`);
      }
    };
    run();
    this.timer = setInterval(run, intervalMs);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
  }
}

/** Execução manual da rotina completa de um dia (botão "Rodar pipeline agora"). */
export function runPipelineNow(date: string) {
  const ids: (number | null)[] = [];
  let prio = 2;
  for (const st of STAGES) {
    ids.push(enqueue({ type: st.type, lane: st.lane, payload: { date }, dedupeKey: `manual:${st.key}:${date}:${Date.now()}`, priority: prio++ }));
  }
  return ids;
}
