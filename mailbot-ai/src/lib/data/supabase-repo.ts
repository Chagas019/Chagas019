import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParsedEmail } from '../gmail/parse';
import type { Repo, SearchQuery, SyncCounters, TriageFilter } from './repo';
import type { AccountRow, AgentName, EmailRow, Preferences, ReportRow, SummaryRow, TokenRow, TriagedEmail } from './types';

const EMAIL_COLS = 'id,user_id,account_id,gmail_id,thread_id,from_name,from_email,to_emails,subject,snippet,received_at,label_ids,is_unread,is_sent,has_list_unsubscribe,content_hash,triage_status';

function check<T>(r: { data: T; error: { message: string; code?: string } | null }): T {
  if (r.error) throw Object.assign(new Error(`db_${r.error.code ?? 'error'}`), { code: `db_${r.error.code ?? 'error'}` });
  return r.data;
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

type JoinedRow = Omit<EmailRow, 'body_text'> & { mailbot_email_summaries: SummaryRow | SummaryRow[] | null };
function flatten(r: JoinedRow): TriagedEmail | null {
  const s = Array.isArray(r.mailbot_email_summaries) ? r.mailbot_email_summaries[0] : r.mailbot_email_summaries;
  if (!s) return null;
  const { mailbot_email_summaries: _ignored, ...email } = r;
  return { ...email, summary: s };
}

/** Implementação do Repo sobre o Supabase (service role, sempre filtrando por user_id). */
export class SupabaseRepo implements Repo {
  constructor(private sb: SupabaseClient) {}

  async getAccountByUser(userId: string) {
    return check(await this.sb.from('mailbot_gmail_accounts').select('*').eq('user_id', userId).maybeSingle()) as AccountRow | null;
  }
  async updateAccount(accountId: string, patch: Partial<AccountRow>) {
    check(await this.sb.from('mailbot_gmail_accounts').update(patch).eq('id', accountId));
  }
  async getTokens(accountId: string) {
    return check(await this.sb.from('mailbot_gmail_tokens').select('*').eq('account_id', accountId).maybeSingle()) as TokenRow | null;
  }
  async saveAccessToken(accountId: string, enc: string, expiresAt: string) {
    check(await this.sb.from('mailbot_gmail_tokens').update({ access_token_enc: enc, access_token_expires_at: expiresAt, updated_at: new Date().toISOString() }).eq('account_id', accountId));
  }

  async upsertEmails(userId: string, accountId: string, emails: ParsedEmail[]) {
    let added = 0;
    let updated = 0;
    for (const part of chunk(emails, 100)) {
      const existing = check(await this.sb.from('mailbot_emails').select('gmail_id,content_hash').eq('account_id', accountId).in('gmail_id', part.map((e) => e.gmailId))) as { gmail_id: string; content_hash: string }[];
      const known = new Map(existing.map((e) => [e.gmail_id, e.content_hash]));
      const rows = part.map((e) => ({
        user_id: userId, account_id: accountId, gmail_id: e.gmailId, thread_id: e.threadId,
        from_name: e.fromName, from_email: e.fromEmail, to_emails: e.toEmails, subject: e.subject, snippet: e.snippet,
        body_text: e.bodyText, received_at: e.receivedAt, label_ids: e.labelIds, is_unread: e.isUnread, is_sent: e.isSent,
        has_list_unsubscribe: e.hasListUnsubscribe, content_hash: e.contentHash, updated_at: new Date().toISOString(),
        // conteúdo novo/alterado volta para a fila de triagem; igual mantém a classificação
        ...(known.get(e.gmailId) === e.contentHash ? {} : { triage_status: 'pending' }),
      }));
      check(await this.sb.from('mailbot_emails').upsert(rows, { onConflict: 'account_id,gmail_id' }));
      for (const e of part) (known.has(e.gmailId) ? updated++ : added++);
    }
    return { added, updated };
  }

  async updateLabels(accountId: string, gmailId: string, labelIds: string[]) {
    const r = check(await this.sb.from('mailbot_emails').update({ label_ids: labelIds, is_unread: labelIds.includes('UNREAD'), updated_at: new Date().toISOString() })
      .eq('account_id', accountId).eq('gmail_id', gmailId).select('id')) as { id: string }[];
    return r.length > 0;
  }

  async deleteEmails(accountId: string, gmailIds: string[]) {
    let n = 0;
    for (const part of chunk(gmailIds, 200)) {
      const r = check(await this.sb.from('mailbot_emails').delete().eq('account_id', accountId).in('gmail_id', part).select('id')) as { id: string }[];
      n += r.length;
    }
    return n;
  }

  async pendingTriage(userId: string, limit: number) {
    return check(await this.sb.from('mailbot_emails').select(`${EMAIL_COLS},body_text`).eq('user_id', userId).eq('triage_status', 'pending')
      .order('received_at', { ascending: false }).limit(limit)) as EmailRow[];
  }

  async setTriageStatus(userId: string, ids: string[], status: EmailRow['triage_status']) {
    for (const part of chunk(ids, 200)) check(await this.sb.from('mailbot_emails').update({ triage_status: status }).eq('user_id', userId).in('id', part));
  }

  async saveSummaries(rows: SummaryRow[]) {
    if (rows.length) check(await this.sb.from('mailbot_email_summaries').upsert(rows.map((r) => ({ ...r, created_at: new Date().toISOString() })), { onConflict: 'email_id' }));
  }

  async senderStats(userId: string, fromEmails: string[]) {
    const out = new Map<string, { received: number; userWroteTo: number }>();
    await Promise.all(fromEmails.slice(0, 40).map(async (addr) => {
      const [rec, sent] = await Promise.all([
        this.sb.from('mailbot_emails').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('from_email', addr),
        this.sb.from('mailbot_emails').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_sent', true).ilike('to_emails', `%${addr.replace(/[%_]/g, '')}%`),
      ]);
      out.set(addr, { received: Math.max(0, (rec.count ?? 1) - 1), userWroteTo: sent.count ?? 0 });
    }));
    return out;
  }

  async queryTriaged(userId: string, f: TriageFilter) {
    let q = this.sb.from('mailbot_emails').select(`${EMAIL_COLS},mailbot_email_summaries!inner(*)`).eq('user_id', userId).eq('is_sent', false);
    if (f.since) q = q.gte('received_at', f.since);
    if (f.until) q = q.lt('received_at', f.until);
    if (f.priorities) q = q.in('mailbot_email_summaries.priority', f.priorities);
    if (f.categories) q = q.in('mailbot_email_summaries.category', f.categories);
    if (f.needsReply !== undefined) q = q.eq('mailbot_email_summaries.needs_reply', f.needsReply);
    if (f.isBill) q = q.eq('mailbot_email_summaries.is_bill', true);
    if (f.isAppointment) q = q.eq('mailbot_email_summaries.is_appointment', true);
    if (f.hasDeadline) q = q.not('mailbot_email_summaries.deadline', 'is', null);
    if (f.minScore) q = q.gte('mailbot_email_summaries.relevance_score', f.minScore);
    q = f.orderBy === 'score'
      ? q.order('relevance_score', { referencedTable: 'mailbot_email_summaries', ascending: false }).order('received_at', { ascending: false })
      : q.order('received_at', { ascending: false });
    const fetchLimit = f.orderBy === 'score' ? Math.min(300, f.limit * 10) : f.limit;
    const rows = check(await q.limit(fetchLimit)) as JoinedRow[];
    const list = rows.map(flatten).filter((x): x is TriagedEmail => x !== null);
    // ordenação por score no embed não ordena o pai no PostgREST; garante aqui
    if (f.orderBy === 'score') list.sort((a, b) => b.summary.relevance_score - a.summary.relevance_score || b.received_at.localeCompare(a.received_at));
    return list.slice(0, f.limit);
  }

  async awaitingReply(userId: string, limit: number) {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const candidates = await this.queryTriaged(userId, { since, needsReply: true, limit: 60, orderBy: 'received' });
    if (!candidates.length) return [];
    const threads = [...new Set(candidates.map((c) => c.thread_id))];
    const sent = check(await this.sb.from('mailbot_emails').select('thread_id,received_at').eq('user_id', userId).eq('is_sent', true).in('thread_id', threads)) as { thread_id: string; received_at: string }[];
    const lastSent = new Map<string, string>();
    for (const s of sent) if (!lastSent.has(s.thread_id) || lastSent.get(s.thread_id)! < s.received_at) lastSent.set(s.thread_id, s.received_at);
    return candidates.filter((c) => !(lastSent.get(c.thread_id) && lastSent.get(c.thread_id)! > c.received_at))
      .sort((a, b) => b.summary.relevance_score - a.summary.relevance_score).slice(0, limit);
  }

  async searchEmails(userId: string, s: SearchQuery) {
    let q = this.sb.from('mailbot_emails').select(`${EMAIL_COLS},body_text,mailbot_email_summaries(*)`).eq('user_id', userId).eq('is_sent', false);
    if (s.text) q = q.textSearch('search', s.text, { type: 'websearch', config: 'portuguese' });
    if (s.from) {
      const v = s.from.replace(/[%_,()]/g, '');
      q = q.or(`from_email.ilike.%${v}%,from_name.ilike.%${v}%`);
    }
    if (s.since) q = q.gte('received_at', s.since);
    if (s.until) q = q.lt('received_at', s.until);
    const rows = check(await q.order('received_at', { ascending: false }).limit(s.limit)) as (EmailRow & { mailbot_email_summaries: SummaryRow | SummaryRow[] | null })[];
    return rows.map(({ mailbot_email_summaries, ...e }) => ({ ...e, summary: (Array.isArray(mailbot_email_summaries) ? mailbot_email_summaries[0] : mailbot_email_summaries) ?? null }));
  }

  async periodStats(userId: string, since: string, until: string) {
    const base = () => this.sb.from('mailbot_emails').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_sent', false).gte('received_at', since).lt('received_at', until);
    const [total, pending, important, latest] = await Promise.all([
      base(),
      base().eq('triage_status', 'pending'),
      this.sb.from('mailbot_emails').select('id,mailbot_email_summaries!inner(priority)', { count: 'exact', head: true }).eq('user_id', userId).eq('is_sent', false)
        .gte('received_at', since).lt('received_at', until).in('mailbot_email_summaries.priority', ['urgente', 'importante']),
      this.sb.from('mailbot_emails').select('received_at').eq('user_id', userId).gte('received_at', since).lt('received_at', until).order('received_at', { ascending: false }).limit(1),
    ]);
    return {
      total: total.count ?? 0,
      pending: pending.count ?? 0,
      important: important.count ?? 0,
      latestReceivedAt: (latest.data?.[0] as { received_at: string } | undefined)?.received_at ?? null,
    };
  }

  async startSync(userId: string, accountId: string, kind: 'initial' | 'incremental' | 'full_resync') {
    const r = check(await this.sb.from('mailbot_sync_history').insert({ user_id: userId, account_id: accountId, kind }).select('id').single()) as { id: string };
    return r.id;
  }
  async finishSync(syncId: string, status: 'success' | 'partial' | 'error', c: SyncCounters, error?: string) {
    check(await this.sb.from('mailbot_sync_history').update({ status, ...c, error: error ?? null, finished_at: new Date().toISOString() }).eq('id', syncId));
  }

  async getReport(userId: string, kind: 'daily' | 'weekly', periodStart: string) {
    return check(await this.sb.from('mailbot_daily_reports').select('*').eq('user_id', userId).eq('kind', kind).eq('period_start', periodStart).maybeSingle()) as ReportRow | null;
  }
  async listReports(userId: string, kind: 'daily' | 'weekly', since: string, until: string) {
    return check(await this.sb.from('mailbot_daily_reports').select('*').eq('user_id', userId).eq('kind', kind).gte('period_start', since).lte('period_start', until).order('period_start')) as ReportRow[];
  }
  async saveReport(r: ReportRow) {
    check(await this.sb.from('mailbot_daily_reports').upsert({ ...r, created_at: new Date().toISOString() }, { onConflict: 'user_id,kind,period_start' }));
  }

  async getPrefs(userId: string) {
    const row = check(await this.sb.from('mailbot_user_preferences').select('*').eq('user_id', userId).maybeSingle()) as Preferences | null;
    if (row) return { ...row, ai_daily_budget_usd: Number(row.ai_daily_budget_usd) };
    const created = check(await this.sb.from('mailbot_user_preferences').upsert({ user_id: userId }).select('*').single()) as Preferences;
    return { ...created, ai_daily_budget_usd: Number(created.ai_daily_budget_usd) };
  }
  async updatePrefs(userId: string, patch: Partial<Preferences>) {
    check(await this.sb.from('mailbot_user_preferences').update({ ...patch, updated_at: new Date().toISOString() }).eq('user_id', userId));
  }

  async aiCostSince(userId: string, sinceIso: string) {
    const rows = check(await this.sb.from('mailbot_ai_usage').select('cost_usd').eq('user_id', userId).gte('created_at', sinceIso)) as { cost_usd: number | string }[];
    return rows.reduce((s, r) => s + Number(r.cost_usd), 0);
  }
  async recordUsage(u: { user_id: string; agent: AgentName; model: string; input_tokens: number; output_tokens: number; cache_read_tokens: number; cost_usd: number }) {
    check(await this.sb.from('mailbot_ai_usage').insert(u));
  }
  async cacheGet(key: string) {
    const r = check(await this.sb.from('mailbot_ai_cache').select('response').eq('key', key).maybeSingle()) as { response: unknown } | null;
    return r?.response ?? null;
  }
  async cacheSet(key: string, userId: string, agent: AgentName, value: unknown) {
    check(await this.sb.from('mailbot_ai_cache').upsert({ key, user_id: userId, agent, response: value }));
  }

  async createConversation(userId: string, title: string) {
    const r = check(await this.sb.from('mailbot_ai_conversations').insert({ user_id: userId, title: title.slice(0, 80) }).select('id').single()) as { id: string };
    return r.id;
  }
  async conversationOwner(conversationId: string) {
    const r = check(await this.sb.from('mailbot_ai_conversations').select('user_id').eq('id', conversationId).maybeSingle()) as { user_id: string } | null;
    return r?.user_id ?? null;
  }
  async appendMessage(m: { conversation_id: string; user_id: string; role: 'user' | 'assistant'; content: string; agent?: AgentName; route?: string; refs?: unknown }) {
    check(await this.sb.from('mailbot_ai_conversation_messages').insert({ ...m, refs: m.refs ?? [] }));
    check(await this.sb.from('mailbot_ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', m.conversation_id));
  }
  async recentMessages(conversationId: string, limit: number) {
    const rows = check(await this.sb.from('mailbot_ai_conversation_messages').select('role,content').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(limit)) as { role: 'user' | 'assistant'; content: string }[];
    return rows.reverse();
  }
}
