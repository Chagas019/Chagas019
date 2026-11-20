import { describe, expect, it } from "vitest";
import { BudgetExceededError, ProvidersFailedError } from "../../src/core/types.js";
import { bearer, fakeOrchestrator, jwt, makeApp } from "./helpers.js";

describe("rotas", () => {
  it("/health sem auth", async () => {
    const { app } = await makeApp();
    const r = await app.inject("/health");
    expect(r.json()).toMatchObject({ ok: true, providers: ["fake"], db: "memory" });
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
  });
  it("401 sem token / token inválido; formato de erro", async () => {
    const { app } = await makeApp();
    const r = await app.inject("/v1/me");
    expect(r.statusCode).toBe(401);
    expect(r.json()).toEqual({ error: { code: "unauthorized", message: expect.any(String) } });
    expect((await app.inject({ url: "/v1/me", headers: bearer("x") })).statusCode).toBe(401);
  });
  it("/v1/me com dev e JWT; 404 em rota desconhecida", async () => {
    const { app } = await makeApp();
    expect((await app.inject({ url: "/v1/me", headers: bearer() })).json()).toEqual({ userId: "dev-user" });
    const j = (await app.inject({ url: "/v1/me", headers: bearer(await jwt("u1")) })).json();
    expect(j).toEqual({ userId: "u1", email: "u1@x.com" });
    expect((await app.inject({ url: "/nada" })).json().error.code).toBe("not_found");
  });

  it("chat feliz: cria conversa, persiste, título 60 chars, histórico", async () => {
    const orch = fakeOrchestrator();
    const { app, repos } = await makeApp({}, orch);
    const msg = "a".repeat(100);
    const r = await app.inject({ method: "POST", url: "/v1/chat", headers: bearer(), payload: { message: msg } });
    expect(r.statusCode).toBe(200);
    const b = r.json();
    expect(b).toMatchObject({ reply: `eco: ${msg}`, provider: "fake" });
    const conv = await repos.conversations.get("dev-user", b.conversationId);
    expect(conv?.title).toBe("a".repeat(60));
    const r2 = await app.inject({ method: "POST", url: "/v1/chat", headers: bearer(), payload: { conversationId: b.conversationId, message: "oi" } });
    expect(r2.statusCode).toBe(200);
    expect(orch.calls[1]!.history.map((m) => m.role)).toEqual(["user", "assistant"]);
    const ms = (await app.inject({ url: `/v1/conversations/${b.conversationId}/messages`, headers: bearer() })).json().items;
    expect(ms).toHaveLength(4);
    expect((await app.inject({ url: "/v1/conversations", headers: bearer() })).json().items).toHaveLength(1);
  });
  it("chat: pendingAction vai para meta.pending e não ao cliente", async () => {
    const orch = fakeOrchestrator({
      async handle() {
        return { reply: "confirma?", provider: "fake", model: "m", toolCalls: [{ name: "send_email", status: "pending_confirmation" }],
          pendingConfirmation: { summary: "enviar" }, pendingAction: { tool: "send_email", input: { to: "x" } }, usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 } };
      },
    });
    const { app, repos } = await makeApp({}, orch);
    const r = await app.inject({ method: "POST", url: "/v1/chat", headers: bearer(), payload: { message: "envia" } });
    const b = r.json();
    expect(b.pendingAction).toBeUndefined();
    expect(b.pendingConfirmation).toEqual({ summary: "enviar" });
    const msgs = await repos.messages.list(b.conversationId);
    expect(msgs[1]!.meta).toMatchObject({ pending: { tool: "send_email", input: { to: "x" } } });
  });
  it("chat: conversa de outro usuário → 404", async () => {
    const { app, repos } = await makeApp();
    const c = await repos.conversations.create("outro", "t");
    const r = await app.inject({ method: "POST", url: "/v1/chat", headers: bearer(), payload: { conversationId: c.id, message: "oi" } });
    expect(r.statusCode).toBe(404);
    expect((await app.inject({ url: `/v1/conversations/${c.id}/messages`, headers: bearer() })).statusCode).toBe(404);
    expect((await app.inject({ method: "POST", url: "/v1/chat", headers: bearer(), payload: { conversationId: "nao-uuid", message: "oi" } })).statusCode).toBe(404);
  });
  it("chat: orçamento → 429 budget_exceeded", async () => {
    const orch = fakeOrchestrator({ async handle() { throw new BudgetExceededError(2, 1); } });
    const { app } = await makeApp({}, orch);
    const r = await app.inject({ method: "POST", url: "/v1/chat", headers: bearer(), payload: { message: "oi" } });
    expect(r.statusCode).toBe(429);
    expect(r.json().error.code).toBe("budget_exceeded");
  });
  it("chat: todos os provedores falham → 502 sem vazar causas", async () => {
    const orch = fakeOrchestrator({ async handle() { throw new ProvidersFailedError(["anthropic: key sk-secreta inválida"]); } });
    const { app } = await makeApp({}, orch);
    const r = await app.inject({ method: "POST", url: "/v1/chat", headers: bearer(), payload: { message: "oi" } });
    expect(r.statusCode).toBe(502);
    expect(r.json().error.code).toBe("provider_unavailable");
    expect(r.body).not.toContain("sk-secreta");
  });
  it("chat: provider none → 503 e nada persistido", async () => {
    const orch = fakeOrchestrator({
      async handle() { return { reply: "", provider: "none", model: "", toolCalls: [], usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 } }; },
    });
    const { app, repos } = await makeApp({}, orch);
    const r = await app.inject({ method: "POST", url: "/v1/chat", headers: bearer(), payload: { conversationId: (await repos.conversations.create("dev-user", "t")).id, message: "oi" } });
    expect(r.statusCode).toBe(503);
    expect(r.json().error.code).toBe("provider_unavailable");
  });
  it("chat: erro interno → 500 sem vazar detalhes", async () => {
    const { app } = await makeApp({}, fakeOrchestrator({ async handle() { throw new Error("segredo sk-123"); } }));
    const r = await app.inject({ method: "POST", url: "/v1/chat", headers: bearer(), payload: { message: "oi" } });
    expect(r.statusCode).toBe(500);
    expect(r.body).not.toContain("sk-123");
  });
  it("validação 400 (vazio, longo, campo extra, corpo grande)", async () => {
    const { app } = await makeApp();
    const post = (payload: unknown) => app.inject({ method: "POST", url: "/v1/chat", headers: bearer(), payload: payload as object });
    expect((await post({ message: "" })).statusCode).toBe(400);
    expect((await post({ message: "x".repeat(4001) })).statusCode).toBe(400);
    expect((await post({ message: "x", mode: "turbo" })).statusCode).toBe(400);
    expect((await post({})).json().error.code).toBe("bad_request");
    const big = await app.inject({ method: "POST", url: "/v1/chat", headers: bearer(), payload: { message: "x", pad: "y".repeat(33 * 1024) } });
    expect(big.statusCode).toBe(400);
  });

  it("memórias: CRUD, busca e isolamento", async () => {
    const { app } = await makeApp();
    const post = (h: Record<string, string>, content: string) => app.inject({ method: "POST", url: "/v1/memories", headers: h, payload: { kind: "fact", content } });
    const m = (await post(bearer(), "Gosto de café")).json();
    await post(bearer(), "Moro em Recife");
    await post(bearer(await jwt("u2")), "café do u2");
    expect((await app.inject({ url: "/v1/memories", headers: bearer() })).json().items).toHaveLength(2);
    expect((await app.inject({ url: "/v1/memories?q=caf%C3%A9", headers: bearer() })).json().items).toHaveLength(1);
    expect((await app.inject({ method: "DELETE", url: `/v1/memories/${m.id}`, headers: bearer(await jwt("u2")) })).statusCode).toBe(404);
    expect((await app.inject({ method: "DELETE", url: `/v1/memories/${m.id}`, headers: bearer() })).json()).toEqual({ ok: true });
    expect((await app.inject({ method: "POST", url: "/v1/memories", headers: bearer(), payload: { kind: "x", content: "a" } })).statusCode).toBe(400);
  });
  it("tarefas: CRUD, filtro e isolamento", async () => {
    const { app } = await makeApp();
    const t = (await app.inject({ method: "POST", url: "/v1/tasks", headers: bearer(), payload: { title: "Pagar conta", dueAt: "2026-12-01T10:00:00Z" } })).json();
    expect(t).toMatchObject({ title: "Pagar conta", status: "open", dueAt: "2026-12-01T10:00:00Z" });
    const p = await app.inject({ method: "PATCH", url: `/v1/tasks/${t.id}`, headers: bearer(), payload: { status: "done" } });
    expect(p.json().status).toBe("done");
    expect((await app.inject({ url: "/v1/tasks?status=open", headers: bearer() })).json().items).toHaveLength(0);
    expect((await app.inject({ url: "/v1/tasks?status=done", headers: bearer() })).json().items).toHaveLength(1);
    const other = bearer(await jwt("u2"));
    expect((await app.inject({ method: "PATCH", url: `/v1/tasks/${t.id}`, headers: other, payload: { title: "hack" } })).statusCode).toBe(404);
    expect((await app.inject({ url: "/v1/tasks", headers: other })).json().items).toHaveLength(0);
    expect((await app.inject({ method: "POST", url: "/v1/tasks", headers: bearer(), payload: { title: "" } })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: "/v1/tasks", headers: bearer(), payload: { title: "a", dueAt: "amanhã" } })).statusCode).toBe(400);
  });
  it("usage, audit e devices", async () => {
    const { app, repos } = await makeApp({ AI_DAILY_BUDGET_USD: "2.5" });
    await repos.usage.add({ userId: "dev-user", provider: "p", model: "m", inputTokens: 1, outputTokens: 1, costUsd: 0.4 });
    await repos.usage.add({ userId: "outro", provider: "p", model: "m", inputTokens: 1, outputTokens: 1, costUsd: 5 });
    await repos.audit.add({ userId: "dev-user", actor: "o", action: "a", status: "ok" });
    const u = (await app.inject({ url: "/v1/usage", headers: bearer() })).json();
    expect(u).toMatchObject({ limitUsd: 2.5, items: [{ calls: 1 }] });
    expect(u.spentUsd).toBeCloseTo(0.4);
    expect((await app.inject({ url: "/v1/usage?days=0", headers: bearer() })).statusCode).toBe(400);
    expect((await app.inject({ url: "/v1/audit", headers: bearer() })).json().items).toHaveLength(1);
    const d = await app.inject({ method: "POST", url: "/v1/devices", headers: bearer(), payload: { apnsToken: "abcdef123456" } });
    expect(d.json()).toEqual({ ok: true });
    expect(await repos.devices.list("dev-user")).toHaveLength(1);
    expect((await app.inject({ method: "POST", url: "/v1/devices", headers: bearer(), payload: {} })).statusCode).toBe(400);
  });
  it("rate limit por usuário → 429 rate_limited", async () => {
    const { app } = await makeApp({ RATE_LIMIT_PER_MIN: "3" });
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) codes.push((await app.inject({ url: "/v1/me", headers: bearer() })).statusCode);
    expect(codes).toEqual([200, 200, 200, 429, 429]);
    expect((await app.inject({ url: "/v1/me", headers: bearer(await jwt("u2")) })).statusCode).toBe(200);
  });
  it("plugins recebem repos, config e requireAuth", async () => {
    const { buildApp } = await import("../../src/server/app.js");
    const { loadConfig } = await import("../../src/server/config.js");
    const { createMemoryRepos } = await import("../../src/server/repos/memory.js");
    const app = await buildApp({
      config: loadConfig({ NODE_ENV: "test", JARVIS_DEV_TOKEN: "t" }), repos: createMemoryRepos(), orchestrator: fakeOrchestrator(),
      plugins: [async (a) => { a.get("/v1/integrations", { preHandler: a.requireAuth }, async (req) => ({ u: req.user.userId, d: typeof a.repos })); }],
    });
    expect((await app.inject("/v1/integrations")).statusCode).toBe(401);
    expect((await app.inject({ url: "/v1/integrations", headers: bearer("t") })).json()).toEqual({ u: "dev-user", d: "object" });
  });
});
