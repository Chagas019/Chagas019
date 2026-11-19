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
  appUrl: () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
  tokenEncryptionKey: () => req('TOKEN_ENCRYPTION_KEY'),
  cronSecret: () => req('CRON_SECRET'),
  modelFast: () => process.env.AI_MODEL_FAST || 'claude-haiku-5-5',
  modelSmart: () => process.env.AI_MODEL_SMART || 'claude-sonnet-5-5',
  aiEnabled: () => Boolean(process.env.ANTHROPIC_API_KEY),
};

/** Lista de variáveis obrigatórias que estão faltando (para diagnóstico na tela de configurações). */
export function missingConfig(): string[] {
  const names = [
    'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'TOKEN_ENCRYPTION_KEY', 'ANTHROPIC_API_KEY', 'CRON_SECRET',
  ];
  return names.filter((n) => !process.env[n]);
}
