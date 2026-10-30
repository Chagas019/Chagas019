/**
 * Hashtags e menções. Usado no servidor (extração para indexar e notificar)
 * e no cliente (renderização com links — sempre como texto, nunca HTML).
 */

const TAG = /(^|[^\p{L}\p{N}_&/])#([\p{L}\p{N}_]{2,40})/gu;
const MENTION = /(^|[^\p{L}\p{N}_.@/])@([a-z0-9_.]{3,30})/gu;

export function normalizeTag(raw: string): string {
  return raw
    .replace(/^#/, "")
    .normalize("NFC")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}_]/gu, "")
    .slice(0, 40);
}

export function extractHashtags(...texts: string[]): string[] {
  const out = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(TAG)) out.add(normalizeTag(m[2]!));
  return [...out].filter((t) => t.length >= 2 && !/^\d+$/.test(t)).slice(0, 20);
}

export function extractMentions(...texts: string[]): string[] {
  const out = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(MENTION)) out.add(m[2]!.replace(/\.+$/, ""));
  return [...out].filter((h) => h.length >= 3).slice(0, 20);
}

export type TextPart = { type: "text"; value: string } | { type: "tag"; value: string } | { type: "mention"; value: string };

/** Divide o texto em partes para renderizar links de #hashtag e @menção. */
export function tokenize(text: string): TextPart[] {
  const re = /(^|[^\p{L}\p{N}_&/@.])([#@])([\p{L}\p{N}_.]{2,40})/gu;
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const [, lead, sigil, word] = m as unknown as [string, string, string, string];
    const start = m.index! + lead.length;
    const clean = sigil === "@" ? word.replace(/\.+$/, "") : word.replace(/\./g, "");
    if (sigil === "@" && !/^[a-z0-9_.]{3,30}$/.test(clean)) continue;
    if (sigil === "#" && clean.length < 2) continue;
    if (start > last) parts.push({ type: "text", value: text.slice(last, start) });
    parts.push(sigil === "#" ? { type: "tag", value: normalizeTag(clean) } : { type: "mention", value: clean });
    last = start + 1 + clean.length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}
