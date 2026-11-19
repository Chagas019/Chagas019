import type { Llm, LlmRequest } from '../../src/lib/ai/llm';
import { BudgetExceededError } from '../../src/lib/ai/llm';
import type { MemoryRepo } from './memory-repo';

/** LLM falso: responde via função e registra consumo como o real (orçamento incluído). */
export class FakeLlm implements Llm {
  calls: LlmRequest<unknown>[] = [];
  constructor(private repo: MemoryRepo, private responder: (req: LlmRequest<unknown>) => unknown, private costPerCall = 0.001) {}
  async run<T>(req: LlmRequest<T>): Promise<T> {
    const prefs = await this.repo.getPrefs(req.userId);
    const d = new Date(); d.setUTCHours(0, 0, 0, 0);
    if ((await this.repo.aiCostSince(req.userId, d.toISOString())) >= prefs.ai_daily_budget_usd) throw new BudgetExceededError();
    this.calls.push(req as LlmRequest<unknown>);
    await this.repo.recordUsage({ user_id: req.userId, agent: req.agent, model: req.model, input_tokens: 100, output_tokens: 50, cache_read_tokens: 0, cost_usd: this.costPerCall });
    return this.responder(req as LlmRequest<unknown>) as T;
  }
}

/** Extrai os refs (e1, e2...) enviados ao modelo de triagem. */
export function refsIn(prompt: string): string[] {
  return [...prompt.matchAll(/ref="(e\d+)"/g)].map((m) => m[1]);
}
