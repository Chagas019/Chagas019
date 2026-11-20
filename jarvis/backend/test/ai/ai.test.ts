import { beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetExceededError } from "../../src/core/types.js";
import { createOrchestrator, createToolRegistry } from "../../src/ai/index.js";
import { applyBudget, buildHistory } from "../../src/ai/orchestrator.js";
import { computeCost, _resetPricingWarnings } from "../../src/ai/pricing.js";
import { classifyTier, ProviderUnavailableError, Router } from "../../src/ai/router.js";
import { ProviderError } from "../../src/ai/providers/types.js";
import { buildProviders } from "../../src/ai/providers/index.js";
import { parseOpenAiResponse, OpenAiCompatibleProvider } from "../../src/ai/providers/openaiCompatible.js";
import { GeminiProvider, parseGeminiResponse } from "../../src/ai/providers/gemini.js";
import { AnthropicProvider } from "../../src/ai/providers/anthropic.js";
import { fakeProvider, fakeResponse, jsonResponse, memRepos } from "./helpers.js";

describe("roteamento", () => {
  it("auto: curta→fast, longa/planejamento→deep, resto→balanced; modos explícitos", () => {
    expect(classifyTier("que horas são?", "auto")).toBe("fast");
    expect(classifyTier("Planeje a minha semana de estudos com metas detalhadas e prioridades para cada dia", "auto")).toBe("deep");
    expect(classifyTier("a".repeat(900), "auto")).toBe("deep");
    expect(classifyTier("Me explique como funciona a diferença entre juros simples e compostos no financiamento do carro", "auto")).toBe("balanced");
    expect(classifyTier("x", "deep")).toBe("deep");
    expect(classifyTier("planeje e analise tudo isso em detalhes por favor agora mesmo", "fast")).toBe("fast");
  });

  it("padrões Anthropic, gateway-only e override por env", () => {
    const a = fakeProvider("anthropic", () => fakeResponse());
    const g = fakeProvider("gateway", () => fakeResponse());
    expect(new Router([a], {}).candidates("fast")).toEqual([{ provider: "anthropic", model: "claude-haiku-5-5" }]);
    expect(new Router([g], {}).candidates("deep")).toEqual([{ provider: "gateway", model: "anthropic/claude-opus-5.5" }]);
    expect(new Router([a], { JARVIS_MODEL_FAST: "anthropic:x-y" }).candidates("fast")[0].model).toBe("x-y");
  });

  it("fallback: 429 passa ao próximo; auth não repete no mesmo provedor; ignora não configurados", async () => {
    const a = fakeProvider("anthropic", () => new ProviderError("limite", "retryable", 429));
    const g = fakeProvider("gateway", () => fakeResponse({ text: "do gateway" }));
    const env = { JARVIS_FALLBACK_CHAIN: "openai:gpt-x,gateway:anthropic/claude-sonnet-5.5" };
    const r = await new Router([a, g], env).chat("balanced", { system: "", messages: [], tools: [], maxTokens: 10 });
    expect(r.provider).toBe("gateway");
    expect(r.response.text).toBe("do gateway");
    expect(a.calls).toHaveLength(1);

    const a2 = fakeProvider("anthropic", () => new ProviderError("key ruim", "auth", 401));
    const env2 = { JARVIS_FALLBACK_CHAIN: "anthropic:claude-haiku-5-5,gateway:anthropic/claude-haiku-5.5" };
    const r2 = await new Router([a2, g], env2).chat("balanced", { system: "", messages: [], tools: [], maxTokens: 10 });
    expect(r2.provider).toBe("gateway");
    expect(a2.calls).toHaveLength(1);
  });

  it("todos falham → ProviderUnavailableError", async () => {
    const a = fakeProvider("anthropic", () => new ProviderError("x", "retryable", 500));
    await expect(new Router([a], {}).chat("fast", { system: "", messages: [], tools: [], maxTokens: 1 })).rejects.toBeInstanceOf(ProviderUnavailableError);
  });
});

describe("custos", () => {
  beforeEach(() => _resetPricingWarnings());
  it("calcula custo com cache e normaliza ids", () => {
    const u = { inputTokens: 1_000_000, outputTokens: 1_000_000, cacheReadTokens: 1_000_000 };
    expect(computeCost("claude-opus-5-5", u, {})).toBeCloseTo(4 + 20 + 0.2);
    expect(computeCost("anthropic/claude-sonnet-5.5", u, {})).toBeCloseTo(2 + 10 + 0.1);
    expect(computeCost("claude-haiku-5-5", u, {})).toBeCloseTo(0.1 + 0.5 + 0.01);
  });
  it("sem preço → 0 e warn uma vez; MODEL_PRICES_JSON sobrescreve", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const u = { inputTokens: 1_000_000, outputTokens: 0 };
    expect(computeCost("gpt-x", u, {})).toBe(0);
    computeCost("gpt-x", u, {});
    expect(warn).toHaveBeenCalledTimes(1);
    expect(computeCost("gpt-x", u, { MODEL_PRICES_JSON: '{"gpt-x":{"in":3,"out":6}}' })).toBeCloseTo(3);
    warn.mockRestore();
  });
});

describe("orçamento", () => {
  it("70/85/100%", () => {
    expect(applyBudget("deep", 0.5, 1)).toBe("deep");
    expect(applyBudget("deep", 0.7, 1)).toBe("balanced");
    expect(applyBudget("balanced", 0.7, 1)).toBe("balanced");
    expect(applyBudget("deep", 0.85, 1)).toBe("fast");
    expect(applyBudget("balanced", 0.9, 1)).toBe("fast");
    expect(() => applyBudget("fast", 1, 1)).toThrow(BudgetExceededError);
  });
  it("orquestrador usa tier rebaixado e lança ao estourar", async () => {
    const { repos, state } = memRepos();
    const env = { ANTHROPIC_API_KEY: "k", AI_DAILY_BUDGET_USD: "1" };
    const o = createOrchestrator({ repos, tools: createToolRegistry(), env });
    state.spent = 1.2;
    await expect(o.handle({ userId: "u", conversationId: "c", history: [], message: "oi", mode: "auto", confirm: false })).rejects.toBeInstanceOf(BudgetExceededError);
  });
});

describe("orquestrador", () => {
  function setup(script: Parameters<typeof fakeProvider>[1], extraEnv: Record<string, string> = {}) {
    const r = memRepos();
    const p = fakeProvider("anthropic", script);
    const tools = createToolRegistry();
    const orch = createOrchestrator({ repos: r.repos, tools, env: { ANTHROPIC_API_KEY: "k", ...extraEnv } });
    // injeta o provedor fake no router interno substituindo o chat do Anthropic real
    vi.spyOn(AnthropicProvider.prototype, "chat").mockImplementation((req) => p.chat(req));
    return { ...r, p, tools, orch };
  }
  const input = (over = {}) => ({ userId: "u", conversationId: "c", history: [], message: "oi", mode: "auto" as const, confirm: false, ...over });

  beforeEach(() => vi.restoreAllMocks());

  it("sem provedor → none", async () => {
    const r = memRepos();
    const o = createOrchestrator({ repos: r.repos, tools: createToolRegistry(), env: {} });
    expect(await o.handle(input())).toEqual({ provider: "none", model: "none", reply: "", toolCalls: [], usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 } });
    expect(o.providers()).toEqual([]);
  });

  it("providers() lista só configurados", () => {
    const r = memRepos();
    const o = createOrchestrator({ repos: r.repos, tools: createToolRegistry(), env: { ANTHROPIC_API_KEY: "a", DEEPSEEK_API_KEY: "d" } });
    expect(o.providers().map((p) => p.id).sort()).toEqual(["anthropic", "deepseek"]);
  });

  it("loop de ferramentas: executa create_task, audita, registra uso e responde", async () => {
    const s = setup((_req, n) =>
      n === 1
        ? fakeResponse({ text: "", stopReason: "tool_use", toolCalls: [{ id: "t1", name: "create_task", input: { title: "Comprar pão", dueAt: "2026-11-21T09:00:00-03:00" } }] })
        : fakeResponse({ text: "Tarefa criada." }),
    );
    await s.repos.memories.add("u", "fact", "gosta de pão integral");
    const res = await s.orch.handle(input({ message: "me lembre de comprar pão amanhã" }));
    expect(res.reply).toBe("Tarefa criada.");
    expect(res.toolCalls).toEqual([{ name: "create_task", status: "ok" }]);
    expect(s.tasks).toHaveLength(1);
    expect(s.tasks[0].dueAt).toBe("2026-11-21T12:00:00.000Z");
    expect(s.audit.some((a) => a.action === "tool:create_task" && a.status === "ok")).toBe(true);
    expect(s.usage).toHaveLength(2);
    expect(res.usage.costUsd).toBeGreaterThan(0);
    expect(s.p.calls[0].system).toContain("pão integral");
    expect(s.p.calls[1].messages.at(-1)?.content[0].type).toBe("tool_result");
  });

  it("limita a 5 iterações", async () => {
    const s = setup(() => fakeResponse({ text: "", stopReason: "tool_use", toolCalls: [{ id: "x", name: "current_time", input: {} }] }));
    const res = await s.orch.handle(input());
    expect(s.p.calls).toHaveLength(5);
    expect(res.reply).toContain("limite");
  });

  it("confirmação pendente e execução com confirm=true", async () => {
    let ran = 0;
    const s = setup((_req, n) =>
      n === 1
        ? fakeResponse({ text: "Vou enviar.", stopReason: "tool_use", toolCalls: [{ id: "m1", name: "send_mail", input: { to: "a@b.c" } }] })
        : fakeResponse({ text: "E-mail enviado." }),
    );
    s.tools.register({
      name: "send_mail",
      description: "envia",
      inputSchema: { type: "object", properties: {} },
      sideEffect: true,
      run: async (_i, ctx) => {
        if (!ctx.confirmed) throw new Error("não deveria rodar");
        ran++;
        return { ok: true, output: "enviado" };
      },
    });
    const first = await s.orch.handle(input({ message: "envie email" }));
    expect(ran).toBe(0);
    expect(first.pendingConfirmation?.summary).toContain("send_mail");
    expect(first.pendingAction).toEqual({ tool: "send_mail", input: { to: "a@b.c" } });
    expect(first.toolCalls[0].status).toBe("pending_confirmation");
    expect(s.audit.at(-1)?.status).toBe("pending_confirmation");

    const history = [{ id: "1", conversationId: "c", role: "assistant" as const, content: first.reply, createdAt: "", meta: { pending: first.pendingAction } }];
    const second = await s.orch.handle(input({ message: "confirmo", confirm: true, history }));
    expect(ran).toBe(1);
    expect(second.reply).toBe("E-mail enviado.");
    expect(second.pendingConfirmation).toBeUndefined();
    expect(second.toolCalls).toEqual([{ name: "send_mail", status: "ok" }]);
    // primeira chamada ao modelo já contém o tool_result da ação executada
    expect(s.p.calls[1].messages.at(-1)?.content[0].type).toBe("tool_result");
  });

  it("buildHistory trunca de forma determinística e evita duplicar a mensagem atual", () => {
    const mk = (i: number, role: "user" | "assistant", c: string) => ({ id: String(i), conversationId: "c", role, content: c, createdAt: "" });
    const hist = Array.from({ length: 20 }, (_, i) => mk(i, i % 2 ? "assistant" : "user", "x".repeat(3000)));
    const { messages, truncated } = buildHistory(hist, "atual");
    expect(truncated).toBe(true);
    expect(messages[0].role).toBe("user");
    const chars = messages.reduce((s, m) => s + (m.content[0] as { text: string }).text.length, 0);
    expect(chars).toBeLessThanOrEqual(24000 + 10);
    const dup = buildHistory([mk(1, "user", "atual")], "atual");
    expect(dup.messages).toHaveLength(0);
  });
});

describe("ferramentas internas", () => {
  it("remember/recall/list/complete/current_time e validação zod", async () => {
    const { repos } = memRepos();
    const reg = createToolRegistry();
    const ctx = { userId: "u", conversationId: "c", repos, confirmed: false };
    expect(reg.list().every((t) => !t.sideEffect)).toBe(true);
    await reg.get("remember")!.run({ content: "mora em Recife" }, ctx);
    expect((await reg.get("recall")!.run({ query: "Recife" }, ctx)).output).toContain("Recife");
    const t = await reg.get("create_task")!.run({ title: "x" }, ctx);
    const id = (t.data as { id: string }).id;
    expect((await reg.get("complete_task")!.run({ id }, ctx)).ok).toBe(true);
    expect((await reg.get("list_tasks")!.run({ status: "done" }, ctx)).output).toContain("x");
    expect((await reg.get("create_task")!.run({ title: "" }, ctx)).ok).toBe(false);
    expect((await reg.get("create_task")!.run({ title: "a", dueAt: "ontem" }, ctx)).ok).toBe(false);
    expect((await reg.get("current_time")!.run({}, ctx)).output).toContain("America/Sao_Paulo");
  });
});

describe("provedores", () => {
  it("só cria provedores com key própria", () => {
    expect(buildProviders({}).length).toBe(0);
    expect(buildProviders({ OPENAI_API_KEY: "a", GEMINI_API_KEY: "g" }).map((p) => p.id)).toEqual(["openai", "gemini"]);
  });

  it("parse OpenAI-compat com tool calls e cache", () => {
    const r = parseOpenAiResponse({
      choices: [{ finish_reason: "tool_calls", message: { content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "recall", arguments: '{"query":"x"}' } }] } }],
      usage: { prompt_tokens: 100, completion_tokens: 20, prompt_tokens_details: { cached_tokens: 40 } },
    });
    expect(r.toolCalls).toEqual([{ id: "c1", name: "recall", input: { query: "x" } }]);
    expect(r.stopReason).toBe("tool_use");
    expect(r.usage).toEqual({ inputTokens: 60, outputTokens: 20, cacheReadTokens: 40 });
  });

  it("OpenAI-compat via fetch mock: URL, auth, tools e erro 401→auth", async () => {
    const f = vi.fn(async () => jsonResponse({ choices: [{ finish_reason: "stop", message: { content: "olá" } }], usage: { prompt_tokens: 5, completion_tokens: 2 } }));
    const p = new OpenAiCompatibleProvider({ id: "deepseek", apiKey: "K", baseUrl: "https://api.deepseek.com/v1", fetchImpl: f as unknown as typeof fetch });
    const r = await p.chat({ model: "m", system: "s", maxTokens: 9, tools: [{ name: "t", description: "d", inputSchema: { type: "object" } }], messages: [{ role: "user", content: [{ type: "text", text: "oi" }] }] });
    expect(r.text).toBe("olá");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.deepseek.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer K");
    const body = JSON.parse(init.body as string);
    expect(body.tools[0].function.name).toBe("t");
    expect(body.messages[0]).toEqual({ role: "system", content: "s" });

    const bad = new OpenAiCompatibleProvider({ id: "openai", apiKey: "K", baseUrl: "https://x/v1", fetchImpl: (async () => jsonResponse({}, 401)) as typeof fetch });
    await expect(bad.chat({ model: "m", system: "", maxTokens: 1, tools: [], messages: [] })).rejects.toMatchObject({ kind: "auth" });
  });

  it("parse Gemini functionCall e requisição com functionDeclarations", async () => {
    const r = parseGeminiResponse({
      candidates: [{ finishReason: "STOP", content: { parts: [{ functionCall: { name: "create_task", args: { title: "a" } }, thoughtSignature: "sig" }] } }],
      usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 7, cachedContentTokenCount: 10 },
    });
    expect(r.toolCalls[0]).toMatchObject({ name: "create_task", input: { title: "a" }, meta: { thoughtSignature: "sig" } });
    expect(r.stopReason).toBe("tool_use");
    expect(r.usage).toEqual({ inputTokens: 40, outputTokens: 7, cacheReadTokens: 10 });

    const f = vi.fn(async () => jsonResponse({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "oi" }] } }] }));
    const p = new GeminiProvider("G", f as unknown as typeof fetch);
    await p.chat({
      model: "gem",
      system: "s",
      maxTokens: 5,
      tools: [{ name: "t", description: "d", inputSchema: { type: "object", additionalProperties: false, properties: {} } }],
      messages: [
        { role: "user", content: [{ type: "text", text: "u" }] },
        { role: "assistant", content: [{ type: "tool_use", id: "i", name: "t", input: {}, meta: { thoughtSignature: "sig" } }] },
        { role: "user", content: [{ type: "tool_result", toolUseId: "i", content: "feito" }] },
      ],
    });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/models/gem:generateContent");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("G");
    const body = JSON.parse(init.body as string);
    expect(body.tools[0].functionDeclarations[0].parameters.additionalProperties).toBeUndefined();
    expect(body.contents[1].parts[0].thoughtSignature).toBe("sig");
    expect(body.contents[2].parts[0].functionResponse.name).toBe("t");
  });

  it("Anthropic: cache_control em system/tools e parse de tool_use", async () => {
    const create = vi.fn(async () => ({ content: [{ type: "tool_use", id: "a", name: "t", input: { q: 1 } }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 3, cache_read_input_tokens: 90 } }));
    const p = new AnthropicProvider("k", { messages: { create } });
    const r = await p.chat({ model: "m", system: "s", maxTokens: 5, tools: [{ name: "t", description: "d", inputSchema: { type: "object" } }], messages: [{ role: "user", content: [{ type: "text", text: "x" }] }] });
    const params = (create.mock.calls[0] as unknown[])[0] as any;
    expect(params.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(params.tools[0].cache_control).toEqual({ type: "ephemeral" });
    expect(r.toolCalls[0]).toEqual({ id: "a", name: "t", input: { q: 1 } });
    expect(r.usage.cacheReadTokens).toBe(90);
  });
});
