/** Formato neutro de mensagens/respostas entre provedores de LLM. */
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown; /** dado opaco do provedor (ex.: thoughtSignature do Gemini) */ meta?: unknown }
  | { type: "tool_result"; toolUseId: string; content: string; isError?: boolean };

export interface LlmMessage {
  role: "user" | "assistant";
  content: ContentPart[];
}

export interface LlmToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LlmRequest {
  model: string;
  system: string;
  messages: LlmMessage[];
  tools: LlmToolDef[];
  maxTokens: number;
}

export interface LlmToolCall {
  id: string;
  name: string;
  input: unknown;
  meta?: unknown;
}

export type StopReason = "end_turn" | "tool_use" | "max_tokens" | "other";

export interface LlmUsage {
  /** Tokens de entrada NÃO vindos de cache. */
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
}

export interface LlmResponse {
  text: string;
  toolCalls: LlmToolCall[];
  stopReason: StopReason;
  usage: LlmUsage;
}

export interface LlmProvider {
  id: string;
  chat(req: LlmRequest): Promise<LlmResponse>;
}

export type ProviderErrorKind = "auth" | "retryable" | "fatal";

export class ProviderError extends Error {
  constructor(message: string, public readonly kind: ProviderErrorKind, public readonly status?: number) {
    super(message);
    this.name = "ProviderError";
  }
}

export function kindFromStatus(status: number): ProviderErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 408 || status === 409 || status === 425 || status === 429 || status >= 500) return "retryable";
  return "fatal";
}

export const DEFAULT_TIMEOUT_MS = 60_000;
