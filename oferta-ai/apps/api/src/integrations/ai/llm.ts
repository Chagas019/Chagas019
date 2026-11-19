import Anthropic from "@anthropic-ai/sdk";
import { resolveIntegration } from "../store";
import { logger } from "../../lib/core";

/**
 * Cliente de IA com fallback de modelos.
 * 1) Modelo principal (padrão claude-opus-5-5) com fallback de recusa do lado do servidor (fallbacks: "default").
 * 2) Em erro retryável/indisponibilidade, tenta os modelos de AI_FALLBACK_MODELS em ordem.
 * 3) Se nenhum modelo responder, o chamador usa o template determinístico (sem IA).
 */
export interface JsonCallResult<T> {
  data: T;
  model: string;
}

export class LlmUnavailableError extends Error {}

const SERVER_FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5", "claude-opus-5", "claude-fable-5-2", "claude-fable-5-1"]);

export async function getLlm() {
  const r = await resolveIntegration("ANTHROPIC");
  if (!r.creds.apiKey) return null;
  const models = [r.config.model || "claude-opus-5-5", ...(r.config.fallbackModels || "").split(",")]
    .map((m) => m.trim())
    .filter(Boolean);
  return new LlmClient(new Anthropic({ apiKey: r.creds.apiKey, maxRetries: 2, timeout: 60_000 }), [...new Set(models)]);
}

export class LlmClient {
  constructor(private readonly client: Anthropic, private readonly models: string[], private readonly effort: "low" | "medium" | "high" = "low") {}

  async json<T>(opts: { system: string; user: string; schema: Record<string, unknown>; maxTokens?: number }): Promise<JsonCallResult<T>> {
    const errors: string[] = [];
    for (const model of this.models) {
      try {
        const useServerFallback = SERVER_FALLBACK_MODELS.has(model);
        const res = await this.client.beta.messages.create({
          model,
          max_tokens: opts.maxTokens ?? 4000,
          system: opts.system,
          messages: [{ role: "user", content: opts.user }],
          output_config: { effort: this.effort, format: { type: "json_schema", schema: opts.schema } },
          ...(useServerFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
        });
        if (res.stop_reason === "refusal") {
          errors.push(`${model}: recusa`);
          continue;
        }
        if (res.stop_reason === "max_tokens") {
          errors.push(`${model}: resposta truncada`);
          continue;
        }
        const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
        return { data: JSON.parse(text) as T, model: res.model };
      } catch (err) {
        if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
          throw new LlmUnavailableError(`Credencial de IA inválida: ${err.message}`);
        }
        if (err instanceof Anthropic.BadRequestError) {
          errors.push(`${model}: requisição inválida (${err.message})`);
        } else if (err instanceof Anthropic.RateLimitError) {
          errors.push(`${model}: limite de taxa`);
        } else if (err instanceof Anthropic.APIError) {
          errors.push(`${model}: HTTP ${err.status ?? "?"} ${err.message}`);
        } else if (err instanceof SyntaxError) {
          errors.push(`${model}: JSON inválido`);
        } else {
          errors.push(`${model}: ${(err as Error).message}`);
        }
        logger.warn({ model, err: errors[errors.length - 1] }, "falha no modelo, tentando fallback");
      }
    }
    throw new LlmUnavailableError(`Nenhum modelo respondeu: ${errors.join(" | ")}`);
  }
}
