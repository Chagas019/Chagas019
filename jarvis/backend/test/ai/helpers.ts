import type { Repos, Message, Memory, JarvisTask, UsageRecord, AuditEvent } from "../../src/core/types.js";
import type { LlmProvider, LlmRequest, LlmResponse } from "../../src/ai/providers/types.js";

let n = 0;
const id = () => `id${++n}`;
const iso = () => new Date().toISOString();

export function memRepos() {
  const memories: Memory[] = [];
  const tasks: JarvisTask[] = [];
  const usage: UsageRecord[] = [];
  const audit: AuditEvent[] = [];
  const messages: Message[] = [];
  const state = { spent: undefined as number | undefined };
  const repos = {
    conversations: {} as Repos["conversations"],
    messages: { add: async (m: any) => { const x = { ...m, id: id(), createdAt: iso() }; messages.push(x); return x; }, list: async () => messages },
    memories: {
      add: async (userId: string, kind: any, content: string) => { const m = { id: id(), userId, kind, content, createdAt: iso() }; memories.push(m); return m; },
      list: async () => memories,
      search: async (_u: string, q: string, limit = 5) => memories.filter((m) => q.toLowerCase().split(/\s+/).some((w) => w.length > 2 && m.content.toLowerCase().includes(w))).slice(0, limit),
      remove: async () => true,
    },
    tasks: {
      add: async (t: any) => { const x = { ...t, id: id(), status: "open", createdAt: iso() }; tasks.push(x); return x; },
      list: async (_u: string, s?: string) => tasks.filter((t) => !s || t.status === s),
      update: async (_u: string, tid: string, p: any) => { const t = tasks.find((x) => x.id === tid); if (!t) return null; Object.assign(t, p); return t; },
    },
    usage: {
      add: async (u: any) => { const x = { ...u, id: id(), createdAt: iso() }; usage.push(x); return x; },
      costSince: async () => state.spent ?? usage.reduce((s, u) => s + u.costUsd, 0),
      summary: async () => [],
    },
    audit: { add: async (e: any) => { const x = { ...e, id: id(), createdAt: iso() }; audit.push(x); return x; }, list: async () => audit },
    devices: {} as Repos["devices"],
    integrations: {} as Repos["integrations"],
  } as Repos;
  return { repos, memories, tasks, usage, audit, state };
}

export function fakeResponse(over: Partial<LlmResponse> = {}): LlmResponse {
  return { text: "ok", toolCalls: [], stopReason: "end_turn", usage: { inputTokens: 1000, outputTokens: 100 }, ...over };
}

/** Provedor fake que responde via script (função por chamada). */
export function fakeProvider(pid: string, script: (req: LlmRequest, call: number) => LlmResponse | Error): LlmProvider & { calls: LlmRequest[] } {
  const calls: LlmRequest[] = [];
  return {
    id: pid,
    calls,
    async chat(req) {
      calls.push(req);
      const r = script(req, calls.length);
      if (r instanceof Error) throw r;
      return r;
    },
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
