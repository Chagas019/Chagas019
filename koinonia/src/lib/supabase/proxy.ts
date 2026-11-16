import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

/** Rotas que exigem login. A autorização fina continua no banco (RLS). */
export const PROTECTED_PREFIXES = ["/painel", "/perfil", "/onboarding", "/match", "/comunidades/nova", "/gerenciar", "/admin", "/mensagens", "/conta", "/recursos"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || /^\/comunidades\/[^/]+\/gerenciar/.test(pathname);
}

/** Renova a sessão (cookies) a cada requisição e redireciona visitantes de rotas protegidas. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  let isAuthenticated = false;

  if (isSupabaseConfigured()) {
    const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    isAuthenticated = Boolean(data.user);
  }

  if (!isAuthenticated && isProtectedPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}
