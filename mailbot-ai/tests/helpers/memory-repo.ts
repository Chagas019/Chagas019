import { randomUUID } from 'node:crypto';
import type { Repo, SearchQuery, SyncCounters, TriageFilter } from '../../src/lib/data/repo';
import type { AccountRow, AgentName, EmailRow, Preferences, ReportRow, SummaryRow, TokenRow, TriagedEmail } from '../../src/lib/data/types';
import type { ParsedEmail } from '../../src/lib/gmail/parse';
import { normalize } from '../../src/lib/agents/orchestrator';

/** Repo em memória com a mesma semântica do SupabaseRepo (inclusive filtro por user_id). */
export class MemoryRepo implements Repo {
  accounts = new Map<string, AccountRow>();
  tokens = new Map<string, TokenRow>();
  emails = new Map<string, EmailRow>();
  summaries = new Map<string, SummaryRow>();
  syncs: { id: string; kind: string; status?: string; counters?: SyncCounters; error?: string }[] = [];
  reports: ReportRow[] = [];
  prefs = new Map<string, Preferences>();
  usage: { user_id: string; agent: AgentName; model: string; cost_usd: number; created_at: string }[] = [];
  cache = new Map<string, unknown>();
  conversations = new Map<string, { user_id: string; title: string }>();
  messages: { conversation_id: string; role: 'user' | 'assistant'; content: string }[] = [];

  addAccount(a: Partial<AccountRow> & { user_id: string }): AccountRow {
    const row: AccountRow = {
      id: randomUUID(), email: 'user@gmail.com', status: 'connected', history_id: null, initial_sync_done: false,
      initial_sync_page_token: null, messages_total: null, last_sync_at: null, last_error: null, ...a,
    };
    this.accounts.set(row.id, row);
    return row;
  }

  addEmail(e: Partial<EmailRow> & { user_id: string }, s?: Partial<SummaryRow>): EmailRow {
    const row: EmailRow = {
      id: randomUUID(), account_id: 'acc', gmail_id: randomUUID(), thread_id: randomUUID(), from_name: null,
      from_email: 'alguem@example.com', to_emails: '', subject: '', snippet: '', body_text: '', received_at: new Date().toISOString(),
      label_ids: ['INBOX'], is_unread: true, is_sent: false, has_list_unsubscribe: false, content_hash: randomUUID(),
      triage_status: s ? 'done' : 'pending', ...e,
    };
    this.emails.set(row.id, row);
    if (s) {
      this.summaries.set(row.id, {
        email_id: row.id, user_id: row.user_id, category: 'informativos', priority: 'normal', relevance_score: 50,
        summary: row.subject, reason: '', recommended_action: '', needs_reply: false, deadline: null, is_bill: false,
        bill_amount: null, is_appointment: false, appointment_at: null, source: 'ai', model: null, ...s,
      });
    }
    return row;
  }

  async getAccountByUser(userId: string) { return [...this.accounts.values()].find((a) => a.user_id === userId) ?? null; }
  async updateAccount(id: string, patch: Partial<AccountRow>) { const a = this.accounts.get(id); if (a) this.accounts.set(id, { ...a, ...patch }); }
  async getTokens(id: string) { return this.tokens.get(id) ?? null; }
  async saveAccessToken(id: string, enc: string, exp: string) { const t = this.tokens.get(id)!; this.tokens.set(id, { ...t, access_token_enc: enc, access_token_expires_at: exp }); }

  async upsertEmails(userId: string, accountId: string, list: ParsedEmail[]) {
    let added = 0; let updated = 0;
    for (const p of list) {
      const existing = [...this.emails.values()].find((e) => e.account_id === accountId && e.gmail_id === p.gmailId);
      const base = {
        user_id: userId, account_id: accountId, gmail_id: p.gmailId, thread_id: p.threadId, from_name: p.fromName, from_email: p.fromEmail,
        to_emails: p.toEmails, subject: p.subject, snippet: p.snippet, body_text: p.bodyText, received_at: p.receivedAt, label_ids: p.labelIds,
        is_unread: p.isUnread, is_sent: p.isSent, has_list_unsubscribe: p.hasListUnsubscribe, content_hash: p.contentHash,
      };
      if (existing) {
        this.emails.set(existing.id, { ...existing, ...base, triage_status: existing.content_hash === p.contentHash ? existing.triage_status : 'pending' });
        updated++;
      } else {
        const id = randomUUID();
        this.emails.set(id, { id, ...base, triage_status: 'pending' });
        added++;
      }
    }
    return { added, updated };
  }
  async updateLabels(accountId: string, gmailId: string, labels: string[]) {
    const e = [...this.emails.values()].find((x) => x.account_id === accountId && x.gmail_id === gmailId);
    if (!e) return false;
    this.emails.set(e.id, { ...e, label_ids: labels, is_unread: labels.includes('UNREAD') });
    return true;
  }
  async deleteEmails(accountId: string, ids: string[]) {
    let n = 0;
    for (const e of [...this.emails.values()]) if (e.account_id === accountId && ids.includes(e.gmail_id)) { this.emails.delete(e.id); this.summaries.delete(e.id); n++; }
    return n;
  }
  async pendingTriage(userId: string, limit: number) {
    return [...this.emails.values()].filter((e) => e.user_id === userId && e.triage_status === 'pending')
      .sort((a, b) => b.received_at.localeCompare(a.received_at)).slice(0, limit);
  }
  async setTriageStatus(userId: string, ids: string[], status: EmailRow['triage_status']) {
    for (const id of ids) { const e = this.emails.get(id); if (e && e.user_id === userId) this.emails.set(id, { ...e, triage_status: status }); }
  }
  async saveSummaries(rows: SummaryRow[]) { for (const r of rows) this.summaries.set(r.email_id, r); }
  async senderStats(userId: string, from: string[]) {
    const m = new Map<string, { received: number; userWroteTo: number }>();
    const mine = [...this.emails.values()].filter((e) => e.user_id === userId);
    for (const f of from) m.set(f, { received: Math.max(0, mine.filter((e) => e.from_email === f).length - 1), userWroteTo: mine.filter((e) => e.is_sent && e.to_emails.includes(f)).length });
    return m;
  }

  private triaged(userId: string): TriagedEmail[] {
    return [...this.emails.values()].filter((e) => e.user_id === userId && !e.is_sent && this.summaries.has(e.id))
      .map(({ body_text: _b, ...e }) => ({ ...e, summary: this.summaries.get(e.id)! }));
  }
  async queryTriaged(userId: string, f: TriageFilter) {
    let l = this.triaged(userId);
    if (f.since) l = l.filter((e) => e.received_at >= f.since!);
    if (f.until) l = l.filter((e) => e.received_at < f.until!);
    if (f.priorities) l = l.filter((e) => f.priorities!.includes(e.summary.priority));
    if (f.categories) l = l.filter((e) => f.categories!.includes(e.summary.category));
    if (f.needsReply !== undefined) l = l.filter((e) => e.summary.needs_reply === f.needsReply);
    if (f.isBill) l = l.filter((e) => e.summary.is_bill);
    if (f.isAppointment) l = l.filter((e) => e.summary.is_appointment);
    if (f.hasDeadline) l = l.filter((e) => e.summary.deadline);
    l.sort((a, b) => (f.orderBy === 'score' ? b.summary.relevance_score - a.summary.relevance_score : 0) || b.received_at.localeCompare(a.received_at));
    return l.slice(0, f.limit);
  }
  async awaitingReply(userId: string, limit: number) {
    const sent = [...this.emails.values()].filter((e) => e.user_id === userId && e.is_sent);
    return (await this.queryTriaged(userId, { needsReply: true, limit: 100 }))
      .filter((c) => !sent.some((s) => s.thread_id === c.thread_id && s.received_at > c.received_at)).slice(0, limit);
  }
  async searchEmails(userId: string, q: SearchQuery) {
    const terms = q.text ? normalize(q.text).split(/\s+or\s+|\s+/).filter(Boolean) : [];
    const anyMode = q.text?.includes(' or ');
    return [...this.emails.values()].filter((e) => {
      if (e.user_id !== userId || e.is_sent) return false;
      const hay = normalize(`${e.subject} ${e.from_name ?? ''} ${e.from_email} ${e.body_text}`);
      if (terms.length && !(anyMode ? terms.some((t) => hay.includes(t)) : terms.every((t) => hay.includes(t)))) return false;
      if (q.from && !normalize(`${e.from_email} ${e.from_name ?? ''}`).includes(normalize(q.from))) return false;
      if (q.since && e.received_at < q.since) return false;
      if (q.until && e.received_at >= q.until) return false;
      return true;
    }).sort((a, b) => b.received_at.localeCompare(a.received_at)).slice(0, q.limit).map((e) => ({ ...e, summary: this.summaries.get(e.id) ?? null }));
  }
  async periodStats(userId: string, since: string, until: string) {
    const l = [...this.emails.values()].filter((e) => e.user_id === userId && !e.is_sent && e.received_at >= since && e.received_at < until);
    return {
      total: l.length,
      pending: l.filter((e) => e.triage_status === 'pending').length,
      important: l.filter((e) => ['urgente', 'importante'].includes(this.summaries.get(e.id)?.priority ?? '')).length,
      latestReceivedAt: l.map((e) => e.received_at).sort().at(-1) ?? null,
    };
  }
  async startSync(_u: string, _a: string, kind: string) { const id = randomUUID(); this.syncs.push({ id, kind }); return id; }
  async finishSync(id: string, status: string, c: SyncCounters, error?: string) { Object.assign(this.syncs.find((s) => s.id === id)!, { status, counters: { ...c }, error }); }
  async getReport(userId: string, kind: string, start: string) { return this.reports.find((r) => r.user_id === userId && r.kind === kind && r.period_start === start) ?? null; }
  async listReports(userId: string, kind: string, since: string, until: string) { return this.reports.filter((r) => r.user_id === userId && r.kind === kind && r.period_start >= since && r.period_start <= until); }
  async saveReport(r: ReportRow) { this.reports = this.reports.filter((x) => !(x.user_id === r.user_id && x.kind === r.kind && x.period_start === r.period_start)); this.reports.push(r); }
  async getPrefs(userId: string): Promise<Preferences> {
    return this.prefs.get(userId) ?? {
      user_id: userId, timezone: 'America/Sao_Paulo', sync_frequency_minutes: 60, daily_report_hour: 7, initial_sync_days: 90,
      vip_senders: [], work_domains: [], ignored_senders: [], ai_daily_budget_usd: 0.5, last_daily_report_on: null,
    };
  }
  async updatePrefs(userId: string, patch: Partial<Preferences>) { this.prefs.set(userId, { ...(await this.getPrefs(userId)), ...patch }); }
  async aiCostSince(userId: string, since: string) { return this.usage.filter((u) => u.user_id === userId && u.created_at >= since).reduce((s, u) => s + u.cost_usd, 0); }
  async recordUsage(u: { user_id: string; agent: AgentName; model: string; input_tokens: number; output_tokens: number; cache_read_tokens: number; cost_usd: number }) { this.usage.push({ ...u, created_at: new Date().toISOString() }); }
  async cacheGet(k: string) { return this.cache.get(k) ?? null; }
  async cacheSet(k: string, _u: string, _a: AgentName, v: unknown) { this.cache.set(k, v); }
  async createConversation(userId: string, title: string) { const id = randomUUID(); this.conversations.set(id, { user_id: userId, title }); return id; }
  async conversationOwner(id: string) { return this.conversations.get(id)?.user_id ?? null; }
  async appendMessage(m: { conversation_id: string; role: 'user' | 'assistant'; content: string }) { this.messages.push(m); }
  async recentMessages(id: string, limit: number) { return this.messages.filter((m) => m.conversation_id === id).slice(-limit); }
}
