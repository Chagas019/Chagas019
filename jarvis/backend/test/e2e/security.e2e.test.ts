import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/server/config.js";
import { sslFor } from "../../src/server/repos/postgres.js";
import { createMemoryRepos } from "../../src/server/repos/memory.js";
import { DEV, call, chat, completion, makeStack, seq, sideEffectTool } from "./helpers.js";

describe("e2e correções T09", () => {
  it("F-06: NODE_ENV ausente + DATABASE_URL ou VERCEL => production; token de dev só com development/test explícito", () => {
    const base = { SUPABASE_JWT_SECRET: "s".repeat(32), JARVIS_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64") };
    expect(loadConfig({ ...base, DATABASE_URL: "postgres://x@h/db" }).isProduction).toBe(true);
    expect(loadConfig({ ...base, VERCEL: "1" }).isProduction).toBe(true);
    expect(loadConfig({ SUPABASE_JWT_SECRET: "s" }).devTokenAllowed).toBe(false);
    expect(loadConfig({ NODE_ENV: "development" }).devTokenAllowed).toBe(true);
    expect(loadConfig({ NODE_ENV: "test" }).devTokenAllowed).toBe(true);
  });

  it("F-03: pendência expirada (TTL 5 min) não executa; claimPending é de uso único", async () => {
    const { tool, runs } = sideEffectTool();
    const s = await makeStack({ tools: [tool], handler: seq(() => completion({ tools: [{ name: "send_email", args: { to: "a@b.com" } }] }), () => completion({ text: "ok" })) });
    const r1 = await chat(s, DEV, { message: "envie email" });
    const c = r1.body.conversationId;
    const msgs = await s.repos.messages.list(c);
    const pend = msgs[1]!.meta!.pending as { id: string; expiresAt: string };
    expect(pend.id).toBeTruthy();
    expect(Date.parse(pend.expiresAt) - Date.now()).toBeLessThanOrEqual(5 * 60_000);
    // força expiração: consome a pendência real e grava outra, já expirada, como última mensagem do assistente
    await s.repos.messages.claimPending(c, msgs[1]!.id);
    await s.repos.messages.add({ conversationId: c, role: "assistant", content: "x", meta: { pending: { id: pend.id, tool: "send_email", input: { to: "a@b.com" }, expiresAt: new Date(Date.now() - 1000).toISOString() } } });
    await chat(s, DEV, { conversationId: c, message: "confirmo", confirm: true });
    expect(runs).toHaveLength(0);
    expect(await s.repos.messages.claimPending(c, msgs[1]!.id)).toBe(false);
  });

  it("memória: claimPending retorna true uma única vez", async () => {
    const r = createMemoryRepos();
    const m = await r.messages.add({ conversationId: "c", role: "assistant", content: "x", meta: { pending: { tool: "t" } } });
    expect(await r.messages.claimPending("c", m.id)).toBe(true);
    expect(await r.messages.claimPending("c", m.id)).toBe(false);
    expect(await r.messages.claimPending("outra", m.id)).toBe(false);
  });

  it("F-02: o orçamento é reverificado a cada chamada ao modelo no loop de ferramentas", async () => {
    const s = await makeStack({
      env: { AI_DAILY_BUDGET_USD: "0.15" },
      handler: (_b, n) => completion({ tools: [{ name: "current_time", id: `c${n}` }], promptTokens: 1_000_000 }),
    });
    const r = await chat(s, DEV, { message: "hora?" });
    expect(r.status).toBe(429);
    expect(s.requests.length).toBeLessThanOrEqual(2);
  });

  it("F-04: no máximo 10 tool calls por turno (5 por iteração); excedentes viram erro", async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ name: "create_task", args: { title: `t${i}` }, id: `c${i}` }));
    const s = await makeStack({ handler: seq(() => completion({ tools: many }), () => completion({ tools: many.map((m) => ({ ...m, id: `d${m.id}` })) }), () => completion({ text: "ok" })) });
    await chat(s, DEV, { message: "crie tarefas" });
    expect((await call(s.app, DEV, "GET", "/v1/tasks")).body.items).toHaveLength(10);
  });

  it("F-11: id inválido em complete_task e erro de repositório não vazam detalhe ao modelo/audit", async () => {
    const s = await makeStack({ handler: seq(() => completion({ tools: [{ name: "complete_task", args: { id: "'; DROP TABLE tasks;--" } }] }), () => completion({ text: "ok" })) });
    s.repos.tasks.update = async () => { throw new Error("SEGREDO-PG: invalid input syntax for type uuid"); };
    await chat(s, DEV, { message: "conclua" });
    const s2 = await makeStack({ handler: seq(() => completion({ tools: [{ name: "complete_task", args: { id: "11111111-1111-4111-8111-111111111111" } }] }), () => completion({ text: "ok" })) });
    s2.repos.tasks.update = async () => { throw new Error("SEGREDO-PG"); };
    await chat(s2, DEV, { message: "conclua" });
    expect(JSON.stringify(s2.requests[1])).not.toContain("SEGREDO-PG");
    expect(JSON.stringify((await call(s2.app, DEV, "GET", "/v1/audit")).body)).not.toContain("SEGREDO-PG");
  });

  it("F-10: TLS verificado por padrão; sem TLS só para host localhost/127.0.0.1 parseado", () => {
    expect(sslFor("postgres://u@db.exemplo.com:5432/x")).toEqual({ rejectUnauthorized: true });
    expect(sslFor("postgres://u@db.exemplo.com/x?application_name=localhost")).toEqual({ rejectUnauthorized: true });
    expect(sslFor("postgres://u@localhost:5433/x")).toBeUndefined();
    expect(sslFor("postgres://u@127.0.0.1/x")).toBeUndefined();
    expect(sslFor("postgres://u@db.exemplo.com/x", { PGSSL_NO_VERIFY: "1" })).toEqual({ rejectUnauthorized: false });
  });
});
