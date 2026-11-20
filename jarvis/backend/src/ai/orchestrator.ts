/**
 * Orquestrador do JARVIS.
 *
 * Contrato: retorna `OrchestratorResult` (ChatResponse sem conversationId + `pendingAction?`).
 * Quando uma ferramenta com sideEffect exige confirmação, `pendingAction = {tool, input}` e o servidor
 * deve gravá-lo em `meta.pending` da mensagem do assistente (inclui `id` e `expiresAt`, TTL 5 min). Com `confirm=true`,
 * o orquestrador lê `meta.pending` da última mensagem do assistente em `history`, consome-o via
 * `repos.messages.claimPending` (atômico; só o primeiro executa) e executa a ação sem novo planejamento.
 */
import { randomUUID } from "node:crypto";
import {
  BudgetExceededError,
  type ChatMode,
  type Message,
  type Orchestrator,
  type OrchestratorInput,
  type OrchestratorResult,
  type Repos,
  type ToolCallSummary,
  type ToolRegistry,
} from "../core/types.js";
import { computeCost, estimateMaxCost } from "./pricing.js";
import type { ContentPart, LlmMessage, LlmToolCall, LlmUsage } from "./providers/types.js";
import { buildProviders } from "./providers/index.js";
import { classifyTier, Router, type Tier } from "./router.js";

const MAX_ITERATIONS = 5;
const MAX_TOOL_CALLS_PER_ITERATION = 5;
const MAX_TOOL_CALLS_PER_TURN = 10;
const PENDING_TTL_MS = 5 * 60_000;
const CONTEXT_TOKEN_LIMIT = 6000;
const MAX_TOOL_OUTPUT = 4000;
const MAX_OUTPUT_TOKENS = 1500;

export const SYSTEM_PROMPT = `Você é o JARVIS, assistente pessoal do usuário no iPhone.
- Responda em português do Brasil, de forma concisa e direta.
- Seja honesto: se não souber ou não conseguir, diga. Nunca afirme ter feito uma ação que não executou de fato via ferramenta.
- Use as ferramentas disponíveis para salvar/buscar memórias, gerenciar tarefas e consultar a hora; confie no resultado delas.
- Ações com efeito externo exigem confirmação do usuário; peça-a quando a ferramenta indicar.
- Não invente dados pessoais, datas ou fatos.`;

export function startOfUtcDay(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

/** Aplica política de orçamento ao tier; lança BudgetExceededError em ≥100%. */
export function applyBudget(tier: Tier, spent: number, limit: number): Tier {
  if (limit <= 0 || spent >= limit) throw new BudgetExceededError(spent, limit);
  const ratio = spent / limit;
  if (ratio >= 0.85) return "fast";
  if (ratio >= 0.7 && tier === "deep") return "balanced";
  return tier;
}

/** Monta mensagens do histórico respeitando ~6000 tokens (chars/4); trunca de forma determinística. */
export function buildHistory(history: Message[], current: string): { messages: LlmMessage[]; truncated: boolean } {
  let items = history.filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim());
  const last = items[items.length - 1];
  if (last && last.role === "user" && last.content.trim() === current.trim()) items = items.slice(0, -1);
  let budget = CONTEXT_TOKEN_LIMIT * 4 - current.length;
  const kept: { role: "user" | "assistant"; text: string }[] = [];
  let truncated = false;
  for (let i = items.length - 1; i >= 0; i--) {
    let text = items[i].content;
    if (text.length > 4000) {
      text = text.slice(0, 4000) + "…";
      truncated = true;
    }
    if (text.length > budget) {
      truncated = true;
      if (budget > 200) kept.unshift({ role: items[i].role as "user" | "assistant", text: text.slice(0, budget) + "…" });
      break;
    }
    budget -= text.length;
    kept.unshift({ role: items[i].role as "user" | "assistant", text });
  }
  while (kept.length && kept[0].role !== "user") kept.shift();
  const messages: LlmMessage[] = [];
  for (const k of kept) {
    const prev = messages[messages.length - 1];
    if (prev && prev.role === k.role) (prev.content[0] as { text: string }).text += `\n${k.text}`;
    else messages.push({ role: k.role, content: [{ type: "text", text: k.text }] });
  }
  return { messages, truncated };
}

export function createOrchestrator(opts: { repos: Repos; tools: ToolRegistry; env: NodeJS.ProcessEnv; fetchImpl?: typeof fetch; now?: () => Date }): Orchestrator {
  const { repos, tools, env } = opts;
  const now = opts.now ?? (() => new Date());
  const providers = buildProviders(env, opts.fetchImpl);
  const router = new Router(providers, env);
  const limit = Number(env.AI_DAILY_BUDGET_USD ?? 1) || 1;

  /**
   * Orçamento (F-02): cada chamada ao modelo reverifica o gasto e reserva em memória, por usuário, o custo máximo estimado
   * (maxTokens x preço de saída + entrada estimada), liberado ao registrar o custo real. Chamadas do mesmo usuário nesta
   * instância são serializadas. Entre instâncias (serverless) o limite é APROXIMADO: a reserva não é compartilhada.
   */
  const reserved = new Map<string, number>();
  const locks = new Map<string, Promise<unknown>>();
  async function withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const prev = locks.get(userId) ?? Promise.resolve();
    const run = prev.then(() => fn());
    const tail = run.catch(() => undefined);
    locks.set(userId, tail);
    try { return await run; } finally { if (locks.get(userId) === tail) locks.delete(userId); }
  }

  const none = (): OrchestratorResult => ({ provider: "none", model: "none", reply: "", toolCalls: [], usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 } });

  async function audit(userId: string, tool: string, status: ToolCallSummary["status"], detail: Record<string, unknown>) {
    await repos.audit.add({ userId, actor: tool, action: `tool:${tool}`, status, detail });
  }

  async function runTool(input: OrchestratorInput, call: LlmToolCall, confirmed: boolean): Promise<{ summary: ToolCallSummary; content: string; isError: boolean; pending?: { summary: string } }> {
    const tool = tools.get(call.name);
    if (!tool) {
      await audit(input.userId, call.name, "error", { reason: "ferramenta desconhecida", input: call.input });
      return { summary: { name: call.name, status: "error" }, content: `Ferramenta desconhecida: ${call.name}`, isError: true };
    }
    if (tool.sideEffect && !confirmed) {
      const summary = `Executar ${tool.name} com ${JSON.stringify(call.input ?? {}).slice(0, 300)}`;
      await audit(input.userId, tool.name, "pending_confirmation", { input: call.input, summary });
      return { summary: { name: tool.name, status: "pending_confirmation" }, content: "Aguardando confirmação do usuário.", isError: false, pending: { summary } };
    }
    try {
      const res = await tool.run(call.input, { userId: input.userId, conversationId: input.conversationId, repos, confirmed });
      if (res.needsConfirmation && !confirmed) {
        await audit(input.userId, tool.name, "pending_confirmation", { input: call.input, summary: res.needsConfirmation.summary });
        return { summary: { name: tool.name, status: "pending_confirmation" }, content: "Aguardando confirmação do usuário.", isError: false, pending: res.needsConfirmation };
      }
      await audit(input.userId, tool.name, res.ok ? "ok" : "error", { input: call.input, output: res.output.slice(0, 500) });
      return { summary: { name: tool.name, status: res.ok ? "ok" : "error" }, content: res.output.slice(0, MAX_TOOL_OUTPUT), isError: !res.ok };
    } catch (err) {
      // F-11: detalhe do erro (ex.: mensagem do pg) só no log do servidor; modelo e audit recebem texto genérico.
      console.error(`[jarvis/orchestrator] falha na ferramenta ${tool.name}:`, (err as Error).name, (err as Error).message);
      await audit(input.userId, tool.name, "error", { input: call.input, error: "falha interna na ferramenta" });
      return { summary: { name: tool.name, status: "error" }, content: "Erro ao executar a ferramenta.", isError: true };
    }
  }

  return {
    providers: () => router.providers(),

    async handle(input: OrchestratorInput): Promise<OrchestratorResult> {
      if (!providers.length || !router.hasCandidates()) return none();

      const baseTier = classifyTier(input.message, input.mode as ChatMode);
      // Falha cedo (429) sem chamar provedor; a checagem é repetida antes de cada chamada ao modelo.
      applyBudget(baseTier, await repos.usage.costSince(input.userId, startOfUtcDay(now())), limit);

      const memories = await repos.memories.search(input.userId, input.message, 5);
      const { messages: hist, truncated } = buildHistory(input.history, input.message);
      let system = SYSTEM_PROMPT;
      if (memories.length) system += `\n\nMemórias relevantes sobre o usuário:\n${memories.map((m) => `- ${m.content}`).join("\n")}`;
      if (truncated) system += "\n\n(Mensagens antigas da conversa foram omitidas por limite de contexto.)";

      const convo: LlmMessage[] = [...hist, { role: "user", content: [{ type: "text", text: input.message }] }];
      const toolDefs = tools.list().map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
      const summaries: ToolCallSummary[] = [];
      const total = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
      let provider = "none";
      let model = "none";

      // Confirmação: executa a ação pendente direto, sem consultar o modelo antes (consumo único + TTL).
      let toolCallsTurn = 0;
      if (input.confirm) {
        const lastAssistant = [...input.history].reverse().find((m) => m.role === "assistant");
        const pending = lastAssistant?.meta?.pending as { id?: string; tool?: string; input?: unknown; expiresAt?: string } | undefined;
        if (lastAssistant && pending?.tool) {
          const expiresMs = pending.expiresAt ? Date.parse(pending.expiresAt) : NaN;
          const expired = !(expiresMs > now().getTime()); // sem expiresAt/inválido => expirado (fail-closed)
          const claimed = await repos.messages.claimPending(input.conversationId, lastAssistant.id);
          if (!claimed || expired) {
            await audit(input.userId, pending.tool, "denied", { reason: expired ? "pendência expirada" : "pendência já consumida" });
          } else {
            const id = "pending_action";
            toolCallsTurn++;
            const r = await runTool(input, { id, name: pending.tool, input: pending.input }, true);
            summaries.push(r.summary);
            convo.push({ role: "assistant", content: [{ type: "tool_use", id, name: pending.tool, input: pending.input ?? {} }] });
            convo.push({ role: "user", content: [{ type: "tool_result", toolUseId: id, content: r.content, isError: r.isError }] });
          }
        }
      }

      let reply = "";
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const out = await withUserLock(input.userId, async () => {
          const spentNow = await repos.usage.costSince(input.userId, startOfUtcDay(now()));
          const inFlight = reserved.get(input.userId) ?? 0;
          const callTier = applyBudget(baseTier, spentNow + inFlight, limit); // lança BudgetExceededError (429)
          const reservation = estimateMaxCost(JSON.stringify({ system, convo, toolDefs }).length / 4, MAX_OUTPUT_TOKENS, env);
          reserved.set(input.userId, inFlight + reservation);
          try {
            const res = await router.chat(callTier, { system, messages: convo, tools: toolDefs, maxTokens: MAX_OUTPUT_TOKENS });
            const u: LlmUsage = res.response.usage;
            const cost = computeCost(res.model, u, env);
            await repos.usage.add({ userId: input.userId, provider: res.provider, model: res.model, inputTokens: u.inputTokens + (u.cacheReadTokens ?? 0), outputTokens: u.outputTokens, costUsd: cost });
            return { res, cost };
          } finally {
            const left = (reserved.get(input.userId) ?? 0) - reservation;
            if (left > 1e-12) reserved.set(input.userId, left); else reserved.delete(input.userId);
          }
        });
        provider = out.res.provider;
        model = out.res.model;
        const usage: LlmUsage = out.res.response.usage;
        total.inputTokens += usage.inputTokens + (usage.cacheReadTokens ?? 0);
        total.outputTokens += usage.outputTokens;
        total.costUsd += out.cost;

        const { text, toolCalls } = out.res.response;
        if (text) reply = text;
        if (!toolCalls.length) break;

        const parts: ContentPart[] = [];
        if (text) parts.push({ type: "text", text });
        for (const c of toolCalls) parts.push({ type: "tool_use", id: c.id, name: c.name, input: c.input, meta: c.meta });
        convo.push({ role: "assistant", content: parts });

        const results: ContentPart[] = [];
        let iterCalls = 0;
        for (const c of toolCalls) {
          // F-04: teto por iteração e por turno; excedentes recebem tool_result de erro sem executar.
          if (iterCalls >= MAX_TOOL_CALLS_PER_ITERATION || toolCallsTurn >= MAX_TOOL_CALLS_PER_TURN) {
            await audit(input.userId, c.name, "denied", { reason: "limite de chamadas de ferramenta excedido" });
            summaries.push({ name: c.name, status: "denied" });
            results.push({ type: "tool_result", toolUseId: c.id, content: "Limite de chamadas de ferramenta excedido neste turno; chamada não executada.", isError: true });
            continue;
          }
          iterCalls++;
          toolCallsTurn++;
          const r = await runTool(input, c, false);
          summaries.push(r.summary);
          if (r.pending) {
            return {
              provider,
              model,
              reply: text || r.pending.summary,
              toolCalls: summaries,
              pendingConfirmation: { summary: r.pending.summary },
              pendingAction: { id: randomUUID(), tool: c.name, input: c.input, expiresAt: new Date(now().getTime() + PENDING_TTL_MS).toISOString() },
              usage: total,
            };
          }
          results.push({ type: "tool_result", toolUseId: c.id, content: r.content, isError: r.isError });
        }
        convo.push({ role: "user", content: results });
        if (i === MAX_ITERATIONS - 1 && !reply) reply = "Não consegui concluir o pedido dentro do limite de passos. Pode reformular?";
      }

      return { provider, model, reply, toolCalls: summaries, usage: total };
    },
  };
}
