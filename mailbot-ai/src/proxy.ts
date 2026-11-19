import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Renova a sessão do Supabase e protege as telas do app.
const PUBLIC = ['/login', '/privacidade', '/auth/callback', '/api/cron', '/api/gmail/callback', '/api/health'];

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // banco ainda não conectado: telas internas vão direto para a página de instalação/login
    const path = req.nextUrl.pathname;
    const isPublic = PUBLIC.some((p) => path === p || path.startsWith(`${p}/`));
    if (!isPublic && !path.startsWith('/api/')) return NextResponse.redirect(new URL('/login', req.url));
    return res;
  }
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser();
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(`${p}/`));
  if (!data.user && !isPublic && !path.startsWith('/api/')) {
    const login = req.nextUrl.clone();
    login.pathname = '/login';
    login.search = path === '/' ? '' : `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(login);
  }
  // cabeçalhos de segurança
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|svg|webp)$).*)'],
};
