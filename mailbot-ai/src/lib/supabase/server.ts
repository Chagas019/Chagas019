import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '../env';

/** Cliente com a sessão do usuário (RLS aplicado). Para Server Components e Route Handlers. */
export async function sessionClient() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* Server Component: ignorado */ }
      },
    },
  });
}

export async function currentUser() {
  const sb = await sessionClient();
  const { data } = await sb.auth.getUser();
  return data.user;
}
