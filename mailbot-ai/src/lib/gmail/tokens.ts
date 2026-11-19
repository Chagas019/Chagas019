import { decrypt, encrypt } from '../crypto';
import type { Repo } from '../data/repo';
import type { TokenProvider } from './client';
import { refreshAccessToken } from './oauth';

/** Fornece access tokens a partir do refresh token criptografado, renovando quando necessário. */
export function dbTokenProvider(
  repo: Repo,
  accountId: string,
  cfg: { clientId: string; clientSecret: string; encryptionKey: string },
  fetchImpl: typeof fetch = fetch,
): TokenProvider {
  let cached: { token: string; exp: number } | null = null;
  return {
    async getAccessToken(forceRefresh = false) {
      if (!forceRefresh && cached && cached.exp - 60_000 > Date.now()) return cached.token;
      const row = await repo.getTokens(accountId);
      if (!row) throw new Error('tokens_not_found');
      const exp = row.access_token_expires_at ? Date.parse(row.access_token_expires_at) : 0;
      if (!forceRefresh && row.access_token_enc && exp - 60_000 > Date.now()) {
        cached = { token: decrypt(row.access_token_enc, cfg.encryptionKey), exp };
        return cached.token;
      }
      const refreshToken = decrypt(row.refresh_token_enc, cfg.encryptionKey);
      const t = await refreshAccessToken(cfg, refreshToken, fetchImpl);
      const newExp = Date.now() + t.expires_in * 1000;
      await repo.saveAccessToken(accountId, encrypt(t.access_token, cfg.encryptionKey), new Date(newExp).toISOString());
      cached = { token: t.access_token, exp: newExp };
      return t.access_token;
    },
  };
}
