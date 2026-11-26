import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";

/** Cliente com a sessão do usuário (cookies) — sujeito às políticas RLS. */
export async function createSessionClient(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // chamado a partir de um Server Component: o middleware renova a sessão
        }
      },
    },
  });
}

let admin: SupabaseClient | null = null;
/**
 * Cliente com SERVICE ROLE — ignora RLS. Só existe no servidor (server-only) e é usado apenas
 * depois das verificações de autorização: confirmação de pagamento, downloads, URLs assinadas.
 */
export function createAdminClient(): SupabaseClient {
  if (!config.supabaseServiceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  admin ??= createClient(config.supabaseUrl, config.supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
