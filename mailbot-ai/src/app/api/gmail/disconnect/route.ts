import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { decrypt } from '@/lib/crypto';
import { revokeToken } from '@/lib/gmail/oauth';
import { adminClient } from '@/lib/supabase/admin';
import { handle, rateLimit, requireUser } from '@/lib/server/context';

const Body = z.object({ deleteData: z.boolean().default(false) });

// Desconexão segura: revoga o token no Google, apaga tokens e (opcionalmente) os e-mails.
export function POST(req: Request) {
  return handle('gmail.disconnect', async () => {
    const user = await requireUser();
    await rateLimit(`disconnect:${user.id}`, 5, 600);
    const { deleteData } = Body.parse(await req.json().catch(() => ({})));
    const sb = adminClient();
    const { data: account } = await sb.from('mailbot_gmail_accounts').select('id').eq('user_id', user.id).maybeSingle();
    if (!account) return NextResponse.json({ ok: true });
    const { data: tok } = await sb.from('mailbot_gmail_tokens').select('refresh_token_enc').eq('account_id', account.id).maybeSingle();
    let revoked = false;
    if (tok) revoked = await revokeToken(decrypt(tok.refresh_token_enc, env.tokenEncryptionKey())).catch(() => false);
    await sb.from('mailbot_gmail_tokens').delete().eq('account_id', account.id);
    if (deleteData) {
      await sb.from('mailbot_gmail_accounts').delete().eq('id', account.id); // cascata: e-mails, resumos, histórico
      await sb.from('mailbot_daily_reports').delete().eq('user_id', user.id);
      await sb.from('mailbot_ai_cache').delete().eq('user_id', user.id);
    } else {
      await sb.from('mailbot_gmail_accounts').update({ status: 'disconnected', history_id: null, initial_sync_done: false, initial_sync_page_token: null }).eq('id', account.id);
    }
    return NextResponse.json({ ok: true, revoked });
  });
}
