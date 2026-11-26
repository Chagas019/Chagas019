import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { serverEnv } from "@/lib/env";
import { OutlineSchema, type Brief, type SermonOutline } from "./schema";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { verifyOutline } from "./verify";

export class AssistantError extends Error {
  constructor(message: string, public status = 500, public code = "erro") { super(message); }
}

let client: Anthropic | null = null;
function getClient() {
  if (!serverEnv.anthropicKey) throw new AssistantError("O assistente de IA não está configurado neste servidor.", 503, "ia-nao-configurada");
  if (!client) client = new Anthropic({ apiKey: serverEnv.anthropicKey, timeout: 280_000, maxRetries: 1 });
  return client;
}

export async function generateOutline(brief: Brief): Promise<SermonOutline> {
  const anthropic = getClient();
  try {
    const response = await anthropic.beta.messages.parse({
      model: serverEnv.aiModel,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: zodOutputFormat(OutlineSchema) },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildUserPrompt(brief) }],
    });
    if (response.stop_reason === "refusal") {
      throw new AssistantError("O modelo não pôde gerar este roteiro. Reformule o tema e tente novamente.", 422, "recusa");
    }
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      throw new AssistantError("A resposta da IA veio incompleta. Tente novamente ou reduza a duração.", 502, "incompleta");
    }
    return verifyOutline(response.parsed_output, brief, response.model);
  } catch (err) {
    if (err instanceof AssistantError) throw err;
    if (err instanceof Anthropic.AuthenticationError) throw new AssistantError("A chave da API de IA é inválida.", 503, "ia-chave-invalida");
    if (err instanceof Anthropic.RateLimitError) throw new AssistantError("Muitas solicitações à IA agora. Aguarde um minuto e tente de novo.", 429, "limite");
    if (err instanceof Anthropic.APIConnectionError) throw new AssistantError("Não foi possível conectar ao serviço de IA.", 502, "conexao");
    if (err instanceof Anthropic.APIError) throw new AssistantError(`O serviço de IA respondeu com erro (${err.status ?? "?"}).`, 502, "api");
    throw err;
  }
}
