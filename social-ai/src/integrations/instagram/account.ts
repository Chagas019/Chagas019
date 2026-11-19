import { env } from '../../config/env.js';
import { getDb, json } from '../../db/db.js';
import { getActiveAccount, setIntegrationStatus } from '../../db/repo.js';
import { decrypt, encrypt, hmac, randomToken, safeEqual } from '../../security/crypto.js';
import { IntegrationUnavailableError, PermanentError } from '../../lib/errors.js';
import { GraphClient, OPTIONAL_PERMISSIONS, REQUIRED_PERMISSIONS, type FetchLike } from './graph.js';

let fetchOverride: FetchLike | undefined;
/** Usado apenas em testes automatizados para injetar respostas HTTP. */
export function setGraphFetch(f: FetchLike | undefined) {
  fetchOverride = f;
}

export function graphClientFor(account?: any, opts: { pollIntervalMs?: number; sleep?: (ms: number) => Promise<void> } = {}): GraphClient {
  const acc = account ?? getActiveAccount();
  let token = acc?.access_token_enc ? decrypt(acc.access_token_enc) : env().IG_ACCESS_TOKEN;
  if (!token) throw new IntegrationUnavailableError('instagram', 'Conta do Instagram não conectada.');
  return new GraphClient({
    accessToken: token,
    version: env().META_GRAPH_VERSION,
    host: env().META_GRAPH_HOST,
    fetchImpl: fetchOverride,
    ...opts,
  });
}

// ---------------- OAuth (Login do Facebook para Instagram API) ----------------

export function oauthStartUrl(): { url: string; state: string } {
  const e = env();
  if (!e.META_APP_ID || !e.META_REDIRECT_URI) {
    throw new IntegrationUnavailableError('instagram', 'Defina META_APP_ID, META_APP_SECRET e META_REDIRECT_URI.');
  }
  const nonce = randomToken(16);
  const state = `${nonce}.${hmac(nonce)}`;
  const url = new URL(`https://www.facebook.com/${e.META_GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set('client_id', e.META_APP_ID);
  url.searchParams.set('redirect_uri', e.META_REDIRECT_URI);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', [...REQUIRED_PERMISSIONS, ...OPTIONAL_PERMISSIONS].join(','));
  return { url: url.toString(), state };
}

export function verifyState(state: string): boolean {
  const [nonce, sig] = state.split('.');
  return !!nonce && !!sig && safeEqual(hmac(nonce), sig);
}

async function graphGet(path: string, params: Record<string, string>) {
  const e = env();
  const url = new URL(`${e.META_GRAPH_HOST}/${e.META_GRAPH_VERSION}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await (fetchOverride ?? fetch)(url.toString());
  const data: any = await res.json();
  if (!res.ok || data.error) throw new PermanentError(data?.error?.message ?? `OAuth HTTP ${res.status}`);
  return data;
}

/** Troca o code por um token de longa duração (~60 dias) e conecta a conta Business/Creator. */
export async function completeOAuth(code: string) {
  const e = env();
  if (!e.META_APP_ID || !e.META_APP_SECRET || !e.META_REDIRECT_URI) {
    throw new IntegrationUnavailableError('instagram', 'Credenciais do app Meta ausentes.');
  }
  const short = await graphGet('oauth/access_token', {
    client_id: e.META_APP_ID, client_secret: e.META_APP_SECRET, redirect_uri: e.META_REDIRECT_URI, code,
  });
  const long = await graphGet('oauth/access_token', {
    grant_type: 'fb_exchange_token', client_id: e.META_APP_ID, client_secret: e.META_APP_SECRET, fb_exchange_token: short.access_token,
  });
  const token: string = long.access_token;
  const expiresAt = long.expires_in ? new Date(Date.now() + long.expires_in * 1000).toISOString() : null;
  return connectWithToken(token, expiresAt);
}

export async function connectWithToken(token: string, expiresAt: string | null = null, preferredIgUserId?: string) {
  const client = new GraphClient({ accessToken: token, version: env().META_GRAPH_VERSION, host: env().META_GRAPH_HOST, fetchImpl: fetchOverride });
  const pages = await client.pagesWithInstagram();
  const page = pages.data.find((p: any) => p.instagram_business_account && (!preferredIgUserId || p.instagram_business_account.id === preferredIgUserId))
    ?? pages.data.find((p: any) => p.instagram_business_account);
  if (!page) {
    throw new PermanentError('Nenhuma conta Instagram profissional (Business/Creator) vinculada a uma Página do Facebook foi encontrada.');
  }
  const igId: string = page.instagram_business_account.id;
  const db = getDb();
  db.run(
    `INSERT INTO instagram_accounts (ig_user_id, username, page_id, access_token_enc, token_expires_at, status)
     VALUES (?, ?, ?, ?, ?, 'connected')
     ON CONFLICT(ig_user_id) DO UPDATE SET access_token_enc=excluded.access_token_enc, token_expires_at=excluded.token_expires_at,
       page_id=excluded.page_id, status='connected', updated_at=datetime('now')`,
    igId, page.instagram_business_account.username ?? null, page.id, encrypt(token), expiresAt,
  );
  db.run(`UPDATE instagram_accounts SET status='disconnected' WHERE ig_user_id <> ?`, igId);
  return verifyAccount();
}

/**
 * Verifica elegibilidade, permissões e requisitos da conta. Atualiza dados do perfil.
 * Retorna um relatório explícito do que está ok e do que falta.
 */
export async function verifyAccount() {
  const acc = getActiveAccount();
  if (!acc) throw new IntegrationUnavailableError('instagram', 'Nenhuma conta conectada.');
  const client = graphClientFor(acc);
  const report: { ok: boolean; checks: { name: string; ok: boolean; detail: string }[] } = { ok: true, checks: [] };
  const check = (name: string, ok: boolean, detail: string) => {
    report.checks.push({ name, ok, detail });
    if (!ok) report.ok = false;
  };

  let granted: string[] = [];
  try {
    const perms = await client.permissions();
    granted = perms.data.filter((p) => p.status === 'granted').map((p) => p.permission);
    for (const p of REQUIRED_PERMISSIONS) check(`Permissão ${p}`, granted.includes(p), granted.includes(p) ? 'concedida' : 'NÃO concedida');
  } catch (e: any) {
    check('Leitura de permissões', false, e.message);
  }

  let profile: any = null;
  try {
    profile = await client.account(acc.ig_user_id);
    check('Conta profissional acessível', true, `@${profile.username}`);
  } catch (e: any) {
    check('Conta profissional acessível', false, e.message);
  }

  let quota: any = null;
  try {
    const lim = await client.publishingLimit(acc.ig_user_id);
    quota = lim.data?.[0] ?? null;
    check('Limite de publicação consultável', true, quota ? `${quota.quota_usage}/${quota.config?.quota_total ?? '?'} nas últimas 24h` : 'sem dados');
  } catch (e: any) {
    check('Limite de publicação consultável', false, e.message);
  }

  const pub = env().PUBLIC_BASE_URL;
  check('URL pública HTTPS para mídias', /^https:\/\//.test(pub), pub ? pub : 'PUBLIC_BASE_URL não definida — a Graph API precisa baixar as mídias por HTTPS');

  if (acc.token_expires_at) {
    const days = (new Date(acc.token_expires_at).getTime() - Date.now()) / 86400_000;
    check('Validade do token', days > 3, `${Math.floor(days)} dias restantes`);
  }

  getDb().run(
    `UPDATE instagram_accounts SET username=COALESCE(?, username), name=?, biography=?, followers_count=?, media_count=?,
      profile_picture_url=?, permissions=?, eligibility=?, updated_at=datetime('now') WHERE id=?`,
    profile?.username ?? null, profile?.name ?? null, profile?.biography ?? null, profile?.followers_count ?? null,
    profile?.media_count ?? null, profile?.profile_picture_url ?? null, JSON.stringify(granted), JSON.stringify({ ...report, quota }), acc.id,
  );
  setIntegrationStatus('instagram', report.ok ? 'ok' : 'degraded', { username: profile?.username, checks: report.checks }, report.ok ? null : 'Verificação com pendências');
  return report;
}

export function confirmPermissions(accountId: number) {
  const acc = getDb().get('SELECT * FROM instagram_accounts WHERE id = ?', accountId);
  if (!acc) throw new PermanentError('Conta não encontrada');
  const elig = json.parse<any>(acc.eligibility, {});
  if (!elig.ok) throw new PermanentError('A verificação da conta possui pendências. Rode "Verificar conta" e resolva os itens antes de confirmar.');
  getDb().run('UPDATE instagram_accounts SET permissions_confirmed = 1 WHERE id = ?', accountId);
}

export function disconnectAccount(accountId: number) {
  getDb().run(`UPDATE instagram_accounts SET status='disconnected', access_token_enc=NULL, permissions_confirmed=0 WHERE id=?`, accountId);
  setIntegrationStatus('instagram', 'not_configured', {}, null);
}
