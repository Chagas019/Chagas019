import { randomUUID } from "node:crypto";
import type {
  AuditEvent, Conversation, Device, IntegrationToken, JarvisTask, Memory, Message, Repos, UsageRecord,
} from "../../core/types.js";

const now = () => new Date().toISOString();
const lim = (n: number | undefined, d: number) => Math.max(1, Math.min(n ?? d, 500));

/** Repos em memória (testes/dev). Dados somem ao reiniciar. */
export function createMemoryRepos(): Repos {
  const conversations: Conversation[] = [];
  const messages: Message[] = [];
  const memories: Memory[] = [];
  const tasks: JarvisTask[] = [];
  const usage: UsageRecord[] = [];
  const audit: AuditEvent[] = [];
  const devices: Device[] = [];
  const integrations: IntegrationToken[] = [];
  // Garante ordem estável mesmo com timestamps iguais.
  let seq = 0;
  const order = new WeakMap<object, number>();
  const stamp = <T extends object>(o: T): T => { order.set(o, seq++); return o; };
  const recent = <T extends { createdAt: string }>(a: T, b: T) =>
    b.createdAt.localeCompare(a.createdAt) || (order.get(b) ?? 0) - (order.get(a) ?? 0);

  return {
    conversations: {
      async create(userId, title) {
        const t = now();
        const c = stamp({ id: randomUUID(), userId, title, createdAt: t, updatedAt: t });
        conversations.push(c);
        return { ...c };
      },
      async get(userId, id) {
        const c = conversations.find((x) => x.id === id && x.userId === userId);
        return c ? { ...c } : null;
      },
      async list(userId, limit) {
        return conversations
          .filter((c) => c.userId === userId)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || (order.get(b) ?? 0) - (order.get(a) ?? 0))
          .slice(0, lim(limit, 50))
          .map((c) => ({ ...c }));
      },
      async touch(id) {
        const c = conversations.find((x) => x.id === id);
        if (c) c.updatedAt = now();
      },
    },
    messages: {
      async add(m) {
        const msg = stamp({ ...m, id: randomUUID(), createdAt: now() }) as Message;
        messages.push(msg);
        return { ...msg };
      },
      /** Últimas `limit` mensagens, em ordem cronológica. */
      async list(conversationId, limit) {
        const all = messages.filter((m) => m.conversationId === conversationId);
        return all.slice(-lim(limit, 100)).map((m) => ({ ...m }));
      },
    },
    memories: {
      async add(userId, kind, content) {
        const m = stamp({ id: randomUUID(), userId, kind, content, createdAt: now() });
        memories.push(m);
        return { ...m };
      },
      async list(userId, limit) {
        return memories.filter((m) => m.userId === userId).sort(recent).slice(0, lim(limit, 50)).map((m) => ({ ...m }));
      },
      async search(userId, query, limit) {
        const q = query.toLowerCase();
        return memories
          .filter((m) => m.userId === userId && m.content.toLowerCase().includes(q))
          .sort(recent).slice(0, lim(limit, 50)).map((m) => ({ ...m }));
      },
      async remove(userId, id) {
        const i = memories.findIndex((m) => m.id === id && m.userId === userId);
        if (i < 0) return false;
        memories.splice(i, 1);
        return true;
      },
    },
    tasks: {
      async add(t) {
        const task: JarvisTask = stamp({ ...t, id: randomUUID(), status: "open" as const, createdAt: now() });
        tasks.push(task);
        return { ...task };
      },
      async list(userId, status) {
        return tasks.filter((t) => t.userId === userId && (!status || t.status === status)).sort(recent).map((t) => ({ ...t }));
      },
      async update(userId, id, patch) {
        const t = tasks.find((x) => x.id === id && x.userId === userId);
        if (!t) return null;
        for (const [k, v] of Object.entries(patch)) if (v !== undefined) (t as unknown as Record<string, unknown>)[k] = v;
        return { ...t };
      },
    },
    usage: {
      async add(u) {
        const r = stamp({ ...u, id: randomUUID(), createdAt: now() });
        usage.push(r);
        return { ...r };
      },
      async costSince(userId, sinceIso) {
        return usage.filter((u) => u.userId === userId && u.createdAt >= sinceIso).reduce((s, u) => s + u.costUsd, 0);
      },
      async summary(userId, sinceIso) {
        const map = new Map<string, { provider: string; model: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }>();
        for (const u of usage.filter((x) => x.userId === userId && x.createdAt >= sinceIso)) {
          const k = `${u.provider}\u0000${u.model}`;
          const e = map.get(k) ?? { provider: u.provider, model: u.model, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
          e.calls++; e.inputTokens += u.inputTokens; e.outputTokens += u.outputTokens; e.costUsd += u.costUsd;
          map.set(k, e);
        }
        return [...map.values()];
      },
    },
    audit: {
      async add(e) {
        const ev = stamp({ ...e, id: randomUUID(), createdAt: now() });
        audit.push(ev);
        return { ...ev };
      },
      async list(userId, limit) {
        return audit.filter((a) => a.userId === userId).sort(recent).slice(0, lim(limit, 50)).map((a) => ({ ...a }));
      },
    },
    devices: {
      async upsert(d) {
        const ex = devices.find((x) => x.userId === d.userId && x.apnsToken === d.apnsToken);
        if (ex) { ex.platform = d.platform; return { ...ex }; }
        const dev: Device = { ...d, createdAt: now() };
        devices.push(dev);
        return { ...dev };
      },
      async list(userId) {
        return devices.filter((d) => d.userId === userId).map((d) => ({ ...d }));
      },
    },
    integrations: {
      async get(userId, provider) {
        const t = integrations.find((x) => x.userId === userId && x.provider === provider);
        return t ? { ...t, scopes: [...t.scopes] } : null;
      },
      async put(t) {
        const i = integrations.findIndex((x) => x.userId === t.userId && x.provider === t.provider);
        const rec = { ...t, scopes: [...t.scopes], updatedAt: now() };
        if (i >= 0) integrations[i] = rec; else integrations.push(rec);
      },
      async remove(userId, provider) {
        const i = integrations.findIndex((x) => x.userId === userId && x.provider === provider);
        if (i >= 0) integrations.splice(i, 1);
      },
    },
  };
}
