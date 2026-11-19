import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod/v4';
import type { Repo } from '../data/repo';
import type { AgentName } from '../data/types';
import { costUsd } from './models';

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

export class AnthropicLlm implements Llm {
  private client: Anthropic;
  constructor(private repo: Repo, client?: Anthropic) {
    this.client = client ?? new Anthropic({ maxRetries: 3 });
  }

  async run<T = string>(req: LlmRequest<T>): Promise<T> {
    const prefs = await this.repo.getPrefs(req.userId);
    const spent = await this.repo.aiCostSince(req.userId, startOfUtcDay());
    if (spent >= Number(prefs.ai_daily_budget_usd)) throw new BudgetExceededError();

    const base = {
      model: req.model,
      max_tokens: req.maxTokens,
      // system estável primeiro + cache_control: reaproveita o prefixo entre chamadas
      system: [{ type: 'text' as const, text: req.system, cache_control: { type: 'ephemeral' as const } }],
      messages: [{ role: 'user' as const, content: req.user }],
      output_config: { effort: req.effort ?? 'low' },
    };

    let message: Anthropic.Message;
    let result: unknown;
    try {
      if (req.schema) {
        const parsed = await this.client.messages.parse({
          ...base,
          output_config: { ...base.output_config, format: zodOutputFormat(req.schema) },
        });
        message = parsed;
        result = parsed.parsed_output;
      } else {
        message = await this.client.messages.create(base);
        result = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      }
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) throw new AiUnavailableError('Chave da IA inválida');
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
    if (req.schema && result == null) throw new AiUnavailableError('Resposta da IA fora do formato esperado');
    return result as T;
  }
}
