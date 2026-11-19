import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod/v4';
import { env } from '../env';
import type { Repo } from '../data/repo';
import type { AgentName } from '../data/types';
import { costUsd, providerModelId } from './models';

export class BudgetExceededError extends Error {
  constructor() { super('Limite diário de uso de IA atingido'); this.name = 'BudgetExceededError'; }
}
export class AiUnavailableError extends Error {
  constructor(msg = 'IA indisponível') { super(msg); this.name = 'AiUnavailableError'; }
}

export interface LlmRequest<T> {
  agent: AgentName;
  userId: string;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  effort?: 'low' | 'medium' | 'high';
  schema?: z.ZodType<T>;
}

export interface Llm {
  /** Retorna texto ou objeto validado pelo schema. Registra consumo e respeita o orçamento diário. */
  run<T = string>(req: LlmRequest<T>): Promise<T>;
}

function startOfUtcDay(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Extrai o primeiro objeto JSON de um texto (tolerante a cercas ```json). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no_json');
  return JSON.parse(raw.slice(start, end + 1));
}

/**
 * Cliente da IA. Provedor configurável:
 * - ANTHROPIC_API_KEY definida: API da Anthropic direto.
 * - Caso contrário: Vercel AI Gateway (AI_GATEWAY_API_KEY ou token OIDC automático do deploy na Vercel).
 */
async function defaultClient(): Promise<{ client: Anthropic; provider: 'anthropic' | 'gateway' }> {
  if (env.aiProvider() === 'anthropic') return { client: new Anthropic({ maxRetries: 3 }), provider: 'anthropic' };
  let apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    const { getVercelOidcToken } = await import('@vercel/oidc');
    apiKey = await getVercelOidcToken();
  }
  return { client: new Anthropic({ apiKey, baseURL: 'https://ai-gateway.vercel.sh', maxRetries: 3 }), provider: 'gateway' };
}

export class AnthropicLlm implements Llm {
  constructor(private repo: Repo, private factory: () => Promise<{ client: Anthropic; provider: 'anthropic' | 'gateway' }> = defaultClient) {}

  async run<T = string>(req: LlmRequest<T>): Promise<T> {
    const prefs = await this.repo.getPrefs(req.userId);
    const spent = await this.repo.aiCostSince(req.userId, startOfUtcDay());
    if (spent >= Number(prefs.ai_daily_budget_usd)) throw new BudgetExceededError();

    let client: Anthropic; let provider: 'anthropic' | 'gateway';
    try { ({ client, provider } = await this.factory()); } catch { throw new AiUnavailableError('IA não configurada no servidor'); }
    const model = providerModelId(req.model, provider);

    const system = req.schema
      ? `${req.system}\n\nResponda SOMENTE com um objeto JSON válido conforme o formato pedido, sem texto fora do JSON.`
      : req.system;

    let message: Anthropic.Message;
    try {
      message = await client.messages.create({
        model,
        max_tokens: req.maxTokens,
        // system estável primeiro + cache_control: reaproveita o prefixo entre chamadas
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: req.user }],
        output_config: req.schema ? { effort: req.effort ?? 'low', format: zodOutputFormat(req.schema) } : { effort: req.effort ?? 'low' },
      });
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new AiUnavailableError('Credencial da IA inválida ou sem permissão');
      if (e instanceof Anthropic.RateLimitError) throw new AiUnavailableError('IA temporariamente sobrecarregada');
      throw e;
    }

    await this.repo.recordUsage({
      user_id: req.userId,
      agent: req.agent,
      model: req.model,
      input_tokens: message.usage.input_tokens + (message.usage.cache_creation_input_tokens ?? 0),
      output_tokens: message.usage.output_tokens,
      cache_read_tokens: message.usage.cache_read_input_tokens ?? 0,
      cost_usd: costUsd(req.model, message.usage),
    });

    if (message.stop_reason === 'refusal') throw new AiUnavailableError('A IA recusou processar este conteúdo');
    if (message.stop_reason === 'max_tokens') throw new AiUnavailableError('Resposta da IA excedeu o limite de tokens');
    const text = message.content.filter((b) => b.type === 'text').map((b) => (b as Anthropic.TextBlock).text).join('\n').trim();
    if (!req.schema) return text as T;
    // validação própria (independe do provedor aplicar o formato estruturado)
    let parsed: unknown;
    try { parsed = extractJson(text); } catch { throw new AiUnavailableError('Resposta da IA fora do formato esperado'); }
    const r = req.schema.safeParse(parsed);
    if (!r.success) throw new AiUnavailableError('Resposta da IA fora do formato esperado');
    return r.data;
  }
}
