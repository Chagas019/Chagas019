import Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';
import { toJSONSchema } from 'zod';
import { env } from '../../config/env.js';
import { IntegrationUnavailableError, PermanentError } from '../../lib/errors.js';

export interface LLMUsage { input: number; output: number }

export interface LLMJsonRequest<S extends z.ZodTypeAny> {
  system: string;
  prompt: string;
  schema: S;
  /** Permite ao modelo pesquisar na web (ferramenta oficial do servidor Anthropic). */
  webSearch?: { maxUses?: number; allowedDomains?: string[] };
  maxTokens?: number;
}

export interface LLMProvider {
  readonly name: string;
  json<S extends z.ZodTypeAny>(req: LLMJsonRequest<S>): Promise<{ data: z.infer<S>; usage: LLMUsage; sources: string[] }>;
}

/**
 * Provedor real: Claude via SDK oficial. Usa saída estruturada (JSON Schema) e,
 * quando pedido, a ferramenta de servidor web_search para pesquisa pública autorizada.
 */
export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude';
  private client: Anthropic;

  constructor(apiKey = env().ANTHROPIC_API_KEY, private model = env().ANTHROPIC_MODEL, private effort = env().ANTHROPIC_EFFORT) {
    if (!apiKey) throw new IntegrationUnavailableError('anthropic', 'ANTHROPIC_API_KEY não configurada.');
    this.client = new Anthropic({ apiKey, maxRetries: 3, timeout: 15 * 60_000 });
  }

  async json<S extends z.ZodTypeAny>(req: LLMJsonRequest<S>) {
    const schema = toJSONSchema(req.schema, { target: 'draft-7' }) as Record<string, unknown>;
    delete schema.$schema;
    const tools: any[] = [];
    if (req.webSearch) {
      tools.push({
        type: 'web_search_20260209',
        name: 'web_search',
        max_uses: req.webSearch.maxUses ?? 6,
        ...(req.webSearch.allowedDomains?.length ? { allowed_domains: req.webSearch.allowedDomains } : {}),
        user_location: { type: 'approximate', country: 'BR', timezone: 'America/Sao_Paulo' },
      });
    }

    let messages: any[] = [{ role: 'user', content: req.prompt }];
    let usage: LLMUsage = { input: 0, output: 0 };
    const sources = new Set<string>();
    let final: any;

    // Laço curto para continuar turnos pausados por ferramentas de servidor (pause_turn).
    for (let i = 0; i < 4; i++) {
      const stream = this.client.beta.messages.stream({
        model: this.model,
        max_tokens: req.maxTokens ?? 32000,
        system: req.system,
        messages,
        thinking: { type: 'adaptive' },
        output_config: { effort: this.effort, format: { type: 'json_schema', schema } },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        ...(tools.length ? { tools } : {}),
      } as any);
      final = await stream.finalMessage();
      usage = { input: usage.input + (final.usage?.input_tokens ?? 0), output: usage.output + (final.usage?.output_tokens ?? 0) };
      for (const block of final.content as any[]) {
        if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
          for (const r of block.content) if (r.url) sources.add(r.url);
        }
      }
      if (final.stop_reason !== 'pause_turn') break;
      messages = [...messages, { role: 'assistant', content: final.content }];
    }

    if (final.stop_reason === 'refusal') throw new PermanentError('O modelo recusou a solicitação.', final.stop_details);
    if (final.stop_reason === 'max_tokens') throw new Error('Resposta do modelo truncada (max_tokens).');
    const text = (final.content as any[]).filter((b) => b.type === 'text').map((b) => b.text).join('');
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('O modelo não retornou JSON válido.');
    }
    const data = req.schema.parse(parsed);
    return { data, usage, sources: [...sources] };
  }
}

let override: LLMProvider | null = null;
/** Injeção de provedor (usado pelos testes automatizados). */
export function setLLMProvider(p: LLMProvider | null) {
  override = p;
}
export function getLLM(): LLMProvider {
  return override ?? new ClaudeProvider();
}
