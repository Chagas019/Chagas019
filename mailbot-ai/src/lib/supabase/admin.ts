import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env';

let admin: SupabaseClient | null = null;

/** Cliente com service role — SOMENTE no servidor. Ignora RLS; toda query filtra por user_id. */
export function adminClient(): SupabaseClient {
  if (typeof window !== 'undefined') throw new Error('adminClient no navegador');
  admin ??= createClient(env.supabaseUrl(), env.supabaseServiceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
