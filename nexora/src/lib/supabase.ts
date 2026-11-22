/**
 * Cliente Supabase. Só a chave pública (anon) é usada aqui: quem protege os dados são as políticas
 * de Row Level Security em supabase/migrations. Sem as variáveis, o site roda em modo demonstração.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
export const isSupabaseConfigured = supabase !== null;
export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) || '').replace(/\/$/, '');
export const MEDIA_BUCKET = 'property-media';
