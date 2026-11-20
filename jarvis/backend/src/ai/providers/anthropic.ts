import Anthropic from "@anthropic-ai/sdk";
import { ProviderError, kindFromStatus, DEFAULT_TIMEOUT_MS, type LlmMessage, type LlmProvider, type LlmRequest, type LlmResponse, type StopReason } from "./types.js";

/** Subconjunto do cliente usado (permite injetar fake em testes). */
export interface AnthropicLike {
  messages: { create(params: any): Promise<any> };
}

export function toAnthropicMessages(messages: LlmMessage[]): unknown[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content.map((p) => {
      if (p.type === "text") return { type: "text", text: p.text };
      if (p.type === "tool_use") return { type: "tool_use", id: p.id, name: p.name, input: p.input ?? {} };
      return { type: "tool_result", tool_use_id: p.toolUseId, content: p.content, ...(p.isError ? { is_error: true } : {}) };
    }),
  }));
}

export function parseAnthropicResponse(res: any): LlmResponse {
  const blocks: any[] = Array.isArray(res?.content) ? res.content : [];
  const text = blocks.filter((b) => b.type === "text").map((b) => b.text).join("");
  const toolCalls = blocks.filter((b) => b.type === "tool_use").map((b) => ({ id: String(b.id), name: String(b.name), input: b.input ?? {} }));
  const sr = res?.stop_reason;
  const stopReason: StopReason = sr === "tool_use" ? "tool_use" : sr === "max_tokens" ? "max_tokens" : sr === "end_turn" || sr === "stop_sequence" ? "end_turn" : "other";
  const u = res?.usage ?? {};
  const cacheRead = Number(u.cache_read_input_tokens ?? 0);
  const cacheWrite = Number(u.cache_creation_input_tokens ?? 0);
  return {
    text,
    toolCalls,
    stopReason,
    usage: { inputTokens: Number(u.input_tokens ?? 0) + cacheWrite, outputTokens: Number(u.output_tokens ?? 0), cacheReadTokens: cacheRead },
  };
}

export class AnthropicProvider implements LlmProvider {
  readonly id = "anthropic";
  private readonly client: AnthropicLike;

  constructor(apiKey: string, client?: AnthropicLike) {
    this.client = client ?? (new Anthropic({ apiKey, maxRetries: 1, timeout: DEFAULT_TIMEOUT_MS }) as unknown as AnthropicLike);
  }

  async chat(req: LlmRequest): Promise<LlmResponse> {
    const tools = req.tools.map((t, i) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
      // cache_control no último bloco de tools cacheia todo o prefixo de tools
      ...(i === req.tools.length - 1 ? { cache_control: { type: "ephemeral" } } : {}),
    }));
    try {
      const res = await this.client.messages.create({
        model: req.model,
        max_tokens: req.maxTokens,
        system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
        ...(tools.length ? { tools } : {}),
        messages: toAnthropicMessages(req.messages),
      });
      return parseAnthropicResponse(res);
    } catch (err) {
      throw wrapAnthropicError(err);
    }
  }
}

function wrapAnthropicError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  const status = (err as { status?: number })?.status;
  const msg = (err as Error)?.message ?? String(err);
  if (typeof status === "number") return new ProviderError(`anthropic HTTP ${status}: ${msg}`, kindFromStatus(status), status);
  return new ProviderError(`anthropic: ${msg}`, "retryable"); // timeout/conexão
}
