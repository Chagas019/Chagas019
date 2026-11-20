import { ProviderError, kindFromStatus, DEFAULT_TIMEOUT_MS, type LlmMessage, type LlmProvider, type LlmRequest, type LlmResponse, type StopReason } from "./types.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Gemini aceita um subconjunto de JSON Schema: remove chaves não suportadas. */
export function sanitizeSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(sanitizeSchema);
  if (schema && typeof schema === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema)) {
      if (k === "additionalProperties" || k === "$schema") continue;
      out[k] = sanitizeSchema(v);
    }
    return out;
  }
  return schema;
}

export function toGeminiContents(messages: LlmMessage[]): unknown[] {
  const names = new Map<string, string>();
  for (const m of messages) for (const p of m.content) if (p.type === "tool_use") names.set(p.id, p.name);
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: m.content.map((p) => {
      if (p.type === "text") return { text: p.text };
      if (p.type === "tool_use") {
        const sig = (p.meta as { thoughtSignature?: string } | undefined)?.thoughtSignature;
        return { functionCall: { name: p.name, args: p.input ?? {} }, ...(sig ? { thoughtSignature: sig } : {}) };
      }
      return { functionResponse: { name: names.get(p.toolUseId) ?? "tool", response: p.isError ? { error: p.content } : { output: p.content } } };
    }),
  }));
}

export function parseGeminiResponse(json: any): LlmResponse {
  const cand = json?.candidates?.[0];
  const parts: any[] = Array.isArray(cand?.content?.parts) ? cand.content.parts : [];
  const text = parts.filter((p) => typeof p.text === "string" && !p.thought).map((p) => p.text).join("");
  const toolCalls = parts
    .filter((p) => p.functionCall)
    .map((p, i) => ({
      id: `gemini_${i}_${String(p.functionCall.name)}`,
      name: String(p.functionCall.name),
      input: p.functionCall.args ?? {},
      ...(p.thoughtSignature ? { meta: { thoughtSignature: p.thoughtSignature } } : {}),
    }));
  const fr = cand?.finishReason;
  const stopReason: StopReason = toolCalls.length ? "tool_use" : fr === "MAX_TOKENS" ? "max_tokens" : fr === "STOP" ? "end_turn" : "other";
  const u = json?.usageMetadata ?? {};
  const cached = Number(u.cachedContentTokenCount ?? 0);
  return {
    text,
    toolCalls,
    stopReason,
    usage: {
      inputTokens: Math.max(0, Number(u.promptTokenCount ?? 0) - cached),
      outputTokens: Number(u.candidatesTokenCount ?? 0) + Number(u.thoughtsTokenCount ?? 0),
      cacheReadTokens: cached,
    },
  };
}

export class GeminiProvider implements LlmProvider {
  readonly id = "gemini";
  private readonly f: typeof fetch;
  constructor(private readonly apiKey: string, fetchImpl?: typeof fetch, private readonly timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.f = fetchImpl ?? fetch;
  }

  async chat(req: LlmRequest): Promise<LlmResponse> {
    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: req.system }] },
      contents: toGeminiContents(req.messages),
      generationConfig: { maxOutputTokens: req.maxTokens },
    };
    if (req.tools.length) {
      body.tools = [{ functionDeclarations: req.tools.map((t) => ({ name: t.name, description: t.description, parameters: sanitizeSchema(t.inputSchema) })) }];
    }
    let res: Response;
    try {
      res = await this.f(`${BASE}/models/${encodeURIComponent(req.model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new ProviderError(`gemini: ${(err as Error).message}`, "retryable");
    }
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      throw new ProviderError(`gemini HTTP ${res.status}: ${detail}`, kindFromStatus(res.status), res.status);
    }
    try {
      return parseGeminiResponse(await res.json());
    } catch (err) {
      throw new ProviderError(`gemini: resposta inválida (${(err as Error).message})`, "retryable");
    }
  }
}
