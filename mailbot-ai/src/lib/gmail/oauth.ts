// Google OAuth 2.0 (Authorization Code + PKCE) com escopo mínimo: gmail.readonly.
export const GMAIL_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.readonly',
];

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

export interface OAuthConfig { clientId: string; clientSecret: string; redirectUri: string }

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

export class OAuthError extends Error {
  constructor(public code: string, message?: string) { super(message ?? code); this.name = 'OAuthError'; }
}

export function buildAuthUrl(cfg: OAuthConfig, state: string, codeChallenge: string, loginHint?: string): string {
  const p = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  if (loginHint) p.set('login_hint', loginHint);
  return `${AUTH_URL}?${p}`;
}

async function tokenRequest(body: URLSearchParams, fetchImpl: typeof fetch): Promise<TokenResponse> {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new OAuthError(String(json.error ?? `http_${res.status}`));
  return json as unknown as TokenResponse;
}

export function exchangeCode(cfg: OAuthConfig, code: string, codeVerifier: string, fetchImpl: typeof fetch = fetch) {
  return tokenRequest(new URLSearchParams({
    code, code_verifier: codeVerifier, client_id: cfg.clientId, client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri, grant_type: 'authorization_code',
  }), fetchImpl);
}

export function refreshAccessToken(cfg: Pick<OAuthConfig, 'clientId' | 'clientSecret'>, refreshToken: string, fetchImpl: typeof fetch = fetch) {
  return tokenRequest(new URLSearchParams({
    refresh_token: refreshToken, client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: 'refresh_token',
  }), fetchImpl);
}

export async function revokeToken(token: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const res = await fetchImpl(REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
  });
  return res.ok;
}

export function hasGmailScope(scope: string): boolean {
  return scope.split(' ').includes('https://www.googleapis.com/auth/gmail.readonly');
}
