import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { pkceChallenge, randomToken } from '@/lib/crypto';
import { buildAuthUrl } from '@/lib/gmail/oauth';
import { handle, rateLimit, requireUser } from '@/lib/server/context';

// Inicia o OAuth do Google (gmail.readonly) com state + PKCE guardados em cookie httpOnly.
export function GET() {
  return handle('gmail.connect', async () => {
    const user = await requireUser();
    await rateLimit(`connect:${user.id}`, 10, 600);
    const state = randomToken(24);
    const verifier = randomToken(48);
    const url = buildAuthUrl(
      { clientId: env.googleClientId(), clientSecret: '', redirectUri: `${env.appUrl()}/api/gmail/callback` },
      state, pkceChallenge(verifier), user.email ?? undefined,
    );
    const res = NextResponse.redirect(url);
    res.cookies.set('mb_oauth', `${state}.${verifier}`, {
      httpOnly: true, secure: env.appUrl().startsWith('https'), sameSite: 'lax', path: '/api/gmail/callback', maxAge: 600,
    });
    return res;
  });
}
