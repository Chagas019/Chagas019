import type { LlmUsage } from "./providers/types.js";

/** USD por 1M tokens. */
export interface ModelPrice {
  in: number;
  out: number;
  cacheRead: number;
}

/** Fonte: catálogo Vercel AI Gateway, lido em 2026-11-20 (≤100k tokens de entrada). */
export const DEFAULT_PRICES: Record<string, ModelPrice> = {
  "claude-opus-5.5": { in: 4, out: 20, cacheRead: 0.2 },
  "claude-sonnet-5.5": { in: 2, out: 10, cacheRead: 0.1 },
  "claude-haiku-5.5": { in: 0.1, out: 0.5, cacheRead: 0.01 },
};

/** "anthropic/claude-haiku-5.5" | "claude-haiku-5-5" → "claude-haiku-5.5". */
export function normalizeModelId(model: string): string {
  const last = model.slice(model.lastIndexOf("/") + 1).toLowerCase();
  return last.replace(/-(\d)-(\d)$/, "-$1.$2");
}

const warned = new Set<string>();

export function priceFor(model: string, env: NodeJS.ProcessEnv = process.env): ModelPrice | undefined {
  let table: Record<string, ModelPrice> = DEFAULT_PRICES;
  const raw = env.MODEL_PRICES_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, Partial<ModelPrice>>;
      const over: Record<string, ModelPrice> = {};
      for (const [k, v] of Object.entries(parsed)) {
        over[normalizeModelId(k)] = { in: Number(v.in ?? 0), out: Number(v.out ?? 0), cacheRead: Number(v.cacheRead ?? v.in ?? 0) };
      }
      table = { ...DEFAULT_PRICES, ...over };
    } catch {
      /* JSON inválido: usa tabela padrão */
    }
  }
  return table[normalizeModelId(model)];
}

/** Preço mais caro conhecido (tabela + MODEL_PRICES_JSON): fallback conservador para modelos sem preço. */
export function maxKnownPrice(env: NodeJS.ProcessEnv = process.env): ModelPrice {
  const all = [...Object.values(DEFAULT_PRICES)];
  const raw = env.MODEL_PRICES_JSON;
  if (raw) {
    try {
      for (const v of Object.values(JSON.parse(raw) as Record<string, Partial<ModelPrice>>)) all.push({ in: Number(v.in ?? 0), out: Number(v.out ?? 0), cacheRead: Number(v.cacheRead ?? v.in ?? 0) });
    } catch { /* ignora */ }
  }
  return {
    in: Math.max(...all.map((p) => p.in || 0)),
    out: Math.max(...all.map((p) => p.out || 0)),
    cacheRead: Math.max(...all.map((p) => p.cacheRead || 0)),
  };
}

/** Custo máximo estimado de uma chamada (reserva de orçamento): entrada estimada + maxTokens de saída, no preço mais caro. */
export function estimateMaxCost(estInputTokens: number, maxOutputTokens: number, env: NodeJS.ProcessEnv = process.env): number {
  const p = maxKnownPrice(env);
  return (estInputTokens * p.in + maxOutputTokens * p.out) / 1_000_000;
}

export function computeCost(model: string, usage: LlmUsage, env: NodeJS.ProcessEnv = process.env): number {
  let p = priceFor(model, env);
  if (!p) {
    if (!warned.has(model)) {
      warned.add(model);
      console.warn(`[jarvis/pricing] sem preço para o modelo "${model}"; usando o preço mais caro conhecido (conservador)`);
    }
    p = maxKnownPrice(env);
  }
  return (usage.inputTokens * p.in + (usage.cacheReadTokens ?? 0) * p.cacheRead + usage.outputTokens * p.out) / 1_000_000;
}

/** Só para testes. */
export function _resetPricingWarnings(): void {
  warned.clear();
}
