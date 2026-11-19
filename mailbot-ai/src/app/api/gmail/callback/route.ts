import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { encrypt, safeEqual } from '@/lib/crypto';
import { exchangeCode, hasGmailScope, revokeToken } from '@/lib/gmail/oauth';
import { GmailClient } from '@/lib/gmail/client';
import { adminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/server/context';
import { errorCode, log } from '@/lib/log';

// Retorno do Google. Só marca como conectado depois que a Gmail API devolve o perfil real.
export async function GET(req: NextRequest) {
  const back = (status: string) => {
    const res = NextResponse.redirect(`${env.appUrl()}/configuracoes?gmail=${status}`);
    res.cookies.delete({ name: 'mb_oauth', path: '/api/gmail/callback' });
    return res;
  };
  try {
    const user = await requireUser();
    const params = req.nextUrl.searchParams;
    if (params.get('error')) return back(params.get('error') === 'access_denied' ? 'denied' : 'error');
    const [state, verifier] = (req.cookies.get('mb_oauth')?.value ?? '').split('.');
    const code = params.get('code');
    if (!state || !verifier || !code || !safeEqual(state, params.get('state') ?? '')) return back('invalid_state');

    const tokens = await exchangeCode(
      { clientId: env.googleClientId(), clientSecret: env.googleClientSecret(), redirectUri: `${env.appUrl()}/api/gmail/callback` },
      code, verifier,
    );
    if (!hasGmailScope(tokens.scope)) {
      await revokeToken(tokens.access_token).catch(() => false);
      return back('missing_scope');
    }
    if (!tokens.refresh_token) return back('no_refresh_token');

    // prova real de conexão: perfil da caixa via Gmail API
    const gmail = new GmailClient({ getAccessToken: async () => tokens.access_token });
    const profile = await gmail.getProfile();

    const sb = adminClient();
    const key = env.tokenEncryptionKey();
    const { data: prev } = await sb.from('mailbot_gmail_accounts').select('id,email').eq('user_id', user.id).maybeSingle();
    const sameMailbox = prev?.email?.toLowerCase() === profile.emailAddress.toLowerCase();
    if (prev && !sameMailbox) await sb.from('mailbot_gmail_accounts').delete().eq('id', prev.id); // outra caixa: remove dados antigos

    const { data: account, error } = await sb.from('mailbot_gmail_accounts').upsert({
      ...(prev && sameMailbox ? { id: prev.id } : {}),
      user_id: user.id, email: profile.emailAddress, status: 'connected', messages_total: profile.messagesTotal, last_error: null,
    }, { onConflict: 'user_id' }).select('id').single();
    if (error || !account) throw new Error('account_upsert_failed');

    const { error: tErr } = await sb.from('mailbot_gmail_tokens').upsert({
      account_id: account.id, user_id: user.id,
      refresh_token_enc: encrypt(tokens.refresh_token, key),
      access_token_enc: encrypt(tokens.access_token, key),
      access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scope: tokens.scope, updated_at: new Date().toISOString(),
    });
    if (tErr) throw new Error('token_store_failed');
    log.info('gmail.connected', { user: user.id });
    return back('connected');
  } catch (e) {
    log.error('gmail.callback_failed', { code: errorCode(e) });
    return back('error');
  }
}
