import type { ParsedEmail } from '../gmail/parse';
import type {
  AccountRow, AgentName, Category, EmailRow, Preferences, Priority, ReportRow, SummaryRow, TokenRow, TriagedEmail,
} from './types';

export interface TriageFilter {
  since?: string;
  until?: string;
  priorities?: Priority[];
  categories?: Category[];
  needsReply?: boolean;
  isBill?: boolean;
  isAppointment?: boolean;
  hasDeadline?: boolean;
  minScore?: number;
  limit: number;
  orderBy?: 'score' | 'received';
}

export interface SearchQuery {
  text?: string;
  from?: string;
  since?: string;
  until?: string;
  limit: number;
}

export interface SyncCounters { fetched: number; added: number; updated: number; deleted: number }

/**
 * Acesso a dados usado pelo sync e pelos agentes. Toda operação recebe o user_id
 * explicitamente e filtra por ele (defesa em profundidade além do RLS).
 */
export interface Repo {
  // contas e tokens
  getAccountByUser(userId: string): Promise<AccountRow | null>;
  updateAccount(accountId: string, patch: Partial<AccountRow>): Promise<void>;
  getTokens(accountId: string): Promise<TokenRow | null>;
  saveAccessToken(accountId: string, accessTokenEnc: string, expiresAt: string): Promise<void>;

  // e-mails
  upsertEmails(userId: string, accountId: string, emails: ParsedEmail[]): Promise<{ added: number; updated: number }>;
  updateLabels(accountId: string, gmailId: string, labelIds: string[]): Promise<boolean>;
  deleteEmails(accountId: string, gmailIds: string[]): Promise<number>;
  pendingTriage(userId: string, limit: number): Promise<EmailRow[]>;
  setTriageStatus(userId: string, emailIds: string[], status: EmailRow['triage_status']): Promise<void>;
  saveSummaries(rows: SummaryRow[]): Promise<void>;
  senderStats(userId: string, fromEmails: string[]): Promise<Map<string, { received: number; userWroteTo: number }>>;

  // consultas
  queryTriaged(userId: string, f: TriageFilter): Promise<TriagedEmail[]>;
  awaitingReply(userId: string, limit: number): Promise<TriagedEmail[]>;
  searchEmails(userId: string, q: SearchQuery): Promise<(EmailRow & { summary: SummaryRow | null })[]>;
  periodStats(userId: string, since: string, until: string): Promise<{ total: number; important: number; pending: number; latestReceivedAt: string | null }>;

  // sync
  startSync(userId: string, accountId: string, kind: 'initial' | 'incremental' | 'full_resync'): Promise<string>;
  finishSync(syncId: string, status: 'success' | 'partial' | 'error', c: SyncCounters, error?: string): Promise<void>;

  // relatórios
  getReport(userId: string, kind: 'daily' | 'weekly', periodStart: string): Promise<ReportRow | null>;
  listReports(userId: string, kind: 'daily' | 'weekly', since: string, until: string): Promise<ReportRow[]>;
  saveReport(r: ReportRow): Promise<void>;

  // preferências
  getPrefs(userId: string): Promise<Preferences>;
  updatePrefs(userId: string, patch: Partial<Preferences>): Promise<void>;

  // IA: custo, cache
  aiCostSince(userId: string, sinceIso: string): Promise<number>;
  recordUsage(u: { user_id: string; agent: AgentName; model: string; input_tokens: number; output_tokens: number; cache_read_tokens: number; cost_usd: number }): Promise<void>;
  cacheGet(key: string): Promise<unknown | null>;
  cacheSet(key: string, userId: string, agent: AgentName, value: unknown): Promise<void>;

  // conversas
  createConversation(userId: string, title: string): Promise<string>;
  conversationOwner(conversationId: string): Promise<string | null>;
  appendMessage(m: { conversation_id: string; user_id: string; role: 'user' | 'assistant'; content: string; agent?: AgentName; route?: string; refs?: unknown }): Promise<void>;
  recentMessages(conversationId: string, limit: number): Promise<{ role: 'user' | 'assistant'; content: string }[]>;
}
