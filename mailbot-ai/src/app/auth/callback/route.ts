import { NextResponse, type NextRequest } from 'next/server';
import { sessionClient } from '@/lib/supabase/server';

// Retorno do login (link mágico / Google via Supabase Auth).
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const next = req.nextUrl.searchParams.get('next') ?? '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  if (code) {
    const sb = await sessionClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, req.url));
  }
  return NextResponse.redirect(new URL('/login?erro=link', req.url));
}
