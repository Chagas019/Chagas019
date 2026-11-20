import pg from "pg";
import { SUPABASE_ROOT_CA_2021 } from "./supabaseCa.js";
import type {
  AuditEvent, Conversation, Device, IntegrationToken, JarvisTask, Memory, MemoryKind, Message, Repos, UsageRecord,
} from "../../core/types.js";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());
const lim = (n: number | undefined, d: number) => Math.max(1, Math.min(n ?? d, 500));

const conv = (r: Row): Conversation => ({ id: r.id, userId: r.user_id, title: r.title, createdAt: iso(r.created_at), updatedAt: iso(r.updated_at) });
const msg = (r: Row): Message => ({
  id: r.id, conversationId: r.conversation_id, role: r.role, content: r.content, createdAt: iso(r.created_at),
  ...(r.meta ? { meta: r.meta } : {}),
});
const mem = (r: Row): Memory => ({ id: r.id, userId: r.user_id, kind: r.kind, content: r.content, createdAt: iso(r.created_at) });
const task = (r: Row): JarvisTask => ({
  id: r.id, userId: r.user_id, title: r.title,
  ...(r.notes != null ? { notes: r.notes } : {}),
  ...(r.due_at != null ? { dueAt: iso(r.due_at) } : {}),
  status: r.status, createdAt: iso(r.created_at),
});
const usageRow = (r: Row): UsageRecord => ({
  id: r.id, userId: r.user_id, provider: r.provider, model: r.model,
  inputTokens: Number(r.input_tokens), outputTokens: Number(r.output_tokens), costUsd: Number(r.cost_usd), createdAt: iso(r.created_at),
});
const auditRow = (r: Row): AuditEvent => ({
  id: r.id, userId: r.user_id, actor: r.actor, action: r.action, status: r.status,
  ...(r.detail ? { detail: r.detail } : {}), createdAt: iso(r.created_at),
});
const dev = (r: Row): Device => ({ userId: r.user_id, apnsToken: r.apns_token, platform: r.platform, createdAt: iso(r.created_at) });

/**
 * TLS do banco: verificação de certificado ligada por padrão. Sem TLS apenas para host localhost/127.0.0.1
 * (hostname parseado da URL, não regex na string). Escape documentado: PGSSL_NO_VERIFY=1 (aceita qualquer certificado).
 */
export function sslFor(url: string, env: NodeJS.ProcessEnv = process.env): pg.PoolConfig["ssl"] {
  let host = "";
  try { host = new URL(url).hostname.toLowerCase(); } catch { /* URL inválida: trata como remoto (TLS verificado) */ }
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1") return undefined;
  if (env.PGSSL_NO_VERIFY === "1") return { rejectUnauthorized: false };
  // Supabase assina o Postgres/pooler com CA própria: confia somente nela (além de DATABASE_CA, se definido).
  if (env.DATABASE_CA) return { rejectUnauthorized: true, ca: env.DATABASE_CA };
  if (host.endsWith(".supabase.com") || host.endsWith(".supabase.co")) return { rejectUnauthorized: true, ca: SUPABASE_ROOT_CA_2021 };
  return { rejectUnauthorized: true };
}

/**
 * Repos Postgres (Supabase, conexão de serviço). SQL sempre parametrizado e filtrado por user_id.
 * Exceção: messages.list/touch operam por conversation_id — o chamador (rotas) valida a posse da conversa antes.
 */
export function createPostgresRepos(poolOrUrl: pg.Pool | string, opts: { schema?: string } = {}): Repos & { pool: pg.Pool; close(): Promise<void> } {
  const pool = typeof poolOrUrl === "string"
    ? new pg.Pool({ connectionString: poolOrUrl, max: 5, ssl: sslFor(poolOrUrl) })
    : poolOrUrl;
  // Schema dedicado (ex.: "jarvis") num banco compartilhado. Exige conexão direta ou pooler em modo sessão
  // (porta 5432); no modo transação (6543) o SET não é garantido entre consultas.
  const schema = opts.schema ?? "public";
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) throw new Error("schema inválido");
  if (schema !== "public") pool.on("connect", (c) => { void c.query(`set search_path to ${schema}, public`); });
  const q = async (text: string, params: unknown[] = []): Promise<Row[]> => (await pool.query(text, params)).rows;

  return {
    pool,
    close: () => pool.end(),
    conversations: {
      async create(userId, title) {
        return conv((await q(`INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING *`, [userId, title]))[0]!);
      },
      async get(userId, id) {
        const r = await q(`SELECT * FROM conversations WHERE user_id = $1 AND id = $2`, [userId, id]);
        return r[0] ? conv(r[0]) : null;
      },
      async list(userId, limit) {
        return (await q(`SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2`, [userId, lim(limit, 50)])).map(conv);
      },
      async touch(id) {
        await q(`UPDATE conversations SET updated_at = now() WHERE id = $1`, [id]);
      },
    },
    messages: {
      async add(m) {
        const r = await q(
          `INSERT INTO messages (conversation_id, role, content, meta) VALUES ($1, $2, $3, $4) RETURNING *`,
          [m.conversationId, m.role, m.content, m.meta ? JSON.stringify(m.meta) : null],
        );
        return msg(r[0]!);
      },
      async list(conversationId, limit) {
        const r = await q(
          `SELECT * FROM (SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2) t ORDER BY created_at ASC, id ASC`,
          [conversationId, lim(limit, 100)],
        );
        return r.map(msg);
      },
      async claimPending(conversationId, messageId) {
        const r = await pool.query(
          `UPDATE messages SET meta = meta - 'pending' WHERE id = $1 AND conversation_id = $2 AND meta ? 'pending' RETURNING id`,
          [messageId, conversationId],
        );
        return (r.rowCount ?? 0) > 0;
      },
    },
    memories: {
      async add(userId, kind: MemoryKind, content) {
        return mem((await q(`INSERT INTO memories (user_id, kind, content) VALUES ($1, $2, $3) RETURNING *`, [userId, kind, content]))[0]!);
      },
      async list(userId, limit) {
        return (await q(`SELECT * FROM memories WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, lim(limit, 50)])).map(mem);
      },
      async search(userId, query, limit) {
        return (await q(
          `SELECT * FROM memories WHERE user_id = $1
             AND (to_tsvector('portuguese', content) @@ plainto_tsquery('portuguese', $2)
                  OR strpos(lower(content), lower($2)) > 0)
           ORDER BY ts_rank(to_tsvector('portuguese', content), plainto_tsquery('portuguese', $2)) DESC, created_at DESC
           LIMIT $3`,
          [userId, query, lim(limit, 50)],
        )).map(mem);
      },
      async remove(userId, id) {
        const r = await pool.query(`DELETE FROM memories WHERE user_id = $1 AND id = $2`, [userId, id]);
        return (r.rowCount ?? 0) > 0;
      },
    },
    tasks: {
      async add(t) {
        return task((await q(
          `INSERT INTO tasks (user_id, title, notes, due_at) VALUES ($1, $2, $3, $4) RETURNING *`,
          [t.userId, t.title, t.notes ?? null, t.dueAt ?? null],
        ))[0]!);
      },
      async list(userId, status) {
        return (await q(
          `SELECT * FROM tasks WHERE user_id = $1 AND ($2::text IS NULL OR status = $2) ORDER BY created_at DESC`,
          [userId, status ?? null],
        )).map(task);
      },
      async update(userId, id, patch) {
        const cols: Record<string, string> = { title: "title", notes: "notes", dueAt: "due_at", status: "status" };
        const sets: string[] = [];
        const params: unknown[] = [userId, id];
        for (const [k, col] of Object.entries(cols)) {
          const v = (patch as Record<string, unknown>)[k];
          if (v !== undefined) { params.push(v); sets.push(`${col} = $${params.length}`); }
        }
        if (!sets.length) {
          const r = await q(`SELECT * FROM tasks WHERE user_id = $1 AND id = $2`, [userId, id]);
          return r[0] ? task(r[0]) : null;
        }
        const r = await q(`UPDATE tasks SET ${sets.join(", ")} WHERE user_id = $1 AND id = $2 RETURNING *`, params);
        return r[0] ? task(r[0]) : null;
      },
    },
    usage: {
      async add(u) {
        return usageRow((await q(
          `INSERT INTO usage_records (user_id, provider, model, input_tokens, output_tokens, cost_usd) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [u.userId, u.provider, u.model, u.inputTokens, u.outputTokens, u.costUsd],
        ))[0]!);
      },
      async costSince(userId, sinceIso) {
        const r = await q(`SELECT COALESCE(SUM(cost_usd), 0) AS c FROM usage_records WHERE user_id = $1 AND created_at >= $2`, [userId, sinceIso]);
        return Number(r[0]!.c);
      },
      async summary(userId, sinceIso) {
        const r = await q(
          `SELECT provider, model, COUNT(*) AS calls, COALESCE(SUM(input_tokens),0) AS i, COALESCE(SUM(output_tokens),0) AS o, COALESCE(SUM(cost_usd),0) AS c
             FROM usage_records WHERE user_id = $1 AND created_at >= $2 GROUP BY provider, model ORDER BY c DESC`,
          [userId, sinceIso],
        );
        return r.map((x) => ({ provider: x.provider, model: x.model, calls: Number(x.calls), inputTokens: Number(x.i), outputTokens: Number(x.o), costUsd: Number(x.c) }));
      },
    },
    audit: {
      async add(e) {
        return auditRow((await q(
          `INSERT INTO audit_events (user_id, actor, action, status, detail) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [e.userId, e.actor, e.action, e.status, e.detail ? JSON.stringify(e.detail) : null],
        ))[0]!);
      },
      async list(userId, limit) {
        return (await q(`SELECT * FROM audit_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, lim(limit, 50)])).map(auditRow);
      },
    },
    devices: {
      async upsert(d) {
        return dev((await q(
          `INSERT INTO devices (user_id, apns_token, platform) VALUES ($1,$2,$3)
           ON CONFLICT (user_id, apns_token) DO UPDATE SET platform = EXCLUDED.platform RETURNING *`,
          [d.userId, d.apnsToken, d.platform],
        ))[0]!);
      },
      async list(userId) {
        return (await q(`SELECT * FROM devices WHERE user_id = $1 ORDER BY created_at DESC`, [userId])).map(dev);
      },
    },
    integrations: {
      async get(userId, provider) {
        const r = (await q(`SELECT * FROM integration_tokens WHERE user_id = $1 AND provider = $2`, [userId, provider]))[0];
        return r ? ({ userId: r.user_id, provider: r.provider, encrypted: r.encrypted, scopes: r.scopes ?? [], updatedAt: iso(r.updated_at) } as IntegrationToken) : null;
      },
      async put(t) {
        await q(
          `INSERT INTO integration_tokens (user_id, provider, encrypted, scopes, updated_at) VALUES ($1,$2,$3,$4, now())
           ON CONFLICT (user_id, provider) DO UPDATE SET encrypted = EXCLUDED.encrypted, scopes = EXCLUDED.scopes, updated_at = now()`,
          [t.userId, t.provider, t.encrypted, t.scopes],
        );
      },
      async remove(userId, provider) {
        await q(`DELETE FROM integration_tokens WHERE user_id = $1 AND provider = $2`, [userId, provider]);
      },
    },
  };
}
