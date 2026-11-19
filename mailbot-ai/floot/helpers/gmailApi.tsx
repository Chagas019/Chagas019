import { getGoogleAccessToken, GoogleIntegrationsError } from "@floot/google-integrations";
import { db } from "./db";

// Cliente mínimo da Gmail API (somente leitura) usando o token intermediado pelo Floot.
// - nunca chama endpoints de envio, arquivamento ou exclusão
// - retentativa com backoff em 429/5xx (respeita Retry-After)
// - token renovado a cada chamada pelo Floot; "reconnect_required" vira ReauthRequired

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export class GmailError extends Error {
  constructor(public status: number, public reason: string) {
    super(`gmail_${status}_${reason}`);
  }
}

export class ReauthRequired extends Error {
  constructor() {
    super("reauth_required");
  }
}

export type GmailHeader = { name: string; value: string };
export type GmailPart = {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: GmailPart[];
};
export type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: GmailPart;
};
export type HistoryRecord = {
  id: string;
  messagesAdded?: { message: { id: string; threadId: string; labelIds?: string[] } }[];
  messagesDeleted?: { message: { id: string } }[];
  labelsAdded?: { message: { id: string; labelIds?: string[] }; labelIds: string[] }[];
  labelsRemoved?: { message: { id: string; labelIds?: string[] }; labelIds: string[] }[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function isRateLimited(e: unknown): boolean {
  return e instanceof GmailError && (e.status === 429 || (e.status === 403 && /rateLimit/i.test(e.reason)));
}

// token reaproveitado por até 4 min dentro da mesma execução (evita uma busca por mensagem)
const tokenCache = new Map<string, { value: string; until: number }>();

async function token(email: string): Promise<string> {
  const hit = tokenCache.get(email);
  if (hit && hit.until > Date.now()) return hit.value;
  try {
    const value = (await getGoogleAccessToken(db, email)).access_token;
    tokenCache.set(email, { value, until: Date.now() + 4 * 60_000 });
    return value;
  } catch (e) {
    if (e instanceof GoogleIntegrationsError && (e.code === "reconnect_required" || e.code === "no_connection")) {
      throw new ReauthRequired();
    }
    throw e;
  }
}

async function request<T>(email: string, path: string, params: Record<string, string | string[] | undefined> = {}): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    for (const item of Array.isArray(v) ? v : [v]) qs.append(k, item);
  }
  const url = `${BASE}${path}${qs.toString() ? `?${qs}` : ""}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${await token(email)}` } });
    if (res.ok) return (await res.json()) as T;
    const body = (await res.json().catch(() => ({}))) as { error?: { errors?: { reason?: string }[]; status?: string } };
    const reason = body.error?.errors?.[0]?.reason ?? body.error?.status ?? "unknown";
    if (res.status === 401) {
      // token pode ter vencido: tenta uma vez com token novo antes de pedir reconexão
      if (tokenCache.has(email) && attempt === 0) { tokenCache.delete(email); continue; }
      throw new ReauthRequired();
    }
    const limited = res.status === 429 || (res.status === 403 && /rateLimit/i.test(reason));
    if ((limited || res.status >= 500) && attempt < 3) {
      const ra = Number(res.headers.get("retry-after"));
      await sleep(Math.min(8000, Number.isFinite(ra) && ra > 0 ? ra * 1000 : 2 ** attempt * 1000) + Math.floor(Math.random() * 400));
      continue;
    }
    throw new GmailError(res.status, reason);
  }
}

// Busca mensagens com poucas requisições simultâneas. Se o Gmail limitar a taxa, para de pedir
// e devolve o que já veio (limited = true) para a sincronização continuar na próxima rodada.
async function getMessages(email: string, ids: string[], format: "full" | "metadata" = "full", concurrency = 3) {
  const found: GmailMessage[] = [];
  const missing: string[] = [];
  let limited = false;
  let i = 0;
  const worker = async () => {
    while (i < ids.length && !limited) {
      const id = ids[i++];
      try {
        found.push(
          await request<GmailMessage>(email, `/messages/${encodeURIComponent(id)}`, {
            format,
            ...(format === "metadata" ? { metadataHeaders: ["From", "To", "Subject", "Date"] } : {}),
          })
        );
      } catch (e) {
        if (e instanceof GmailError && e.status === 404) missing.push(id);
        else if (isRateLimited(e)) limited = true;
        else throw e;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
  return { found, missing, limited };
}

export const gmailApi = {
  getProfile: (email: string) =>
    request<{ emailAddress: string; messagesTotal: number; historyId: string }>(email, "/profile"),
  listMessages: (email: string, opts: { q?: string; pageToken?: string; maxResults?: number }) =>
    request<{ messages?: { id: string; threadId: string }[]; nextPageToken?: string }>(email, "/messages", {
      q: opts.q,
      pageToken: opts.pageToken,
      maxResults: String(opts.maxResults ?? 100),
      includeSpamTrash: "false",
    }),
  getMessage: (email: string, id: string, format: "full" | "metadata" = "full") =>
    request<GmailMessage>(email, `/messages/${encodeURIComponent(id)}`, { format }),
  getMessages,
  listHistory: (email: string, startHistoryId: string, pageToken?: string) =>
    request<{ history?: HistoryRecord[]; nextPageToken?: string; historyId: string }>(email, "/history", {
      startHistoryId,
      pageToken,
      maxResults: "500",
      historyTypes: ["messageAdded", "messageDeleted", "labelAdded", "labelRemoved"],
    }),
};
