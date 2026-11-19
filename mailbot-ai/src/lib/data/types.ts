export type Priority = 'urgente' | 'importante' | 'normal' | 'baixa' | 'spam';
export type Category = 'trabalho' | 'financeiro' | 'pessoal' | 'compromissos' | 'informativos';
export type AgentName = 'triage' | 'summary' | 'chat';

export const CATEGORIES: Category[] = ['trabalho', 'financeiro', 'pessoal', 'compromissos', 'informativos'];
export const PRIORITIES: Priority[] = ['urgente', 'importante', 'normal', 'baixa', 'spam'];

export interface AccountRow {
  id: string;
  user_id: string;
  email: string;
  status: 'connected' | 'reauth_required' | 'disconnected' | 'error';
  history_id: string | null;
  initial_sync_done: boolean;
  initial_sync_page_token: string | null;
  messages_total: number | null;
  last_sync_at: string | null;
  last_error: string | null;
}

export interface TokenRow {
  account_id: string;
  user_id: string;
  refresh_token_enc: string;
  access_token_enc: string | null;
  access_token_expires_at: string | null;
  scope: string;
}

export interface EmailRow {
  id: string;
  user_id: string;
  account_id: string;
  gmail_id: string;
  thread_id: string;
  from_name: string | null;
  from_email: string;
  to_emails: string;
  subject: string;
  snippet: string;
  body_text: string;
  received_at: string;
  label_ids: string[];
  is_unread: boolean;
  is_sent: boolean;
  has_list_unsubscribe: boolean;
  content_hash: string;
  triage_status: 'pending' | 'done' | 'skipped' | 'error';
}

export interface SummaryRow {
  email_id: string;
  user_id: string;
  category: Category;
  priority: Priority;
  relevance_score: number;
  summary: string;
  reason: string;
  recommended_action: string;
  needs_reply: boolean;
  deadline: string | null;
  is_bill: boolean;
  bill_amount: string | null;
  is_appointment: boolean;
  appointment_at: string | null;
  source: 'rules' | 'ai' | 'cache';
  model: string | null;
}

/** E-mail + resultado da triagem (sem o corpo completo). */
export type TriagedEmail = Omit<EmailRow, 'body_text'> & { summary: SummaryRow };

export interface Preferences {
  user_id: string;
  timezone: string;
  sync_frequency_minutes: number;
  daily_report_hour: number;
  initial_sync_days: number;
  vip_senders: string[];
  work_domains: string[];
  ignored_senders: string[];
  ai_daily_budget_usd: number;
  last_daily_report_on: string | null;
}

export interface ReportRow {
  id?: string;
  user_id: string;
  kind: 'daily' | 'weekly';
  period_start: string;
  period_end: string;
  content: unknown;
  narrative: string;
  email_count: number;
  source_fingerprint: string;
  model: string | null;
  created_at?: string;
}

export interface EmailRef {
  id: string;
  subject: string;
  from: string;
  received_at: string;
}
