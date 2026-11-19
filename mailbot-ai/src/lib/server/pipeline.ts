import type { Repo } from '../data/repo';
import type { AccountRow } from '../data/types';
import type { Llm } from '../ai/llm';
import type { GmailClient } from '../gmail/client';
import { syncAccount, type SyncResult } from '../gmail/sync';
import { runTriage, type TriageResult } from '../agents/triage';

/** Sincroniza (incremental/retomável) e aciona o MAIL TRIAGE só para mensagens novas. */
export async function syncAndTriage(repo: Repo, llm: Llm | null, gmail: GmailClient, account: AccountRow, opts: { maxMessages?: number; triageLimit?: number } = {}): Promise<{ sync: SyncResult; triage: TriageResult | null }> {
  const sync = await syncAccount(repo, gmail, account, { maxMessagesPerRun: opts.maxMessages ?? 250 });
  if (sync.status === 'reauth_required') return { sync, triage: null };
  const triage = await runTriage(repo, llm, account.user_id, { limit: opts.triageLimit ?? 48 });
  return { sync, triage };
}
