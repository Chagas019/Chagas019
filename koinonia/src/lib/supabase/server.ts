import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Usa a chave anon + cookie de sessão do usuário: toda autorização é feita pelo RLS.
 * Retorna null quando o backend não está configurado (a UI mostra estado de configuração pendente).
 */
export async function createClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch (error) {
          // Server Components não podem gravar cookies; o proxy renova a sessão nesses casos.
          if (process.env.NODE_ENV === "development") console.debug("cookie write skipped", error);
        }
      },
    },
  });
}

/** Usuário autenticado validado no servidor do Supabase (getUser, nunca getSession). */
export async function getCurrentUser(): Promise<{ supabase: SupabaseClient | null; user: User | null }> {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}
