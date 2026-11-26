import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/redirect";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const safe = safeRedirectPath(req.nextUrl.searchParams.get("voltar"));
  const sb = await getServerSupabase();
  if (sb && code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safe, req.url));
  }
  return NextResponse.redirect(new URL("/entrar?erro=link", req.url));
}
