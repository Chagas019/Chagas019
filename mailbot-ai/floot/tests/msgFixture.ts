import type { GmailMessage } from '../helpers/gmailApi';

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
export function msg(id: string, o: { from?: string; subject?: string; body?: string; html?: string; labels?: string[]; listUnsub?: boolean; date?: number } = {}): GmailMessage {
  return {
    id, threadId: `t-${id}`, labelIds: o.labels ?? ['INBOX', 'UNREAD'], snippet: (o.body ?? '').slice(0, 60), internalDate: String(o.date ?? 1795000000000),
    payload: {
      mimeType: 'multipart/alternative',
      headers: [
        { name: 'From', value: o.from ?? 'Ana Lima <ana@empresa.com>' }, { name: 'To', value: 'eu@gmail.com' },
        { name: 'Subject', value: o.subject ?? `Assunto ${id}` }, ...(o.listUnsub ? [{ name: 'List-Unsubscribe', value: '<mailto:x@y.com>' }] : []),
      ],
      parts: o.html ? [{ mimeType: 'text/html', body: { data: b64(o.html) } }] : [{ mimeType: 'text/plain', body: { data: b64(o.body ?? 'corpo') } }, { mimeType: 'text/html', body: { data: b64('<p>x</p>') } }],
    },
  };
}
