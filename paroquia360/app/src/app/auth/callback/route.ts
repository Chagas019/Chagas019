import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/format';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'));
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Registra o aceite da política de privacidade no primeiro acesso.
      await supabase.from('profiles').update({ privacy_consent_at: new Date().toISOString() })
        .eq('user_id', data.user.id).is('privacy_consent_at', null);
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL('/entrar?erro=link', url.origin));
}
