import type { GmailMessage, GmailPart } from './client';
import { sha256 } from '../crypto';

export interface ParsedEmail {
  gmailId: string;
  threadId: string;
  fromName: string | null;
  fromEmail: string;
  toEmails: string;
  subject: string;
  snippet: string;
  bodyText: string;
  receivedAt: string;
  labelIds: string[];
  isUnread: boolean;
  isSent: boolean;
  hasListUnsubscribe: boolean;
  contentHash: string;
}

const MAX_BODY = 20_000;

function header(part: GmailPart | undefined, name: string): string {
  const h = part?.headers?.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? '';
}

function decodeB64Url(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#?\w+);/g, (m, e: string) => ENTITIES[e.toLowerCase()] ?? (e.startsWith('#') ? String.fromCharCode(Number(e.slice(1)) || 32) : m))
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

function collect(part: GmailPart | undefined, acc: { plain: string[]; html: string[] }) {
  if (!part) return;
  if (part.filename) return; // anexos não são lidos
  if (part.body?.data) {
    if (part.mimeType === 'text/plain') acc.plain.push(decodeB64Url(part.body.data));
    else if (part.mimeType === 'text/html') acc.html.push(decodeB64Url(part.body.data));
  }
  for (const p of part.parts ?? []) collect(p, acc);
}

export function extractBody(payload: GmailPart | undefined): string {
  const acc = { plain: [] as string[], html: [] as string[] };
  collect(payload, acc);
  const text = acc.plain.length ? acc.plain.join('\n') : htmlToText(acc.html.join('\n'));
  return text.replace(/\r\n/g, '\n').slice(0, MAX_BODY);
}

/** "Fulano <a@b.com>" -> { name, email } */
export function parseAddress(raw: string): { name: string | null; email: string } {
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || null, email: m[2].trim().toLowerCase() };
  return { name: null, email: raw.trim().toLowerCase() };
}

export function parseMessage(msg: GmailMessage): ParsedEmail {
  const payload = msg.payload;
  const from = parseAddress(header(payload, 'From'));
  const subject = header(payload, 'Subject').slice(0, 500);
  const bodyText = extractBody(payload);
  const labelIds = msg.labelIds ?? [];
  const internal = Number(msg.internalDate);
  const dateHeader = Date.parse(header(payload, 'Date'));
  const received = Number.isFinite(internal) && internal > 0 ? internal : Number.isFinite(dateHeader) ? dateHeader : Date.now();
  const toEmails = [header(payload, 'To'), header(payload, 'Cc')]
    .filter(Boolean).join(', ')
    .split(',').map((a) => parseAddress(a).email).filter(Boolean).join(', ').slice(0, 2000);
  return {
    gmailId: msg.id,
    threadId: msg.threadId,
    fromName: from.name,
    fromEmail: from.email,
    toEmails,
    subject,
    snippet: (msg.snippet ?? '').slice(0, 500),
    bodyText,
    receivedAt: new Date(received).toISOString(),
    labelIds,
    isUnread: labelIds.includes('UNREAD'),
    isSent: labelIds.includes('SENT'),
    hasListUnsubscribe: Boolean(header(payload, 'List-Unsubscribe')),
    contentHash: sha256(`${from.email}\n${subject}\n${bodyText}`),
  };
}
