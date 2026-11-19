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
    const { data: tok } = await sb.from('gmail_tokens').select('refresh_token_enc').eq('user_id', user.id).maybeSingle();
    if (tok) await revokeToken(decrypt(tok.refresh_token_enc, env.tokenEncryptionKey())).catch(() => false);
    // apagar o usuário de auth remove tudo em cascata (on delete cascade em todas as tabelas)
    const { error } = await sb.auth.admin.deleteUser(user.id);
    if (error) throw new Error('delete_user_failed');
    return NextResponse.json({ ok: true });
  });
}
