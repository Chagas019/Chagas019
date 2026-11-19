import { env } from '../env';

// Model routing por complexidade: modelo econômico para triagem/tarefas simples,
// modelo mais capaz apenas quando a pergunta exige análise.
export type Tier = 'fast' | 'smart';

export function modelFor(tier: Tier): string {
  return tier === 'fast' ? env.modelFast() : env.modelSmart();
}

/** ID do modelo no provedor: a Vercel AI Gateway usa "anthropic/claude-haiku-5.5". */
export function providerModelId(model: string, provider: 'anthropic' | 'gateway'): string {
  if (provider === 'anthropic' || model.includes('/')) return model;
  return `anthropic/${model.replace(/-(\d+)-(\d+)$/, '-$1.$2')}`;
}

// US$ por 1M tokens (entrada, saída, leitura de cache). Fonte: tabela de preços da Anthropic (nov/2026).
const PRICES: Record<string, { in: number; out: number; cacheRead: number }> = {
  'claude-haiku-5-5': { in: 0.10, out: 0.50, cacheRead: 0.01 },
  'claude-sonnet-5-5': { in: 2.0, out: 10.0, cacheRead: 0.10 },
  'claude-opus-5-5': { in: 4.0, out: 20.0, cacheRead: 0.20 },
};

export function costUsd(model: string, usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }): number {
  const key = model.replace(/^anthropic\//, '').replace(/(\d+)\.(\d+)$/, '$1-$2');
  const p = PRICES[key] ?? PRICES['claude-sonnet-5-5'];
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  return (usage.input_tokens * p.in + cacheWrite * p.in * 1.25 + cacheRead * p.cacheRead + usage.output_tokens * p.out) / 1_000_000;
}

/** Heurística determinística de complexidade da pergunta do chat (sem IA). */
export function chatTier(question: string, contextItems: number): Tier {
  const analytical = /\b(compar|analis|por que|porque|explique|estrat[eé]g|priorize|tend[eê]ncia|padr[aã]o|relacion)/i.test(question);
  return analytical || question.length > 280 || contextItems > 10 ? 'smart' : 'fast';
}
