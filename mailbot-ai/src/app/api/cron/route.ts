import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { safeEqual } from '@/lib/crypto';
import { adminClient } from '@/lib/supabase/admin';
import { SupabaseRepo } from '@/lib/data/supabase-repo';
import { gmailFor, llmFor } from '@/lib/server/context';
import { syncAndTriage } from '@/lib/server/pipeline';
import { buildReport } from '@/lib/agents/summary';
import { localDate, localHour } from '@/lib/agents/time';
import { errorCode, log } from '@/lib/log';
import type { AccountRow, Preferences } from '@/lib/data/types';

export const maxDuration = 300;

// Agendador (Vercel Cron ou pg_cron): sincroniza contas vencidas e gera o resumo diário no horário escolhido.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  if (!safeEqual(auth, `Bearer ${env.cronSecret()}`)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = adminClient();
  const r = new SupabaseRepo(sb);
  const llm = llmFor(r);
  const started = Date.now();
  const budgetMs = 240_000;
  const now = new Date();
  const out = { synced: 0, reports: 0, errors: 0 };

  const { data: accounts } = await sb.from('mailbot_gmail_accounts').select('*').eq('status', 'connected');
  const { data: prefsRows } = await sb.from('mailbot_user_preferences').select('*');
  const prefs = new Map((prefsRows as Preferences[] | null ?? []).map((p) => [p.user_id, p]));

  for (const acc of (accounts as AccountRow[] | null) ?? []) {
    if (Date.now() - started > budgetMs) break;
    const p = prefs.get(acc.user_id);
    if (!p) continue;
    try {
      const due = !acc.initial_sync_done || (p.sync_frequency_minutes > 0 &&
        (!acc.last_sync_at || Date.parse(acc.last_sync_at) + p.sync_frequency_minutes * 60_000 <= now.getTime() + 60_000));
      if (due) { await syncAndTriage(r, llm, gmailFor(r, acc.id), acc, { maxMessages: 200, triageLimit: 40 }); out.synced++; }

      const today = localDate(now, p.timezone);
      if (localHour(now, p.timezone) >= p.daily_report_hour && p.last_daily_report_on !== today) {
        await buildReport(r, llm, acc.user_id, { kind: 'daily', date: today });
        await r.updatePrefs(acc.user_id, { last_daily_report_on: today });
        out.reports++;
      }
    } catch (e) {
      out.errors++;
      log.error('cron.account_failed', { account: acc.id, code: errorCode(e) });
    }
  }
  log.info('cron.done', out);
  return NextResponse.json(out);
}
