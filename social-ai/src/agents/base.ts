import { getDb, json, nowIso } from '../db/db.js';
import { logger } from '../lib/logger.js';
import type { AgentKey } from './definitions.js';

export interface AgentContext {
  agent: AgentKey;
  executionId: number;
  jobId?: number;
  log: (level: 'info' | 'warn' | 'error' | 'debug', msg: string, data?: unknown) => void;
  addUsage: (u: { input: number; output: number }) => void;
  memory: { get: <T = any>(k: string, fallback: T) => T; set: (k: string, v: unknown) => void };
  instructions: string;
}

export function agentRow(key: AgentKey) {
  return getDb().get('SELECT * FROM agents WHERE key = ?', key)!;
}

export function getMemory(key: AgentKey): Record<string, any> {
  return json.parse(agentRow(key).memory, {});
}

export function setMemory(key: AgentKey, k: string, v: unknown) {
  const mem = getMemory(key);
  mem[k] = v;
  getDb().run(`UPDATE agents SET memory=?, updated_at=datetime('now') WHERE key=?`, JSON.stringify(mem), key);
}

/** Executa uma unidade de trabalho de um agente com histórico, status, logs e tratamento de erros. */
export async function runAgent<T>(key: AgentKey, input: unknown, fn: (ctx: AgentContext) => Promise<T>, jobId?: number): Promise<T> {
  const db = getDb();
  const row = agentRow(key);
  if (!row.enabled) throw new Error(`Agente ${row.name} está desativado`);
  const exec = db.run(`INSERT INTO agent_executions (agent_key, job_id, status, input) VALUES (?, ?, 'running', ?)`, key, jobId ?? null, JSON.stringify(input ?? null));
  const started = Date.now();
  db.run(`UPDATE agents SET status='running', last_run_at=?, updated_at=datetime('now') WHERE key=?`, nowIso(), key);
  let tokensIn = 0;
  let tokensOut = 0;
  const ctx: AgentContext = {
    agent: key,
    executionId: exec.lastId,
    jobId,
    instructions: row.instructions,
    log: (level, msg, data) => logger[level](msg, data, { agent: key, executionId: exec.lastId }),
    addUsage: (u) => {
      tokensIn += u.input;
      tokensOut += u.output;
    },
    memory: {
      get: (k, fb) => (getMemory(key)[k] ?? fb),
      set: (k, v) => setMemory(key, k, v),
    },
  };
  ctx.log('info', `${row.name}: execução iniciada`);
  try {
    const out = await fn(ctx);
    db.run(
      `UPDATE agent_executions SET status='success', output=?, finished_at=?, duration_ms=?, tokens_in=?, tokens_out=? WHERE id=?`,
      JSON.stringify(out ?? null).slice(0, 200_000), nowIso(), Date.now() - started, tokensIn, tokensOut, exec.lastId,
    );
    db.run(`UPDATE agents SET status='idle', last_error=NULL WHERE key=?`, key);
    ctx.log('info', `${row.name}: execução concluída`, { ms: Date.now() - started });
    return out;
  } catch (e: any) {
    db.run(
      `UPDATE agent_executions SET status='error', error=?, finished_at=?, duration_ms=?, tokens_in=?, tokens_out=? WHERE id=?`,
      String(e?.message ?? e), nowIso(), Date.now() - started, tokensIn, tokensOut, exec.lastId,
    );
    db.run(`UPDATE agents SET status='error', last_error=? WHERE key=?`, String(e?.message ?? e), key);
    ctx.log('error', `${row.name}: falha — ${e?.message ?? e}`);
    throw e;
  }
}
