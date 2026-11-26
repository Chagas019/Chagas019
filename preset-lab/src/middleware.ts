import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Renova a sessão do Supabase Auth a cada requisição (somente no backend Supabase).
 * A autorização de verdade acontece no servidor, em cada página/ação (requireUser/requireAdmin).
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const useSupabase = process.env.DATA_BACKEND === "supabase" || (process.env.DATA_BACKEND !== "local" && url && key);
  if (!useSupabase || !url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|demo/|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)"],
};
