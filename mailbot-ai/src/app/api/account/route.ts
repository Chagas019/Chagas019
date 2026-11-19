import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { decrypt } from '@/lib/crypto';
import { revokeToken } from '@/lib/gmail/oauth';
import { adminClient } from '@/lib/supabase/admin';
import { handle, HttpError, rateLimit, requireUser } from '@/lib/server/context';

const Body = z.object({ confirm: z.literal('EXCLUIR') });

// Exclusão de todos os dados mediante solicitação (confirmação explícita).
export function DELETE(req: Request) {
  return handle('account.delete', async () => {
    const user = await requireUser();
    await rateLimit(`delete:${user.id}`, 3, 3600);
    if (!Body.safeParse(await req.json().catch(() => null)).success) throw new HttpError(400, 'Digite EXCLUIR para confirmar.');
    const sb = adminClient();
    const { data: tok } = await sb.from('mailbot_gmail_tokens').select('refresh_token_enc').eq('user_id', user.id).maybeSingle();
    if (tok) await revokeToken(decrypt(tok.refresh_token_enc, env.tokenEncryptionKey())).catch(() => false);
    // Apaga todos os dados do MAILBOT do usuário. O login (auth.users) não é removido porque
    // pode ser compartilhado com outros sistemas no mesmo projeto Supabase.
    // gmail_accounts em cascata leva e-mails, resumos, tokens e histórico de sincronização.
    const tables = ['mailbot_gmail_accounts', 'mailbot_ai_conversations', 'mailbot_daily_reports', 'mailbot_ai_usage', 'mailbot_ai_cache', 'mailbot_user_preferences'];
    for (const t of tables) {
      const { error } = await sb.from(t).delete().eq('user_id', user.id);
      if (error) throw new Error('delete_data_failed');
    }
    const { error } = await sb.from('mailbot_profiles').delete().eq('id', user.id);
    if (error) throw new Error('delete_data_failed');
    await sb.from('mailbot_rate_limits').delete().like('key', `%:${user.id}`);
    return NextResponse.json({ ok: true });
  });
}
