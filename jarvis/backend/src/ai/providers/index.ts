import { AnthropicProvider } from "./anthropic.js";
import { GeminiProvider } from "./gemini.js";
import { OpenAiCompatibleProvider } from "./openaiCompatible.js";
import type { LlmProvider } from "./types.js";

export * from "./types.js";

/** Cria somente provedores cuja key própria existe (sem compartilhar keys). */
export function buildProviders(env: NodeJS.ProcessEnv, fetchImpl?: typeof fetch): LlmProvider[] {
  const out: LlmProvider[] = [];
  const k = (name: string) => (env[name] ?? "").trim() || undefined;
  if (k("ANTHROPIC_API_KEY")) out.push(new AnthropicProvider(k("ANTHROPIC_API_KEY")!));
  if (k("OPENAI_API_KEY")) {
    out.push(new OpenAiCompatibleProvider({ id: "openai", apiKey: k("OPENAI_API_KEY")!, baseUrl: "https://api.openai.com/v1", fetchImpl, maxTokensField: "max_completion_tokens" }));
  }
  if (k("DEEPSEEK_API_KEY")) {
    out.push(new OpenAiCompatibleProvider({ id: "deepseek", apiKey: k("DEEPSEEK_API_KEY")!, baseUrl: "https://api.deepseek.com/v1", fetchImpl }));
  }
  if (k("AI_GATEWAY_API_KEY")) {
    out.push(new OpenAiCompatibleProvider({ id: "gateway", apiKey: k("AI_GATEWAY_API_KEY")!, baseUrl: "https://ai-gateway.vercel.sh/v1", fetchImpl }));
  }
  if (k("GEMINI_API_KEY")) out.push(new GeminiProvider(k("GEMINI_API_KEY")!, fetchImpl));
  return out;
}
