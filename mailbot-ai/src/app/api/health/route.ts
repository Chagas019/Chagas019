import { NextResponse } from 'next/server';
import { env, missingConfig } from '@/lib/env';

export const dynamic = 'force-dynamic';

// Verificação de produção: informa o que está configurado (nunca valores).
export function GET() {
  return NextResponse.json({
    ok: true,
    app: 'mailbot-ai',
    database: env.supabaseConfigured(),
    gmailOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    ai: env.aiEnabled() ? env.aiProvider() : false,
    tokenEncryption: Boolean(process.env.TOKEN_ENCRYPTION_KEY),
    cron: Boolean(process.env.CRON_SECRET),
    missing: missingConfig(),
  });
}
