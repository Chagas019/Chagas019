import 'server-only';
import { NextResponse } from 'next/server';
import { env, MissingConfigError } from '../env';
import { adminClient } from '../supabase/admin';
import { currentUser } from '../supabase/server';
import { SupabaseRepo } from '../data/supabase-repo';
import { AnthropicLlm, AiUnavailableError, BudgetExceededError, type Llm } from '../ai/llm';
import { GmailClient } from '../gmail/client';
import { dbTokenProvider } from '../gmail/tokens';
import { errorCode, log } from '../log';
import type { Repo } from '../data/repo';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function repo(): Repo {
  return new SupabaseRepo(adminClient());
}

export function llmFor(r: Repo): Llm | null {
  return env.aiEnabled() ? new AnthropicLlm(r) : null;
}

export function gmailFor(r: Repo, accountId: string) {
  return new GmailClient(dbTokenProvider(r, accountId, {
    clientId: env.googleClientId(), clientSecret: env.googleClientSecret(), encryptionKey: env.tokenEncryptionKey(),
  }));
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'Faça login para continuar.');
  return user;
}

/** Rate limit por usuário/ação (janela fixa no Postgres). */
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  const { data, error } = await adminClient().rpc('mailbot_rate_limit_hit', { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) { log.warn('ratelimit.unavailable', { code: error.code }); return; }
  if (data === false) throw new HttpError(429, 'Muitas requisições. Aguarde um instante e tente novamente.');
}

/** Converte erros em respostas JSON seguras (sem detalhes internos). */
export function handle(route: string, fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((e: unknown) => {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof MissingConfigError) return NextResponse.json({ error: `Servidor sem configuração: ${e.variable}` }, { status: 503 });
    if (e instanceof BudgetExceededError) return NextResponse.json({ error: 'Seu limite diário de uso de IA foi atingido. Ajuste em Configurações.' }, { status: 402 });
    if (e instanceof AiUnavailableError) return NextResponse.json({ error: e.message }, { status: 503 });
    log.error('api.error', { route, code: errorCode(e) });
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 });
  });
}
