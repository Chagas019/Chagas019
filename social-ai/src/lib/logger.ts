import { getDb } from '../db/db.js';

type Level = 'debug' | 'info' | 'warn' | 'error';
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function threshold(): number {
  return order[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? 20;
}

/** Remove valores com cara de segredo antes de registrar. */
export function redact(data: unknown): unknown {
  if (data == null) return data;
  const s = JSON.stringify(data, (k, v) => {
    if (/token|secret|password|authorization|api_key|apikey/i.test(k)) return '[REDACTED]';
    if (typeof v === 'string') return v.replace(/(access_token=)[^&\s"]+/gi, '$1[REDACTED]');
    return v;
  });
  return s === undefined ? null : JSON.parse(s);
}

export function log(level: Level, message: string, data?: unknown, ctx: { agent?: string; executionId?: number } = {}) {
  if (order[level] < threshold()) return;
  const safe = redact(data);
  const line = { t: new Date().toISOString(), level, agent: ctx.agent, msg: message, data: safe };
  if (process.env.NODE_ENV !== 'test') (level === 'error' ? console.error : console.log)(JSON.stringify(line));
  try {
    getDb().run(
      'INSERT INTO agent_logs (agent_key, execution_id, level, message, data) VALUES (?, ?, ?, ?, ?)',
      ctx.agent ?? null, ctx.executionId ?? null, level, message, safe === undefined ? null : JSON.stringify(safe),
    );
  } catch {
    /* banco indisponível: ainda assim o log foi para stdout */
  }
}

export const logger = {
  debug: (m: string, d?: unknown, c?: { agent?: string; executionId?: number }) => log('debug', m, d, c),
  info: (m: string, d?: unknown, c?: { agent?: string; executionId?: number }) => log('info', m, d, c),
  warn: (m: string, d?: unknown, c?: { agent?: string; executionId?: number }) => log('warn', m, d, c),
  error: (m: string, d?: unknown, c?: { agent?: string; executionId?: number }) => log('error', m, d, c),
};
