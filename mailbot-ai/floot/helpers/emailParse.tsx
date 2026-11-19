import { createHash } from "node:crypto";
import type { GmailMessage, GmailPart } from "./gmailApi";

// Converte mensagens da Gmail API em dados para análise EM MEMÓRIA.
// O conteúdo nunca é gravado no banco: só hashes, IDs, datas e rótulos.

export type ParsedEmail = {
  gmailId: string;
  threadId: string;
  fromName: string | null;
  fromEmail: string;
  toEmails: string;
  subject: string;
  snippet: string;
  bodyText: string;
  receivedAt: Date;
  labelIds: string[];
  isUnread: boolean;
  isSent: boolean;
  hasListUnsubscribe: boolean;
  senderHash: string;
  contentHash: string;
};

const MAX_BODY = 20000;
const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" };

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function header(part: GmailPart | undefined, name: string): string {
  return part?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#?\w+);/g, (m, e: string) => ENTITIES[e.toLowerCase()] ?? (e.startsWith("#") ? String.fromCharCode(Number(e.slice(1)) || 32) : m))
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

function collect(part: GmailPart | undefined, acc: { plain: string[]; html: string[] }) {
  if (!part || part.filename) return; // anexos não são lidos
  if (part.body?.data) {
    const text = Buffer.from(part.body.data, "base64url").toString("utf8");
    if (part.mimeType === "text/plain") acc.plain.push(text);
    else if (part.mimeType === "text/html") acc.html.push(text);
  }
  for (const p of part.parts ?? []) collect(p, acc);
}

function extractBody(payload: GmailPart | undefined): string {
  const acc = { plain: [] as string[], html: [] as string[] };
  collect(payload, acc);
  const text = acc.plain.length ? acc.plain.join("\n") : htmlToText(acc.html.join("\n"));
  return text.replace(/\r\n/g, "\n").slice(0, MAX_BODY);
}

function parseAddress(raw: string): { name: string | null; email: string } {
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || null, email: m[2].trim().toLowerCase() };
  return { name: null, email: raw.trim().toLowerCase() };
}

function parseMessage(msg: GmailMessage): ParsedEmail {
  const payload = msg.payload;
  const from = parseAddress(header(payload, "From"));
  const subject = header(payload, "Subject").slice(0, 500);
  const bodyText = extractBody(payload);
  const labelIds = msg.labelIds ?? [];
  const internal = Number(msg.internalDate);
  const dateHeader = Date.parse(header(payload, "Date"));
  const received = Number.isFinite(internal) && internal > 0 ? internal : Number.isFinite(dateHeader) ? dateHeader : Date.now();
  const toEmails = [header(payload, "To"), header(payload, "Cc")]
    .filter(Boolean)
    .join(", ")
    .split(",")
    .map((a) => parseAddress(a).email)
    .filter(Boolean)
    .join(", ")
    .slice(0, 2000);
  return {
    gmailId: msg.id,
    threadId: msg.threadId,
    fromName: from.name,
    fromEmail: from.email,
    toEmails,
    subject,
    snippet: (msg.snippet ?? "").slice(0, 500),
    bodyText,
    receivedAt: new Date(received),
    labelIds,
    isUnread: labelIds.includes("UNREAD"),
    isSent: labelIds.includes("SENT"),
    hasListUnsubscribe: Boolean(header(payload, "List-Unsubscribe")),
    senderHash: sha256(`sender:${from.email}`),
    contentHash: sha256(`${from.email}\n${subject}\n${bodyText}`),
  };
}

/** Metadados para exibição (lidos do Gmail na hora; não são gravados). */
function displayMeta(msg: GmailMessage) {
  const p = msg.payload;
  const from = parseAddress(header(p, "From"));
  return {
    gmailId: msg.id,
    fromName: from.name,
    fromEmail: from.email,
    to: header(p, "To"),
    subject: header(p, "Subject") || "(sem assunto)",
    snippet: (msg.snippet ?? "").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
  };
}

export const emailParse = { parseMessage, parseAddress, htmlToText, extractBody, displayMeta, sha256 };
