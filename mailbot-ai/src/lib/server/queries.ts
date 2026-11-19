import 'server-only';
import { redirect } from 'next/navigation';
import { sessionClient } from '../supabase/server';
import { adminClient } from '../supabase/admin';
import { env } from '../env';
import type { MailCardData } from '@/components/MailCard';

const known = new Set<string>();

/** Cria perfil e preferências na primeira visita (sem gatilho em auth.users, que pode ser compartilhado). */
async function ensureUserRows(userId: string, email: string | null, fullName: string | null) {
  if (known.has(userId) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return; // sem chave do servidor: telas abrem e Configurações mostra o que falta
  const admin = adminClient();
  await admin.from('mailbot_profiles').upsert({ id: userId, display_name: fullName || email?.split('@')[0] || null }, { onConflict: 'id', ignoreDuplicates: true });
  await admin.from('mailbot_user_preferences').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  known.add(userId);
}

/** Contexto de página: sessão do usuário + cliente com RLS (só enxerga os próprios dados). */
export async function pageContext() {
  if (!env.supabaseConfigured()) redirect('/login');
  const sb = await sessionClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect('/login');
  await ensureUserRows(data.user.id, data.user.email ?? null, (data.user.user_metadata?.full_name as string | undefined) ?? null);
  const [{ data: prefs }, { data: account }, { data: profile }] = await Promise.all([
    sb.from('mailbot_user_preferences').select('*').maybeSingle(),
    sb.from('mailbot_gmail_accounts').select('id,email,status,initial_sync_done,last_sync_at,last_error,messages_total').maybeSingle(),
    sb.from('mailbot_profiles').select('display_name').maybeSingle(),
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

type Row = Omit<MailCardData, 'summary'> & { mailbot_email_summaries: MailCardData['summary'] | MailCardData['summary'][] };
export function toCards(rows: unknown[] | null): MailCardData[] {
  return ((rows ?? []) as Row[]).map(({ mailbot_email_summaries, ...r }) => ({ ...r, summary: Array.isArray(mailbot_email_summaries) ? mailbot_email_summaries[0] ?? null : mailbot_email_summaries ?? null }));
}
