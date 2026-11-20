/**
 * Orquestrador do JARVIS.
 *
 * Contrato: retorna `OrchestratorResult` (ChatResponse sem conversationId + `pendingAction?`).
 * Quando uma ferramenta com sideEffect exige confirmação, `pendingAction = {tool, input}` e o servidor
 * deve gravá-lo em `meta.pending` da mensagem do assistente. Com `confirm=true`, o orquestrador lê
 * `meta.pending` da última mensagem do assistente em `history` e executa a ação sem novo planejamento.
 */
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
import { computeCost } from "./pricing.js";
import type { ContentPart, LlmMessage, LlmToolCall, LlmUsage } from "./providers/types.js";
import { buildProviders } from "./providers/index.js";
import { classifyTier, ProviderUnavailableError, Router, type Tier } from "./router.js";

const MAX_ITERATIONS = 5;
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
      const msg = (err as Error).message;
      await audit(input.userId, tool.name, "error", { input: call.input, error: msg });
      return { summary: { name: tool.name, status: "error" }, content: `Erro na ferramenta: ${msg}`, isError: true };
    }
  }

  return {
    providers: () => router.providers(),

    async handle(input: OrchestratorInput): Promise<OrchestratorResult> {
      if (!providers.length || !router.hasCandidates()) return none();

      const spent = await repos.usage.costSince(input.userId, startOfUtcDay(now()));
      const tier = applyBudget(classifyTier(input.message, input.mode as ChatMode), spent, limit);

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

      // Confirmação: executa a ação pendente direto, sem consultar o modelo antes.
      if (input.confirm) {
        const lastAssistant = [...input.history].reverse().find((m) => m.role === "assistant");
        const pending = lastAssistant?.meta?.pending as { tool?: string; input?: unknown } | undefined;
        if (pending?.tool) {
          const id = "pending_action";
          const r = await runTool(input, { id, name: pending.tool, input: pending.input }, true);
          summaries.push(r.summary);
          convo.push({ role: "assistant", content: [{ type: "tool_use", id, name: pending.tool, input: pending.input ?? {} }] });
          convo.push({ role: "user", content: [{ type: "tool_result", toolUseId: id, content: r.content, isError: r.isError }] });
        }
      }

      let reply = "";
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        let out;
        try {
          out = await router.chat(tier, { system, messages: convo, tools: toolDefs, maxTokens: MAX_OUTPUT_TOKENS });
        } catch (err) {
          if (err instanceof ProviderUnavailableError) throw err;
          throw err;
        }
        provider = out.provider;
        model = out.model;
        const usage: LlmUsage = out.response.usage;
        const costUsd = computeCost(model, usage, env);
        total.inputTokens += usage.inputTokens + (usage.cacheReadTokens ?? 0);
        total.outputTokens += usage.outputTokens;
        total.costUsd += costUsd;
        await repos.usage.add({ userId: input.userId, provider, model, inputTokens: usage.inputTokens + (usage.cacheReadTokens ?? 0), outputTokens: usage.outputTokens, costUsd });

        const { text, toolCalls } = out.response;
        if (text) reply = text;
        if (!toolCalls.length) break;

        const parts: ContentPart[] = [];
        if (text) parts.push({ type: "text", text });
        for (const c of toolCalls) parts.push({ type: "tool_use", id: c.id, name: c.name, input: c.input, meta: c.meta });
        convo.push({ role: "assistant", content: parts });

        const results: ContentPart[] = [];
        for (const c of toolCalls) {
          const r = await runTool(input, c, false);
          summaries.push(r.summary);
          if (r.pending) {
            return {
              provider,
              model,
              reply: text || r.pending.summary,
              toolCalls: summaries,
              pendingConfirmation: { summary: r.pending.summary },
              pendingAction: { tool: c.name, input: c.input },
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
