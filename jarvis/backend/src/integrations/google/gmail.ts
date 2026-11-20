import type { GoogleAuth } from "./oauth.js";

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface MailSummary { id: string; from: string; to: string; subject: string; date: string; snippet: string }

const clean = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
const encSubject = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`);

/** Monta mensagem RFC 2822 (texto UTF-8, corpo base64) e devolve em base64url. */
export function buildRaw(m: { to: string[]; subject: string; body: string; cc?: string[] }): string {
  const lines = [
    `To: ${m.to.map(clean).join(", ")}`,
    ...(m.cc?.length ? [`Cc: ${m.cc.map(clean).join(", ")}`] : []),
    `Subject: ${encSubject(clean(m.subject))}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    (Buffer.from(m.body, "utf8").toString("base64").match(/.{1,76}/g) ?? []).join("\r\n"),
  ];
  return Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
}

interface RawMsg { id: string; snippet?: string; payload?: { headers?: { name: string; value: string }[] } }

function summarize(m: RawMsg): MailSummary {
  const h = (n: string) => m.payload?.headers?.find((x) => x.name.toLowerCase() === n)?.value ?? "";
  return { id: m.id, from: h("from"), to: h("to"), subject: h("subject"), date: h("date"), snippet: m.snippet ?? "" };
}

export function createGmail(auth: GoogleAuth) {
  const meta = (userId: string, id: string) =>
    auth.api<RawMsg>(userId, `${BASE}/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`).then(summarize);
  return {
    async search(userId: string, query: string, max = 5): Promise<MailSummary[]> {
      const u = new URLSearchParams({ q: query, maxResults: String(Math.min(Math.max(max, 1), 10)) });
      const list = await auth.api<{ messages?: { id: string }[] }>(userId, `${BASE}/messages?${u}`);
      return Promise.all((list.messages ?? []).map((m) => meta(userId, m.id)));
    },
    read: meta,
    async draft(userId: string, m: Parameters<typeof buildRaw>[0]): Promise<{ id: string }> {
      const r = await auth.api<{ id: string }>(userId, `${BASE}/drafts`, { method: "POST", body: { message: { raw: buildRaw(m) } } });
      return { id: r.id };
    },
    async send(userId: string, m: Parameters<typeof buildRaw>[0]): Promise<{ id: string }> {
      const r = await auth.api<{ id: string }>(userId, `${BASE}/messages/send`, { method: "POST", body: { raw: buildRaw(m) } });
      return { id: r.id };
    },
  };
}
export type Gmail = ReturnType<typeof createGmail>;
