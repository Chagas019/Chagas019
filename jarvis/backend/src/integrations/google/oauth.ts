import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { IntegrationToken, Repos } from "../../core/types.js";
import { decrypt, encrypt } from "../../server/crypto.js";

export const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
];

export type FetchFn = typeof fetch;

export class NotConnectedError extends Error {
  constructor(msg = "Google não conectado") { super(msg); }
}
export class GoogleApiError extends Error {
  constructor(public readonly status: number, msg: string) { super(msg); }
}

interface StoredTokens { accessToken: string; refreshToken?: string; expiresAt: number }

export interface GoogleAuthDeps {
  repos: Repos;
  encryptionKey?: Buffer;
  env: NodeJS.ProcessEnv;
  fetch?: FetchFn;
  now?: () => number;
}

const b64u = (b: Buffer) => b.toString("base64url");

export function createGoogleAuth(deps: GoogleAuthDeps) {
  const f: FetchFn = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  const clientId = deps.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = deps.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = deps.env.GOOGLE_REDIRECT_URI?.trim();
  const key = deps.encryptionKey;
  const configured = Boolean(clientId && clientSecret && redirectUri && key);
  const stateKey = key ? createHash("sha256").update(Buffer.concat([Buffer.from("jarvis-google-oauth-state:"), key])).digest() : undefined;

  function missingReason(): string {
    if (!key) return "JARVIS_ENCRYPTION_KEY ausente";
    return "defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI";
  }

  async function postForm(url: string, params: Record<string, string>): Promise<{ status: number; json: Record<string, unknown> }> {
    const res = await f(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
    let json: Record<string, unknown> = {};
    try { json = (await res.json()) as Record<string, unknown>; } catch { /* corpo vazio */ }
    return { status: res.status, json };
  }

  async function save(userId: string, t: StoredTokens, scopes: string[]): Promise<void> {
    await deps.repos.integrations.put({ userId, provider: "google", encrypted: encrypt(JSON.stringify(t), key!), scopes });
  }

  async function load(userId: string): Promise<{ rec: IntegrationToken; tokens: StoredTokens } | null> {
    if (!key) return null;
    const rec = await deps.repos.integrations.get(userId, "google");
    if (!rec) return null;
    try { return { rec, tokens: JSON.parse(decrypt(rec.encrypted, key)) as StoredTokens }; } catch { return null; }
  }

  return {
    configured,
    missingReason,

    async status(userId: string): Promise<{ configured: boolean; connected: boolean; scopes: string[] }> {
      const rec = key ? await deps.repos.integrations.get(userId, "google") : null;
      return { configured, connected: Boolean(rec), scopes: rec?.scopes ?? [] };
    },

    /** Gera URL de consentimento com PKCE (S256); verifier viaja cifrado dentro do state (JWT HS256, 10 min). */
    async startUrl(userId: string): Promise<string> {
      if (!configured || !stateKey) throw new Error("not_configured");
      const verifier = b64u(randomBytes(48));
      const challenge = b64u(createHash("sha256").update(verifier).digest());
      const state = await new SignJWT({ uid: userId, cv: encrypt(verifier, key!) })
        .setProtectedHeader({ alg: "HS256" }).setIssuedAt(Math.floor(now() / 1000)).setExpirationTime(Math.floor(now() / 1000) + 600).setJti(b64u(randomBytes(12)))
        .sign(stateKey);
      const u = new URL(AUTH_URL);
      u.search = new URLSearchParams({
        client_id: clientId!, redirect_uri: redirectUri!, response_type: "code", scope: GOOGLE_SCOPES.join(" "),
        access_type: "offline", prompt: "consent", include_granted_scopes: "true",
        code_challenge: challenge, code_challenge_method: "S256", state,
      }).toString();
      return u.toString();
    },

    /** Valida state, troca code e grava tokens cifrados. Retorna ok ou código de erro curto. */
    async handleCallback(q: { code?: string; state?: string; error?: string }): Promise<{ ok: true } | { ok: false; error: string }> {
      if (!configured || !stateKey) return { ok: false, error: "not_configured" };
      if (q.error) return { ok: false, error: "access_denied" };
      if (!q.state || !q.code) return { ok: false, error: "invalid_request" };
      let userId: string; let verifier: string;
      try {
        const { payload } = await jwtVerify(q.state, stateKey, { algorithms: ["HS256"], currentDate: new Date(now()) });
        userId = String(payload.uid);
        verifier = decrypt(String(payload.cv), key!);
      } catch { return { ok: false, error: "invalid_state" }; }
      try {
        const r = await postForm(TOKEN_URL, {
          code: q.code, client_id: clientId!, client_secret: clientSecret!, redirect_uri: redirectUri!,
          grant_type: "authorization_code", code_verifier: verifier,
        });
        const accessToken = r.json.access_token;
        if (r.status !== 200 || typeof accessToken !== "string") return { ok: false, error: "token_exchange_failed" };
        const refresh = typeof r.json.refresh_token === "string" ? r.json.refresh_token : undefined;
        const prev = refresh ? null : await load(userId);
        const scopes = typeof r.json.scope === "string" ? r.json.scope.split(" ").filter(Boolean) : GOOGLE_SCOPES;
        const expiresIn = typeof r.json.expires_in === "number" ? r.json.expires_in : 3600;
        await save(userId, { accessToken, refreshToken: refresh ?? prev?.tokens.refreshToken, expiresAt: now() + expiresIn * 1000 }, scopes);
        return { ok: true };
      } catch { return { ok: false, error: "token_exchange_failed" }; }
    },

    async refresh(userId: string): Promise<string> {
      const cur = await load(userId);
      if (!cur) throw new NotConnectedError();
      if (!cur.tokens.refreshToken) throw new NotConnectedError("Google não conectado (reconecte a conta)");
      const r = await postForm(TOKEN_URL, {
        client_id: clientId!, client_secret: clientSecret!, refresh_token: cur.tokens.refreshToken, grant_type: "refresh_token",
      });
      const at = r.json.access_token;
      if (r.status !== 200 || typeof at !== "string") {
        if (r.json.error === "invalid_grant") throw new NotConnectedError("Acesso ao Google expirou ou foi revogado; reconecte a conta");
        throw new GoogleApiError(r.status, "Falha ao renovar acesso ao Google");
      }
      const expiresIn = typeof r.json.expires_in === "number" ? r.json.expires_in : 3600;
      await save(userId, { accessToken: at, refreshToken: cur.tokens.refreshToken, expiresAt: now() + expiresIn * 1000 }, cur.rec.scopes);
      return at;
    },

    /** Access token válido (renova se expirado). Lança NotConnectedError se o usuário não conectou. */
    async accessToken(userId: string): Promise<string> {
      if (!configured) throw new NotConnectedError();
      const cur = await load(userId);
      if (!cur) throw new NotConnectedError();
      if (cur.tokens.expiresAt - 60_000 > now()) return cur.tokens.accessToken;
      return this.refresh(userId);
    },

    /** fetch autenticado: 401 → refresh uma vez e repete. Devolve JSON; erros viram GoogleApiError sem vazar tokens. */
    async api<T = unknown>(userId: string, url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
      const call = async (token: string) => f(url, {
        method: init.method ?? "GET",
        headers: { authorization: `Bearer ${token}`, ...(init.body !== undefined ? { "content-type": "application/json" } : {}) },
        ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      });
      let res = await call(await this.accessToken(userId));
      if (res.status === 401) res = await call(await this.refresh(userId));
      if (!res.ok) {
        let msg = "";
        try { msg = String(((await res.json()) as { error?: { message?: string } }).error?.message ?? ""); } catch { /* ignore */ }
        throw new GoogleApiError(res.status, `Google API erro ${res.status}${msg ? `: ${msg.slice(0, 120)}` : ""}`);
      }
      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    },

    /** Revoga (best effort) e remove o token local. */
    async disconnect(userId: string): Promise<void> {
      const cur = await load(userId);
      const tok = cur?.tokens.refreshToken ?? cur?.tokens.accessToken;
      if (tok) { try { await postForm(REVOKE_URL, { token: tok }); } catch { /* best effort */ } }
      await deps.repos.integrations.remove(userId, "google");
    },
  };
}
export type GoogleAuth = ReturnType<typeof createGoogleAuth>;
