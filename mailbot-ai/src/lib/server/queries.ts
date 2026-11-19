import 'server-only';
import { redirect } from 'next/navigation';
import { sessionClient } from '../supabase/server';
import type { MailCardData } from '@/components/MailCard';

/** Contexto de página: sessão do usuário + cliente com RLS (só enxerga os próprios dados). */
export async function pageContext() {
  const sb = await sessionClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect('/login');
  const [{ data: prefs }, { data: account }, { data: profile }] = await Promise.all([
    sb.from('user_preferences').select('*').maybeSingle(),
    sb.from('gmail_accounts').select('id,email,status,initial_sync_done,last_sync_at,last_error,messages_total').maybeSingle(),
    sb.from('profiles').select('display_name').maybeSingle(),
  ]);
  return {
    sb,
    user: data.user,
    tz: (prefs?.timezone as string) ?? 'America/Sao_Paulo',
    prefs,
    account: account as null | { id: string; email: string; status: string; initial_sync_done: boolean; last_sync_at: string | null; last_error: string | null; messages_total: number | null },
    name: (profile?.display_name as string) || data.user.email?.split('@')[0] || 'você',
  };
}

export const CARD_COLS = 'id,from_name,from_email,subject,snippet,received_at,is_unread';
export const SUMMARY_COLS = 'priority,category,summary,reason,recommended_action,needs_reply,deadline,bill_amount,is_bill,is_appointment,relevance_score';

type Row = Omit<MailCardData, 'summary'> & { email_summaries: MailCardData['summary'] | MailCardData['summary'][] };
export function toCards(rows: unknown[] | null): MailCardData[] {
  return ((rows ?? []) as Row[]).map(({ email_summaries, ...r }) => ({ ...r, summary: Array.isArray(email_summaries) ? email_summaries[0] ?? null : email_summaries ?? null }));
}
