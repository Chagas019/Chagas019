// Leitura centralizada das variáveis de ambiente. Nunca loga valores.
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new MissingConfigError(name);
  return v;
}

export class MissingConfigError extends Error {
  constructor(public variable: string) {
    super(`Configuração ausente: ${variable}`);
  }
}

export const env = {
  supabaseUrl: () => req('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => req('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceKey: () => req('SUPABASE_SERVICE_ROLE_KEY'),
  googleClientId: () => req('GOOGLE_CLIENT_ID'),
  googleClientSecret: () => req('GOOGLE_CLIENT_SECRET'),
  appUrl: () => (process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')).replace(/\/$/, ''),
  supabaseConfigured: () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  tokenEncryptionKey: () => req('TOKEN_ENCRYPTION_KEY'),
  cronSecret: () => req('CRON_SECRET'),
  modelFast: () => process.env.AI_MODEL_FAST || 'claude-haiku-5-5',
  modelSmart: () => process.env.AI_MODEL_SMART || 'claude-sonnet-5-5',
  /** IA disponível: chave direta da Anthropic, chave da AI Gateway ou OIDC automático da Vercel. */
  aiEnabled: () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL),
  aiProvider: (): 'anthropic' | 'gateway' => (process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'gateway'),
};

/** Lista de variáveis obrigatórias que estão faltando (para diagnóstico na tela de configurações). */
export function missingConfig(): string[] {
  const names = [
    'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'TOKEN_ENCRYPTION_KEY', 'CRON_SECRET',
  ];
  const missing = names.filter((n) => !process.env[n]);
  if (!env.aiEnabled()) missing.push('ANTHROPIC_API_KEY ou AI_GATEWAY_API_KEY');
  return missing;
}
