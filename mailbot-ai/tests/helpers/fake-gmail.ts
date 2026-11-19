import type { GmailMessage, HistoryRecord } from '../../src/lib/gmail/client';

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');

export function makeMessage(id: string, o: { from?: string; subject?: string; body?: string; html?: string; labels?: string[]; date?: number; thread?: string; listUnsub?: boolean; to?: string } = {}): GmailMessage {
  const headers = [
    { name: 'From', value: o.from ?? 'Ana Lima <ana@empresa.com>' },
    { name: 'To', value: o.to ?? 'eu@gmail.com' },
    { name: 'Subject', value: o.subject ?? `Assunto ${id}` },
    { name: 'Date', value: new Date(o.date ?? Date.now()).toUTCString() },
    ...(o.listUnsub ? [{ name: 'List-Unsubscribe', value: '<mailto:unsub@news.com>' }] : []),
  ];
  const parts = o.html
    ? [{ mimeType: 'text/html', body: { data: b64(o.html) } }]
    : [{ mimeType: 'text/plain', body: { data: b64(o.body ?? `Corpo da mensagem ${id}`) } }, { mimeType: 'text/html', body: { data: b64('<p>ignorado</p>') } }];
  return {
    id, threadId: o.thread ?? `t-${id}`, labelIds: o.labels ?? ['INBOX', 'UNREAD'], snippet: (o.body ?? '').slice(0, 80),
    internalDate: String(o.date ?? Date.now()),
    payload: { mimeType: 'multipart/alternative', headers, parts },
  };
}

/** Simula a Gmail API (messages.list paginado, messages.get, history.list, profile) via fetch. */
export class FakeGmail {
  messages = new Map<string, GmailMessage>();
  history: HistoryRecord[] = [];
  historyId = 1000;
  expiredHistoryBefore = 0;
  calls: string[] = [];
  failNext: { status: number; times: number; retryAfter?: string } | null = null;
  validToken = 'tok-1';

  add(m: GmailMessage) { this.messages.set(m.id, m); this.historyId++; this.history.push({ id: String(this.historyId), messagesAdded: [{ message: { id: m.id, threadId: m.threadId, labelIds: m.labelIds } }] }); }
  remove(id: string) { this.messages.delete(id); this.historyId++; this.history.push({ id: String(this.historyId), messagesDeleted: [{ message: { id } }] }); }
  relabel(id: string, labels: string[]) {
    const m = this.messages.get(id)!; m.labelIds = labels; this.historyId++;
    this.history.push({ id: String(this.historyId), labelsAdded: [{ message: { id, labelIds: labels }, labelIds: labels }] });
  }

  fetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    this.calls.push(url.pathname + url.search);
    const json = (status: number, body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
    if (this.failNext && this.failNext.times > 0) {
      this.failNext.times--;
      return json(this.failNext.status, { error: { errors: [{ reason: 'rateLimitExceeded' }] } }, this.failNext.retryAfter ? { 'retry-after': this.failNext.retryAfter } : {});
    }
    const auth = new Headers(init?.headers).get('authorization');
    if (auth !== `Bearer ${this.validToken}`) return json(401, { error: { status: 'UNAUTHENTICATED' } });
    const path = url.pathname.replace('/gmail/v1/users/me', '');
    if (path === '/profile') return json(200, { emailAddress: 'eu@gmail.com', messagesTotal: this.messages.size, threadsTotal: 1, historyId: String(this.historyId) });
    if (path === '/messages') {
      const all = [...this.messages.values()].sort((a, b) => Number(b.internalDate) - Number(a.internalDate));
      const start = Number(url.searchParams.get('pageToken') ?? 0);
      const size = Number(url.searchParams.get('maxResults') ?? 100);
      const page = all.slice(start, start + size);
      return json(200, { messages: page.map((m) => ({ id: m.id, threadId: m.threadId })), nextPageToken: start + size < all.length ? String(start + size) : undefined });
    }
    if (path.startsWith('/messages/')) {
      const m = this.messages.get(decodeURIComponent(path.split('/')[2]));
      return m ? json(200, m) : json(404, { error: { errors: [{ reason: 'notFound' }] } });
    }
    if (path === '/history') {
      const start = Number(url.searchParams.get('startHistoryId'));
      if (start < this.expiredHistoryBefore) return json(404, { error: { errors: [{ reason: 'notFound' }] } });
      return json(200, { history: this.history.filter((h) => Number(h.id) > start), historyId: String(this.historyId) });
    }
    return json(404, {});
  };
}
