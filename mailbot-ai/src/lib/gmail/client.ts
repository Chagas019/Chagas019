import { OAuthError } from './oauth';

// Cliente mínimo da Gmail API v1 (somente leitura) com:
// - renovação automática do access token (401)
// - retentativa com backoff exponencial em 429/5xx respeitando Retry-After
// - controle de concorrência
const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

export class GmailApiError extends Error {
  constructor(public status: number, public reason: string) {
    super(`gmail_${status}_${reason}`);
    this.name = 'GmailApiError';
  }
}

export class ReauthRequiredError extends Error {
  constructor() { super('reauth_required'); this.name = 'ReauthRequiredError'; }
}

export interface TokenProvider {
  /** Retorna um access token válido (renova se expirado). */
  getAccessToken(forceRefresh?: boolean): Promise<string>;
}

export interface GmailHeader { name: string; value: string }
export interface GmailPart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: GmailPart[];
}
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: GmailPart;
}
export interface HistoryRecord {
  id: string;
  messagesAdded?: { message: { id: string; threadId: string; labelIds?: string[] } }[];
  messagesDeleted?: { message: { id: string } }[];
  labelsAdded?: { message: { id: string; labelIds?: string[] }; labelIds: string[] }[];
  labelsRemoved?: { message: { id: string; labelIds?: string[] }; labelIds: string[] }[];
}

export interface GmailClientOptions {
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
}

export class GmailClient {
  private fetchImpl: typeof fetch;
  private maxRetries: number;
  private sleep: (ms: number) => Promise<void>;

  constructor(private tokens: TokenProvider, opts: GmailClientOptions = {}) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.maxRetries = opts.maxRetries ?? 5;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  private async request<T>(path: string, params: Record<string, string | string[] | undefined> = {}): Promise<T> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      for (const item of Array.isArray(v) ? v : [v]) qs.append(k, item);
    }
    const url = `${BASE}${path}${qs.size ? `?${qs}` : ''}`;
    let refreshed = false;
    for (let attempt = 0; ; attempt++) {
      let token: string;
      try {
        token = await this.tokens.getAccessToken(refreshed);
      } catch (e) {
        if (e instanceof OAuthError && e.code === 'invalid_grant') throw new ReauthRequiredError();
        throw e;
      }
      const res = await this.fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) return (await res.json()) as T;

      const body = (await res.json().catch(() => ({}))) as { error?: { errors?: { reason?: string }[]; status?: string } };
      const reason = body.error?.errors?.[0]?.reason ?? body.error?.status ?? 'unknown';

      if (res.status === 401 && !refreshed) { refreshed = true; continue; }
      if (res.status === 401) throw new ReauthRequiredError();
      const rateLimited = res.status === 429 || (res.status === 403 && /rateLimit|userRateLimitExceeded/i.test(reason));
      if ((rateLimited || res.status >= 500) && attempt < this.maxRetries) {
        const retryAfter = Number(res.headers.get('retry-after'));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(32_000, 2 ** attempt * 500) + Math.floor(Math.random() * 250);
        await this.sleep(wait);
        continue;
      }
      throw new GmailApiError(res.status, reason);
    }
  }

  getProfile() {
    return this.request<{ emailAddress: string; messagesTotal: number; threadsTotal: number; historyId: string }>('/profile');
  }

  listMessages(opts: { q?: string; pageToken?: string; maxResults?: number }) {
    return this.request<{ messages?: { id: string; threadId: string }[]; nextPageToken?: string; resultSizeEstimate?: number }>(
      '/messages',
      { q: opts.q, pageToken: opts.pageToken, maxResults: String(opts.maxResults ?? 100), includeSpamTrash: 'false' },
    );
  }

  getMessage(id: string, format: 'full' | 'minimal' = 'full') {
    return this.request<GmailMessage>(`/messages/${encodeURIComponent(id)}`, { format });
  }

  listHistory(startHistoryId: string, pageToken?: string) {
    return this.request<{ history?: HistoryRecord[]; nextPageToken?: string; historyId: string }>('/history', {
      startHistoryId,
      pageToken,
      maxResults: '500',
      historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
    });
  }

  /** Busca várias mensagens com concorrência limitada (respeita a cota da API). */
  async getMessages(ids: string[], concurrency = 8): Promise<{ found: GmailMessage[]; missing: string[] }> {
    const found: GmailMessage[] = [];
    const missing: string[] = [];
    let i = 0;
    const worker = async () => {
      while (i < ids.length) {
        const id = ids[i++];
        try {
          found.push(await this.getMessage(id));
        } catch (e) {
          if (e instanceof GmailApiError && e.status === 404) missing.push(id);
          else throw e;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
    return { found, missing };
  }
}
