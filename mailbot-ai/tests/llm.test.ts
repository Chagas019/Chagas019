import { describe, expect, it } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { AiUnavailableError, AnthropicLlm, BudgetExceededError, extractJson } from '../src/lib/ai/llm';
import { costUsd, providerModelId } from '../src/lib/ai/models';
import { MemoryRepo } from './helpers/memory-repo';

function fakeClient(text: string, opts: { stop?: string; throwErr?: Error } = {}) {
  const calls: any[] = [];
  const client = {
    messages: {
      create: async (body: any) => {
        calls.push(body);
        if (opts.throwErr) throw opts.throwErr;
        return { content: [{ type: 'text', text }], stop_reason: opts.stop ?? 'end_turn', usage: { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } };
      },
    },
  } as unknown as Anthropic;
  return { client, calls };
}

const U = 'u1';
const base = { agent: 'triage' as const, userId: U, model: 'claude-haiku-5-5', system: 'sys', user: 'oi', maxTokens: 500 };

describe('provedor de IA', () => {
  it('Vercel AI Gateway: converte o ID do modelo e registra consumo/custo', async () => {
    const repo = new MemoryRepo();
    const { client, calls } = fakeClient('{"ok": true}');
    const llm = new AnthropicLlm(repo, async () => ({ client, provider: 'gateway' }));
    const out = await llm.run({ ...base, schema: z.object({ ok: z.boolean() }) });
    expect(out).toEqual({ ok: true });
    expect(calls[0].model).toBe('anthropic/claude-haiku-5.5');
    expect(calls[0].system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(repo.usage[0]).toMatchObject({ agent: 'triage', model: 'claude-haiku-5-5' });
    expect(repo.usage[0].cost_usd).toBeCloseTo((1000 * 0.1 + 200 * 0.5) / 1e6);
  });
  it('API direta da Anthropic mantém o ID original', async () => {
    const { client, calls } = fakeClient('texto livre');
    const out = await new AnthropicLlm(new MemoryRepo(), async () => ({ client, provider: 'anthropic' })).run(base);
    expect(out).toBe('texto livre');
    expect(calls[0].model).toBe('claude-haiku-5-5');
  });
  it('JSON inválido ou fora do schema vira erro tratado (não grava lixo)', async () => {
    const { client } = fakeClient('{"ok": "talvez"}');
    await expect(new AnthropicLlm(new MemoryRepo(), async () => ({ client, provider: 'gateway' })).run({ ...base, schema: z.object({ ok: z.boolean() }) }))
      .rejects.toBeInstanceOf(AiUnavailableError);
  });
  it('recusa e truncamento viram erro tratado', async () => {
    for (const stop of ['refusal', 'max_tokens']) {
      const { client } = fakeClient('x', { stop });
      await expect(new AnthropicLlm(new MemoryRepo(), async () => ({ client, provider: 'gateway' })).run(base)).rejects.toBeInstanceOf(AiUnavailableError);
    }
  });
  it('orçamento diário esgotado: nem chama a IA', async () => {
    const repo = new MemoryRepo();
    await repo.updatePrefs(U, { ai_daily_budget_usd: 0 });
    const { client, calls } = fakeClient('x');
    await expect(new AnthropicLlm(repo, async () => ({ client, provider: 'gateway' })).run(base)).rejects.toBeInstanceOf(BudgetExceededError);
    expect(calls).toHaveLength(0);
  });
  it('IA não configurada no servidor', async () => {
    await expect(new AnthropicLlm(new MemoryRepo(), async () => { throw new Error('no oidc'); }).run(base)).rejects.toThrow(/não configurada/);
  });
  it('helpers', () => {
    expect(providerModelId('claude-sonnet-5-5', 'gateway')).toBe('anthropic/claude-sonnet-5.5');
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(costUsd('anthropic/claude-haiku-5.5', { input_tokens: 1e6, output_tokens: 0 })).toBeCloseTo(0.1);
  });
});
