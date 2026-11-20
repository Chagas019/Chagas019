import { describe, expect, it, vi } from "vitest";
import { DEV, USER_A, call, chat, completion, httpError, jwt, makeStack, seq, sleep } from "./helpers.js";

describe("e2e orçamento e provedores", () => {
  it("sem provedor configurado: 503 provider_unavailable", async () => {
    const s = await makeStack({ env: { AI_GATEWAY_API_KEY: "" } });
    const r = await chat(s, DEV, { message: "oi" });
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe("provider_unavailable");
    expect((await call(s.app, DEV, "GET", "/v1/me")).status).toBe(200);
    const h = await s.app.inject({ url: "/health" });
    expect(JSON.parse(h.body).providers).toEqual([]);
  });

  it("todos os provedores falham: 502 sem vazar causa/detalhe do provedor", async () => {
    const s = await makeStack({ handler: () => httpError(500, "SEGREDO-INTERNO-DO-PROVEDOR"), env: { JARVIS_FALLBACK_CHAIN: "gateway:outro/modelo" } });
    const r = await chat(s, DEV, { message: "oi" });
    expect(r.status).toBe(502);
    expect(r.body.error.code).toBe("provider_unavailable");
    expect(r.raw).not.toContain("SEGREDO-INTERNO");
    expect(s.requests).toHaveLength(2); // principal + fallback
  });

  it("falha do principal cai para o fallback; auth (401) não repete no mesmo provedor", async () => {
    const s = await makeStack({ handler: seq(() => httpError(503), () => completion({ text: "via fallback" })), env: { JARVIS_FALLBACK_CHAIN: "gateway:outro/modelo" } });
    const r = await chat(s, DEV, { message: "oi" });
    expect(r.status).toBe(200);
    expect(r.body.model).toBe("outro/modelo");
    const s2 = await makeStack({ handler: () => httpError(401), env: { JARVIS_FALLBACK_CHAIN: "gateway:outro/modelo" } });
    expect((await chat(s2, DEV, { message: "oi" })).status).toBe(502);
    expect(s2.requests).toHaveLength(1);
  });

  it("orçamento estourado: 429 budget_exceeded e o provedor nem é chamado", async () => {
    const s = await makeStack({ env: { AI_DAILY_BUDGET_USD: "0.5" } });
    await s.repos.usage.add({ userId: "dev-user", provider: "gateway", model: "m", inputTokens: 1, outputTokens: 1, costUsd: 0.5 });
    const r = await chat(s, DEV, { message: "oi" });
    expect(r.status).toBe(429);
    expect(r.body.error.code).toBe("budget_exceeded");
    expect(s.requests).toHaveLength(0);
  });

  it("orçamento por usuário: gasto de A não bloqueia B; sequencial bloqueia na 3a chamada", async () => {
    const s = await makeStack({ env: { AI_DAILY_BUDGET_USD: "0.15" }, handler: () => completion({ text: "ok", promptTokens: 1_000_000 }) }); // ~0,10 USD/chamada (haiku)
    const tA = await jwt(USER_A);
    expect((await chat(s, tA, { message: "oi" })).status).toBe(200);
    expect((await chat(s, tA, { message: "oi" })).status).toBe(200);
    expect((await chat(s, tA, { message: "oi" })).status).toBe(429);
    expect((await chat(s, DEV, { message: "oi" })).status).toBe(200);
  });

  // ACHADO F-02 (média): o orçamento é lido uma vez no início; requisições concorrentes ultrapassam o limite.
  it.fails("F-02: orçamento não é contornável por requisições concorrentes", async () => {
    const s = await makeStack({
      env: { AI_DAILY_BUDGET_USD: "0.15" },
      handler: async () => { await sleep(20); return completion({ text: "ok", promptTokens: 1_000_000 }); },
    });
    await Promise.all(Array.from({ length: 10 }, () => chat(s, DEV, { message: "oi" })));
    const spent = (await call(s.app, DEV, "GET", "/v1/usage")).body.spentUsd as number;
    expect(spent).toBeLessThanOrEqual(0.15 + 0.11); // limite + no máx. uma chamada de folga
  });

  // ACHADO F-05 (média): modelo sem preço => custo 0 => orçamento desativado silenciosamente (fail-open).
  it.fails("F-05: modelo sem preço conhecido não pode custar 0 (fail-closed)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const s = await makeStack({ env: { JARVIS_MODEL_FAST: "gateway:acme/modelo-sem-preco" } });
      await chat(s, DEV, { message: "oi" });
      expect((await call(s.app, DEV, "GET", "/v1/usage")).body.spentUsd).toBeGreaterThan(0);
    } finally { warn.mockRestore(); }
  });

  // ACHADO F-08 (baixa): conversa é criada antes de o provedor responder; 503/502/429 deixam conversas órfãs vazias.
  it.fails("F-08: falha de provedor/orçamento não deixa conversa órfã", async () => {
    const s = await makeStack({ env: { AI_GATEWAY_API_KEY: "" } });
    await chat(s, DEV, { message: "oi" });
    expect((await call(s.app, DEV, "GET", "/v1/conversations")).body.items).toHaveLength(0);
  });
});
