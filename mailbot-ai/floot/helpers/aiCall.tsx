import { flootAi, FlootAiOutOfCreditsError, FlootAiRateLimitError } from "@floot/ai";
import type { z } from "zod";
import { db } from "./db";
import type { MbAgent } from "./schema";
import { userPrefs } from "./userPrefs";

// Única porta de saída para a IA: orçamento diário por usuário, registro de consumo
// por agente, saída validada por schema. Modelos:
//   fast  = gpt-6-luna (econômico e rápido: triagem, resumos, chat simples)
//   smart = gpt-6-sol  (análise mais profunda: perguntas analíticas, resumo semanal)

export type Tier = "fast" | "smart";
export const MODELS: Record<Tier, string> = { fast: "gpt-6-luna", smart: "gpt-6-sol" };

export class BudgetExceeded extends Error {
  constructor() { super("Limite diário de uso de IA atingido"); }
}
export class AiUnavailable extends Error {
  constructor(message: string, public code?: string) { super(message); }
}

/** Heurística determinística de complexidade (sem IA). */
export function chatTier(question: string, contextItems: number): Tier {
  const analytical = /\b(compar|analis|por que|porque|explique|estrat[eé]g|priorize|tend[eê]ncia|padr[aã]o|relacion)/i.test(question);
  return analytical || question.length > 280 || contextItems > 10 ? "smart" : "fast";
}

async function spentToday(userId: number): Promise<number> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const r = await db
    .selectFrom("aiUsage")
    .select((eb) => eb.fn.sum<string>("credits").as("total"))
    .where("userId", "=", userId)
    .where("createdAt", ">=", since)
    .executeTakeFirst();
  return Number(r?.total ?? 0);
}

type Args<T> = {
  agent: MbAgent;
  userId: number;
  tier: Tier;
  instructions: string;
  input: string;
  maxOutputTokens: number;
  /** JSON schema estrito (formato OpenAI) + zod para validar a resposta */
  json?: { name: string; schema: Record<string, unknown>; zod: z.ZodType<T> };
};

export async function aiCall<T = string>(args: Args<T>): Promise<T> {
  const prefs = await userPrefs.get(args.userId);
  if ((await spentToday(args.userId)) >= Number(prefs.aiDailyCreditBudget)) throw new BudgetExceeded();
  const model = MODELS[args.tier];
  let r: Awaited<ReturnType<typeof flootAi.chat>>;
  try {
    r = await flootAi.chat({
      model,
      instructions: args.instructions,
      input: args.input,
      max_output_tokens: args.maxOutputTokens,
      reasoning: { effort: args.tier === "fast" ? "low" : "medium" },
      ...(args.json ? { text: { format: { type: "json_schema", name: args.json.name, schema: args.json.schema, strict: true } } } : {}),
    } as Parameters<typeof flootAi.chat>[0]);
  } catch (e) {
    if (e instanceof FlootAiOutOfCreditsError) throw new AiUnavailable("IA temporariamente indisponível.", "OUT_OF_CREDITS");
    if (e instanceof FlootAiRateLimitError) throw new AiUnavailable("Muitas chamadas à IA neste minuto. Tente novamente em instantes.", "RATE_LIMIT");
    throw e;
  }
  const res = r as unknown as { output_text?: string; status?: string; flootCredits?: { consumed: number } };
  await db
    .insertInto("aiUsage")
    .values({ userId: args.userId, agent: args.agent, model, credits: res.flootCredits?.consumed ?? 0 })
    .execute();
  const text = (res.output_text ?? "").trim();
  if (res.status && res.status !== "completed") throw new AiUnavailable("Resposta da IA incompleta.");
  if (!text) throw new AiUnavailable("A IA não retornou resposta.");
  if (!args.json) return text as T;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AiUnavailable("Resposta da IA fora do formato esperado.");
  }
  const v = args.json.zod.safeParse(parsed);
  if (!v.success) throw new AiUnavailable("Resposta da IA fora do formato esperado.");
  return v.data;
}
