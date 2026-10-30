import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGateway, type LanguageModel } from "ai";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { aiUsage } from "../db/schema";
import { AppError } from "../errors";

/** Ferramentas do FRAME AI. Cada uma tem um prompt de sistema próprio — a IA apoia, não assina a obra. */
export const AI_TOOLS = {
  ideias: {
    label: "Ideias de ensaio",
    hint: "Ex.: ensaio de retrato em dia chuvoso, só com luz de janela",
    system: "Sugira ideias de ensaios fotográficos ou de vídeo originais e executáveis, com conceito, locação, luz, figurino/props e 3 referências de estilo descritas em palavras (sem citar imagens específicas protegidas).",
  },
  roteiro: {
    label: "Roteiro de vídeo",
    hint: "Ex.: reels de 30s mostrando o making of de um ensaio",
    system: "Escreva roteiros curtos para vídeo com cenas numeradas, duração estimada por cena, enquadramento sugerido, áudio/narração e transições. Seja prático para quem filma com orçamento limitado.",
  },
  conceito: {
    label: "Conceito visual",
    hint: "Ex.: campanha para uma cafeteria de bairro",
    system: "Desenvolva conceitos visuais: mood, paleta (com HEX), tipografia sugerida, linguagem de câmera e direção de arte. Explique o porquê de cada escolha.",
  },
  cenas: {
    label: "Lista de cenas / shot list",
    hint: "Ex.: casamento ao ar livre, cerimônia de 40 minutos",
    system: "Gere shot lists organizadas por momento, com prioridade (essencial/desejável), lente sugerida e observações de luz. Formate como lista.",
  },
  briefing: {
    label: "Briefing criativo",
    hint: "Ex.: cliente quer fotos de produto para loja online de cerâmica",
    system: "Transforme pedidos soltos em briefings criativos: objetivo, público, entregáveis, formatos, referências desejadas, prazos e perguntas que faltam ao cliente.",
  },
  legenda: {
    label: "Título e descrição",
    hint: "Ex.: retrato em contraluz da minha avó na cozinha",
    system: "Sugira 5 títulos e 2 descrições curtas para publicar um trabalho criativo. Tom autêntico, sem clichês de marketing e sem hashtags em excesso (no máximo 5).",
  },
  feedback: {
    label: "Perguntas para feedback",
    hint: "Ex.: quero feedback sobre o color grading de um curta",
    system: "Gere perguntas específicas e construtivas que o criador pode fazer à comunidade para receber feedback útil sobre o trabalho descrito.",
  },
  portfolio: {
    label: "Apresentar portfólio",
    hint: "Ex.: sou fotógrafa de eventos querendo migrar para retrato",
    system: "Sugira como organizar e apresentar um portfólio: seleção, ordem, categorias, bio curta e chamadas para contato. Seja honesto sobre o que remover.",
  },
} as const;
export type AiTool = keyof typeof AI_TOOLS;

const BASE_SYSTEM = `Você é o FRAME AI, assistente de criadores visuais (fotografia, vídeo, edição, design) no Brasil.
Responda em português brasileiro, de forma direta e organizada (use listas e subtítulos curtos).
Você ajuda a planejar e pensar; a autoria é sempre do criador. Não afirme ter visto imagens, não invente fatos sobre pessoas reais
e não sugira copiar obras de terceiros. Se o pedido envolver técnicas de edição, lembre que resultados dependem do material de origem.
Recuse pedidos fora do contexto criativo ou que envolvam conteúdo ilegal, assédio ou violação de direitos autorais.`;

export function systemPromptFor(tool: AiTool): string {
  return `${BASE_SYSTEM}\n\nTarefa: ${AI_TOOLS[tool].system}`;
}

export function aiConfig() {
  const modelId = process.env.FRAME_AI_MODEL ?? "anthropic/claude-haiku-5-5";
  const [provider, ...rest] = modelId.split("/");
  const modelName = rest.join("/");
  let model: LanguageModel | null = null;
  if (process.env.AI_GATEWAY_API_KEY) model = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY })(modelId);
  else if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) model = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(modelName);
  else if (provider === "openai" && process.env.OPENAI_API_KEY) model = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(modelName);
  return {
    modelId,
    model,
    enabled: model !== null,
    dailyLimit: Number(process.env.FRAME_AI_DAILY_LIMIT ?? 30),
    globalBudgetUsd: Number(process.env.FRAME_AI_GLOBAL_DAILY_BUDGET_USD ?? 5),
    // Preço estimado em USD por milhão de tokens (ajuste para o modelo escolhido).
    priceInput: Number(process.env.FRAME_AI_PRICE_INPUT_PER_MTOK ?? 1),
    priceOutput: Number(process.env.FRAME_AI_PRICE_OUTPUT_PER_MTOK ?? 5),
  };
}

function startOfDay() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function aiQuota(userId: string) {
  const cfg = aiConfig();
  const [mine] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), gte(aiUsage.createdAt, startOfDay())));
  return { used: mine?.n ?? 0, limit: cfg.dailyLimit };
}

/** Verifica limite diário por usuário e teto global de custo antes de chamar o modelo. */
export async function assertAiAllowed(userId: string) {
  const cfg = aiConfig();
  if (!cfg.enabled) throw new AppError("UNAVAILABLE", "O FRAME AI ainda não foi configurado neste ambiente.");
  const { used, limit } = await aiQuota(userId);
  if (used >= limit) throw new AppError("RATE_LIMITED", `Você usou as ${limit} consultas de hoje. O limite renova à meia-noite (UTC).`);
  const [spent] = await db
    .select({ usd: sql<string>`coalesce(sum(${aiUsage.costUsd}), 0)` })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, startOfDay()));
  if (Number(spent?.usd ?? 0) >= cfg.globalBudgetUsd) {
    throw new AppError("UNAVAILABLE", "O FRAME AI atingiu o limite diário de uso da plataforma. Tente novamente amanhã.");
  }
  return cfg;
}

function estimateCost(inputTokens: number, outputTokens: number) {
  const cfg = aiConfig();
  return ((inputTokens * cfg.priceInput + outputTokens * cfg.priceOutput) / 1_000_000).toFixed(6);
}

/**
 * Reserva o uso ANTES de chamar o modelo: a cota conta mesmo se o stream for abortado.
 * O custo é estimado com o pior caso (maxOutputTokens) e corrigido ao terminar.
 */
export async function reserveAiUsage(input: { userId: string; feature: string; model: string; estimatedInput: number; maxOutput: number }) {
  const [row] = await db
    .insert(aiUsage)
    .values({
      userId: input.userId,
      feature: input.feature,
      model: input.model,
      inputTokens: input.estimatedInput,
      outputTokens: input.maxOutput,
      costUsd: estimateCost(input.estimatedInput, input.maxOutput),
    })
    .returning({ id: aiUsage.id });
  return row!.id;
}

export async function settleAiUsage(id: string, result: { inputTokens: number; outputTokens: number; status: "ok" | "error" }) {
  await db
    .update(aiUsage)
    .set({ ...result, costUsd: estimateCost(result.inputTokens, result.outputTokens) })
    .where(eq(aiUsage.id, id));
}
