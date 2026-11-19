import { getDb, json, nowIso } from '../db/db.js';
import { getSetting } from '../db/repo.js';
import { isRetryable } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

/**
 * Fila de tarefas persistente (SQLite).
 * - Cada job pertence a uma "lane" (normalmente o agente). Só um job por lane executa por vez,
 *   evitando execuções simultâneas conflitantes (ex.: duas publicações ao mesmo tempo).
 * - dedupe_key impede enfileirar a mesma tarefa duas vezes (ex.: rotina do dia).
 * - Falhas transitórias são reagendadas com backoff; falhas permanentes vão para 'dead'.
 */
export interface EnqueueOptions {
  type: string;
  lane: string;
  payload?: unknown;
  runAt?: Date;
  dedupeKey?: string;
  maxAttempts?: number;
  priority?: number;
}

export interface Job { id: number; type: string; lane: string; payload: any; attempts: number; max_attempts: number; dedupe_key: string | null }

export function enqueue(o: EnqueueOptions): number | null {
  const r = getDb().run(
    `INSERT INTO jobs (type, lane, payload, run_at, dedupe_key, max_attempts, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(dedupe_key) DO NOTHING`,
    o.type, o.lane, JSON.stringify(o.payload ?? {}), (o.runAt ?? new Date()).toISOString(), o.dedupeKey ?? null,
    o.maxAttempts ?? getSetting('retries').max_attempts, o.priority ?? 5,
  );
  return r.changes ? r.lastId : null;
}

export function claimNext(workerId: string, now = new Date()): Job | null {
  const db = getDb();
  return db.tx(() => {
    const row = db.get(
      `SELECT * FROM jobs j WHERE j.status = 'queued' AND j.run_at <= ?
         AND NOT EXISTS (SELECT 1 FROM jobs r WHERE r.status = 'running' AND r.lane = j.lane)
       ORDER BY j.priority ASC, j.run_at ASC, j.id ASC LIMIT 1`,
      now.toISOString(),
    );
    if (!row) return null;
    db.run(`UPDATE jobs SET status='running', locked_by=?, locked_at=?, attempts=attempts+1, updated_at=? WHERE id=?`, workerId, nowIso(), nowIso(), row.id);
    return { id: row.id, type: row.type, lane: row.lane, payload: json.parse(row.payload, {}), attempts: row.attempts + 1, max_attempts: row.max_attempts, dedupe_key: row.dedupe_key };
  });
}

export function completeJob(id: number, result: unknown) {
  getDb().run(`UPDATE jobs SET status='done', result=?, locked_by=NULL, last_error=NULL, updated_at=? WHERE id=?`, JSON.stringify(result ?? null), nowIso(), id);
}

export function failJob(job: Job, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const retry = isRetryable(err) && job.attempts < job.max_attempts;
  const backoff = getSetting('retries').backoff_minutes;
  const minutes = backoff[Math.min(job.attempts - 1, backoff.length - 1)] ?? 5;
  if (retry) {
    getDb().run(
      `UPDATE jobs SET status='queued', run_at=?, last_error=?, locked_by=NULL, updated_at=? WHERE id=?`,
      new Date(Date.now() + minutes * 60_000).toISOString(), msg, nowIso(), job.id,
    );
    logger.warn(`Job ${job.type}#${job.id} falhou (tentativa ${job.attempts}/${job.max_attempts}); nova tentativa em ${minutes} min`, { error: msg });
  } else {
    getDb().run(`UPDATE jobs SET status='dead', last_error=?, locked_by=NULL, updated_at=? WHERE id=?`, msg, nowIso(), job.id);
    logger.error(`Job ${job.type}#${job.id} falhou definitivamente`, { error: msg });
  }
  return retry;
}

/** Recupera jobs presos (ex.: processo reiniciado no meio da execução). */
export function recoverStale(maxMinutes = 30) {
  const cutoff = new Date(Date.now() - maxMinutes * 60_000).toISOString();
  return getDb().run(`UPDATE jobs SET status='queued', locked_by=NULL, updated_at=? WHERE status='running' AND locked_at < ?`, nowIso(), cutoff).changes;
}

export function cancelJobs(where: { lane?: string; type?: string }) {
  const conds = [`status = 'queued'`];
  const params: string[] = [];
  if (where.lane) (conds.push('lane = ?'), params.push(where.lane));
  if (where.type) (conds.push('type = ?'), params.push(where.type));
  return getDb().run(`UPDATE jobs SET status='cancelled', updated_at=datetime('now') WHERE ${conds.join(' AND ')}`, ...params).changes;
}
