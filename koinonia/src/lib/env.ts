/** Variáveis públicas (seguras para o navegador). Nunca coloque segredos aqui. */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // integração Supabase da Vercel: chave "anon" (legada) ou "publishable" (nova); ambas são públicas por design
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export function isSupabaseConfigured(): boolean {
  return publicEnv.supabaseUrl.startsWith("https://") || publicEnv.supabaseUrl.startsWith("http://localhost") ||
    publicEnv.supabaseUrl.startsWith("http://127.0.0.1")
    ? publicEnv.supabaseAnonKey.length > 20
    : false;
}
