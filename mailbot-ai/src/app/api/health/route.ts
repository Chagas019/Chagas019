import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { env, missingConfig } from '@/lib/env';
import { safeEqual, sha256 } from '@/lib/crypto';
import { providerModelId } from '@/lib/ai/models';
import { errorCode } from '@/lib/log';

export const dynamic = 'force-dynamic';

/** Chave da sonda de IA: derivada do CRON_SECRET (não expõe o segredo; só permite este teste). */
function probeKey(): string | null {
  return process.env.CRON_SECRET ? sha256(`ai-probe:${process.env.CRON_SECRET}`).slice(0, 24) : null;
}

async function probeAi(): Promise<{ ok: boolean; provider: string; model: string; detail: string }> {
  const provider = env.aiProvider();
  const model = providerModelId(env.modelFast(), provider);
  try {
    let client: Anthropic;
    if (provider === 'anthropic') client = new Anthropic({ maxRetries: 1 });
    else {
      let apiKey = process.env.AI_GATEWAY_API_KEY;
      if (!apiKey) apiKey = await (await import('@vercel/oidc')).getVercelOidcToken();
      client = new Anthropic({ apiKey, baseURL: 'https://ai-gateway.vercel.sh', maxRetries: 1 });
    }
    const m = await client.messages.create({ model, max_tokens: 64, messages: [{ role: 'user', content: 'Responda apenas: ok' }] });
    const text = m.content.filter((b) => b.type === 'text').map((b) => (b as Anthropic.TextBlock).text).join('').trim();
    return { ok: text.length > 0, provider, model, detail: `stop=${m.stop_reason} tokens=${m.usage.input_tokens}/${m.usage.output_tokens}` };
  } catch (e) {
    return { ok: false, provider, model, detail: e instanceof Anthropic.APIError ? `http_${e.status}` : errorCode(e) };
  }
}

// Verificação de produção: informa o que está configurado (nunca valores).
export async function GET(req: NextRequest) {
  const body: Record<string, unknown> = {
    ok: true,
    app: 'mailbot-ai',
    database: env.supabaseConfigured(),
    gmailOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    ai: env.aiEnabled() ? env.aiProvider() : false,
    tokenEncryption: Boolean(process.env.TOKEN_ENCRYPTION_KEY),
    cron: Boolean(process.env.CRON_SECRET),
    missing: missingConfig(),
  };
  const probe = req.nextUrl.searchParams.get('probe');
  const key = probeKey();
  if (probe && key && safeEqual(probe, key)) body.aiProbe = await probeAi();
  return NextResponse.json(body);
}
