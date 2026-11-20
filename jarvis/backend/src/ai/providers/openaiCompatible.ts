import { ProviderError, kindFromStatus, DEFAULT_TIMEOUT_MS, type LlmMessage, type LlmProvider, type LlmRequest, type LlmResponse, type StopReason } from "./types.js";

export interface OpenAiCompatOptions {
  id: string;
  /** Chave fixa ou função que obtém um token (ex.: OIDC da Vercel). */
  apiKey: string | (() => Promise<string>);
  baseUrl: string;
  fetchImpl?: typeof fetch;
  /** OpenAI atual usa max_completion_tokens; demais usam max_tokens. */
  maxTokensField?: "max_tokens" | "max_completion_tokens";
  timeoutMs?: number;
}

export function toOpenAiMessages(system: string, messages: LlmMessage[]): unknown[] {
  const out: unknown[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role === "assistant") {
      const text = m.content.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("");
      const calls = m.content.filter((p) => p.type === "tool_use").map((p) => {
        const c = p as { id: string; name: string; input: unknown };
        return { id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.input ?? {}) } };
      });
      out.push({ role: "assistant", content: text || null, ...(calls.length ? { tool_calls: calls } : {}) });
    } else {
      // tool_result vira mensagens role=tool (devem vir antes de qualquer texto do usuário)
      for (const p of m.content) if (p.type === "tool_result") out.push({ role: "tool", tool_call_id: p.toolUseId, content: p.content });
      const text = m.content.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("");
      if (text) out.push({ role: "user", content: text });
    }
  }
  return out;
}

export function parseOpenAiResponse(json: any): LlmResponse {
  const choice = json?.choices?.[0];
  const msg = choice?.message ?? {};
  const toolCalls = (Array.isArray(msg.tool_calls) ? msg.tool_calls : []).map((c: any, i: number) => {
    let input: unknown = {};
    try {
      input = c?.function?.arguments ? JSON.parse(c.function.arguments) : {};
    } catch {
      input = {};
    }
    return { id: String(c?.id ?? `call_${i}`), name: String(c?.function?.name ?? ""), input };
  });
  const fr = choice?.finish_reason;
  const stopReason: StopReason = toolCalls.length || fr === "tool_calls" ? "tool_use" : fr === "length" ? "max_tokens" : fr === "stop" ? "end_turn" : "other";
  const u = json?.usage ?? {};
  const cached = Number(u.prompt_tokens_details?.cached_tokens ?? u.prompt_cache_hit_tokens ?? 0);
  return {
    text: typeof msg.content === "string" ? msg.content : "",
    toolCalls,
    stopReason,
    usage: { inputTokens: Math.max(0, Number(u.prompt_tokens ?? 0) - cached), outputTokens: Number(u.completion_tokens ?? 0), cacheReadTokens: cached },
  };
}

export class OpenAiCompatibleProvider implements LlmProvider {
  readonly id: string;
  private readonly f: typeof fetch;
  constructor(private readonly o: OpenAiCompatOptions) {
    this.id = o.id;
    this.f = o.fetchImpl ?? fetch;
  }

  async chat(req: LlmRequest): Promise<LlmResponse> {
    const body: Record<string, unknown> = {
      model: req.model,
      messages: toOpenAiMessages(req.system, req.messages),
      [this.o.maxTokensField ?? "max_tokens"]: req.maxTokens,
    };
    if (req.tools.length) {
      body.tools = req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } }));
    }
    let res: Response;
    try {
      res = await this.f(`${this.o.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${typeof this.o.apiKey === "string" ? this.o.apiKey : await this.o.apiKey()}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.o.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
    } catch (err) {
      throw new ProviderError(`${this.id}: ${(err as Error).message}`, "retryable");
    }
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      throw new ProviderError(`${this.id} HTTP ${res.status}: ${detail}`, kindFromStatus(res.status), res.status);
    }
    try {
      return parseOpenAiResponse(await res.json());
    } catch (err) {
      throw new ProviderError(`${this.id}: resposta inválida (${(err as Error).message})`, "retryable");
    }
  }
}
