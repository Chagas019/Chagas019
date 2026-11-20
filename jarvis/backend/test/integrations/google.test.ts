import { describe, expect, it } from "vitest";
import type { Tool, ToolContext, ToolRegistry } from "../../src/core/types.js";
import { integrationsPlugin } from "../../src/integrations/index.js";
import { createGoogleAuth } from "../../src/integrations/google/oauth.js";
import { registerGoogleTools } from "../../src/integrations/tools.js";
import { encrypt } from "../../src/server/crypto.js";
import { bearer, jwt, makeApp } from "../server/helpers.js";

const KEY = Buffer.alloc(32, 7);
const ENV = { GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "csecret", GOOGLE_REDIRECT_URI: "https://api.test/v1/integrations/google/callback" };
const CFG = { JARVIS_ENCRYPTION_KEY: KEY.toString("base64") };

type Call = { url: string; method: string; headers: Record<string, string>; body: string };
function mockFetch(handler: (c: Call) => { status?: number; json?: unknown }) {
  const calls: Call[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    const c: Call = { url: String(url), method: init?.method ?? "GET", headers: (init?.headers ?? {}) as Record<string, string>, body: String(init?.body ?? "") };
    calls.push(c);
    const r = handler(c);
    return new Response(JSON.stringify(r.json ?? {}), { status: r.status ?? 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { fn, calls };
}

function registry() {
  const m = new Map<string, Tool>();
  const r: ToolRegistry = { register: (t) => void m.set(t.name, t), list: () => [...m.values()], get: (n) => m.get(n) };
  return r;
}

async function setup(handler: Parameters<typeof mockFetch>[0], env: Record<string, string> = {}) {
  const { app, repos, config } = await makeApp(CFG);
  const f = mockFetch(handler);
  const tools = registry();
  let t = Date.now();
  const plugin = integrationsPlugin({ repos, config, tools, env: { ...ENV, ...env }, fetch: f.fn, now: () => t });
  await app.register(plugin);
  await app.ready();
  const ctx = (userId: string, confirmed = false): ToolContext => ({ userId, conversationId: "c", repos, confirmed });
  return { app, repos, f, tools, ctx, advance: (ms: number) => { t += ms; } };
}

const tokenOk = { json: { access_token: "AT1", refresh_token: "RT1", expires_in: 3600, scope: "a b" } };

async function connect(s: Awaited<ReturnType<typeof setup>>, userId = "dev-user") {
  const start = await s.app.inject({ method: "GET", url: "/v1/integrations/google/start", headers: bearer() });
  const state = new URL(start.json().url).searchParams.get("state")!;
  return s.app.inject({ method: "GET", url: `/v1/integrations/google/callback?code=abc&state=${encodeURIComponent(state)}` });
}

describe("rotas OAuth", () => {
  it("status sem conexão e /start sem GOOGLE_* -> 503", async () => {
    const s = await setup(() => ({}), { GOOGLE_CLIENT_ID: "" });
    const st = await s.app.inject({ method: "GET", url: "/v1/integrations", headers: bearer() });
    expect(st.json()).toEqual({ google: { configured: false, connected: false, scopes: [] } });
    const r = await s.app.inject({ method: "GET", url: "/v1/integrations/google/start", headers: bearer() });
    expect(r.statusCode).toBe(503);
    expect(r.json().error.code).toBe("provider_unavailable");
    expect(r.json().error.message).toMatch(/GOOGLE_CLIENT_ID/);
  });

  it("sem encryptionKey -> configured:false", async () => {
    const { app, repos, config } = await makeApp();
    await app.register(integrationsPlugin({ repos, config, tools: registry(), env: ENV }));
    const r = await app.inject({ method: "GET", url: "/v1/integrations/google/start", headers: bearer() });
    expect(r.statusCode).toBe(503);
    expect(r.json().error.message).toMatch(/JARVIS_ENCRYPTION_KEY/);
  });

  it("rotas exigem auth (exceto callback)", async () => {
    const s = await setup(() => ({}));
    expect((await s.app.inject({ method: "GET", url: "/v1/integrations" })).statusCode).toBe(401);
    expect((await s.app.inject({ method: "DELETE", url: "/v1/integrations/google" })).statusCode).toBe(401);
  });

  it("start gera URL com PKCE, state, escopos, offline e consent", async () => {
    const s = await setup(() => ({}));
    const r = await s.app.inject({ method: "GET", url: "/v1/integrations/google/start", headers: bearer() });
    const u = new URL(r.json().url);
    expect(u.origin + u.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    const p = u.searchParams;
    expect(p.get("client_id")).toBe("cid");
    expect(p.get("redirect_uri")).toBe(ENV.GOOGLE_REDIRECT_URI);
    expect(p.get("code_challenge_method")).toBe("S256");
    expect(p.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(p.get("access_type")).toBe("offline");
    expect(p.get("prompt")).toBe("consent");
    expect(p.get("state")!.split(".")).toHaveLength(3);
    const sc = p.get("scope")!;
    for (const x of ["gmail.readonly", "gmail.compose", "gmail.send", "calendar.events"]) expect(sc).toContain(x);
  });

  it("callback com state inválido/ausente -> ok=0 e nada gravado", async () => {
    const s = await setup(() => tokenOk);
    for (const url of ["/v1/integrations/google/callback?code=x&state=lixo", "/v1/integrations/google/callback?code=x", "/v1/integrations/google/callback?error=access_denied&state=y"]) {
      const r = await s.app.inject({ method: "GET", url });
      expect(r.statusCode).toBe(302);
      expect(r.headers.location).toMatch(/^jarvis:\/\/oauth\/done\?ok=0&error=/);
    }
    expect(s.f.calls).toHaveLength(0);
    expect(await s.repos.integrations.get("dev-user", "google")).toBeNull();
  });

  it("callback com state expirado -> ok=0", async () => {
    const s = await setup(() => tokenOk);
    const start = await s.app.inject({ method: "GET", url: "/v1/integrations/google/start", headers: bearer() });
    const state = new URL(start.json().url).searchParams.get("state")!;
    s.advance(11 * 60_000);
    const r = await s.app.inject({ method: "GET", url: `/v1/integrations/google/callback?code=x&state=${encodeURIComponent(state)}` });
    expect(r.headers.location).toBe("jarvis://oauth/done?ok=0&error=invalid_state");
  });

  it("callback feliz: troca code com verifier, grava cifrado, status connected", async () => {
    const s = await setup(() => tokenOk);
    const r = await connect(s);
    expect(r.statusCode).toBe(302);
    expect(r.headers.location).toBe("jarvis://oauth/done?ok=1");
    const body = new URLSearchParams(s.f.calls[0]!.body);
    expect(s.f.calls[0]!.url).toBe("https://oauth2.googleapis.com/token");
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code_verifier")).toMatch(/^[A-Za-z0-9_-]{64}$/);
    const rec = (await s.repos.integrations.get("dev-user", "google"))!;
    expect(rec.encrypted.startsWith("v1.")).toBe(true);
    expect(rec.encrypted).not.toContain("AT1");
    expect(rec.encrypted).not.toContain("RT1");
    expect(JSON.stringify(rec)).not.toMatch(/AT1|RT1/);
    const st = await s.app.inject({ method: "GET", url: "/v1/integrations", headers: bearer() });
    expect(st.json().google).toEqual({ configured: true, connected: true, scopes: ["a", "b"] });
  });

  it("troca de code falha -> ok=0", async () => {
    const s = await setup(() => ({ status: 400, json: { error: "invalid_grant" } }));
    const r = await connect(s);
    expect(r.headers.location).toBe("jarvis://oauth/done?ok=0&error=token_exchange_failed");
  });

  it("DELETE revoga (best effort) e remove", async () => {
    const s = await setup(() => tokenOk);
    await connect(s);
    const d = await s.app.inject({ method: "DELETE", url: "/v1/integrations/google", headers: bearer() });
    expect(d.json()).toEqual({ ok: true });
    const rev = s.f.calls.at(-1)!;
    expect(rev.url).toBe("https://oauth2.googleapis.com/revoke");
    expect(rev.body).toContain("token=RT1");
    expect(await s.repos.integrations.get("dev-user", "google")).toBeNull();
  });
});

describe("tools", () => {
  it("registra as 6 tools com sideEffect correto", async () => {
    const s = await setup(() => ({}));
    const se = Object.fromEntries(s.tools.list().map((t) => [t.name, t.sideEffect]));
    expect(se).toEqual({ gmail_search: false, gmail_read: false, gmail_draft: false, gmail_send: true, calendar_list: false, calendar_create_event: true });
  });

  it("sem conexão -> ok:false 'Google não conectado'", async () => {
    const s = await setup(() => ({}));
    for (const [n, i] of [["gmail_search", { query: "x" }], ["calendar_list", { timeMin: "2026-01-01T00:00:00Z", timeMax: "2026-01-02T00:00:00Z" }], ["gmail_send", { to: "a@b.com", subject: "s", body: "b" }]] as const) {
      const r = await s.tools.get(n)!.run(i, s.ctx("dev-user", true));
      expect(r).toMatchObject({ ok: false, output: "Google não conectado" });
    }
    expect(s.f.calls).toHaveLength(0);
  });

  it("gmail_send exige confirmação; confirmado envia raw base64url correto e audita", async () => {
    const s = await setup((c) => (c.url.includes("/token") ? tokenOk : { json: { id: "m1" } }));
    await connect(s);
    const input = { to: "ana@ex.com", subject: "Olá ação", body: "Corpo do e-mail" };
    const pend = await s.tools.get("gmail_send")!.run(input, s.ctx("dev-user", false));
    expect(pend).toEqual({ ok: false, output: "aguardando confirmação", needsConfirmation: { summary: "Enviar e-mail para ana@ex.com: Olá ação" } });
    expect(s.f.calls.some((c) => c.url.includes("messages/send"))).toBe(false);

    const r = await s.tools.get("gmail_send")!.run(input, s.ctx("dev-user", true));
    expect(r.ok).toBe(true);
    const call = s.f.calls.find((c) => c.url.includes("messages/send"))!;
    expect(call.url).toBe("https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    expect(call.headers.authorization).toBe("Bearer AT1");
    const raw = JSON.parse(call.body).raw as string;
    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
    const mime = Buffer.from(raw, "base64url").toString("utf8");
    expect(mime).toContain("To: ana@ex.com\r\n");
    expect(mime).toContain(`Subject: =?UTF-8?B?${Buffer.from("Olá ação").toString("base64")}?=`);
    expect(mime.split("\r\n\r\n")[1]).toBe(Buffer.from("Corpo do e-mail").toString("base64"));
    const audit = await s.repos.audit.list("dev-user");
    expect(audit.some((a) => a.action === "gmail_send" && a.status === "ok")).toBe(true);
  });

  it("gmail_send rejeita e-mail inválido / injeção de cabeçalho", async () => {
    const s = await setup(() => tokenOk);
    await connect(s);
    const r = await s.tools.get("gmail_send")!.run({ to: "a@b.com\r\nBcc: x@y.com", subject: "s", body: "b" }, s.ctx("dev-user", true));
    expect(r.ok).toBe(false);
    expect(r.output).toMatch(/inválida/);
  });

  it("gmail_draft cria rascunho sem enviar; search e read mapeiam", async () => {
    const s = await setup((c) => {
      if (c.url.includes("/token")) return tokenOk;
      if (c.url.includes("/drafts")) return { json: { id: "d1" } };
      if (c.url.includes("/messages?")) return { json: { messages: [{ id: "m1" }] } };
      return { json: { id: "m1", snippet: "oi", payload: { headers: [{ name: "From", value: "x@y.com" }, { name: "Subject", value: "Assunto" }, { name: "Date", value: "hoje" }] } } };
    });
    await connect(s);
    const d = await s.tools.get("gmail_draft")!.run({ to: ["a@b.com"], subject: "s", body: "b" }, s.ctx("dev-user", false));
    expect(d.ok).toBe(true);
    expect(s.f.calls.some((c) => c.url.endsWith("/drafts") && c.method === "POST")).toBe(true);
    expect(s.f.calls.some((c) => c.url.includes("messages/send"))).toBe(false);
    const q = await s.tools.get("gmail_search")!.run({ query: "from:x is:unread" }, s.ctx("dev-user"));
    expect(q.output).toContain("[m1]");
    expect(q.output).toContain("Assunto");
    expect(s.f.calls.find((c) => c.url.includes("/messages?"))!.url).toContain("q=from%3Ax+is%3Aunread");
    const rd = await s.tools.get("gmail_read")!.run({ id: "m1" }, s.ctx("dev-user"));
    expect(rd.output).toContain("De: x@y.com");
  });

  it("calendar_list e calendar_create_event mapeiam corretamente", async () => {
    const s = await setup((c) => {
      if (c.url.includes("/token")) return tokenOk;
      if (c.method === "POST") return { json: { id: "e9", summary: "Reunião", start: { dateTime: "2026-03-01T10:00:00-03:00" }, end: { dateTime: "2026-03-01T11:00:00-03:00" } } };
      return { json: { items: [{ id: "e1", summary: "Dentista", start: { dateTime: "2026-03-01T09:00:00Z" }, end: { dateTime: "2026-03-01T10:00:00Z" }, location: "Centro" }, { id: "e2", start: { date: "2026-03-02" }, end: { date: "2026-03-03" } }] } };
    });
    await connect(s);
    const l = await s.tools.get("calendar_list")!.run({ timeMin: "2026-03-01T00:00:00Z", timeMax: "2026-03-04T00:00:00Z" }, s.ctx("dev-user"));
    expect(l.output).toContain("Dentista");
    expect(l.output).toContain("@ Centro");
    expect(l.output).toContain("(sem título)");
    const lu = new URL(s.f.calls.find((c) => c.url.includes("/events?"))!.url);
    expect(lu.pathname).toBe("/calendar/v3/calendars/primary/events");
    expect(lu.searchParams.get("timeMin")).toBe("2026-03-01T00:00:00Z");
    expect(lu.searchParams.get("singleEvents")).toBe("true");

    const input = { summary: "Reunião", start: "2026-03-01T10:00:00-03:00", end: "2026-03-01T11:00:00-03:00", attendees: ["b@c.com"], timeZone: "America/Sao_Paulo" };
    const pend = await s.tools.get("calendar_create_event")!.run(input, s.ctx("dev-user", false));
    expect(pend.needsConfirmation?.summary).toContain("Reunião");
    expect(s.f.calls.some((c) => c.method === "POST" && c.url.includes("/events"))).toBe(false);
    const ok = await s.tools.get("calendar_create_event")!.run(input, s.ctx("dev-user", true));
    expect(ok.ok).toBe(true);
    const post = s.f.calls.find((c) => c.method === "POST" && c.url.includes("/events"))!;
    expect(JSON.parse(post.body)).toMatchObject({ summary: "Reunião", start: { dateTime: input.start, timeZone: "America/Sao_Paulo" }, attendees: [{ email: "b@c.com" }] });
    const bad = await s.tools.get("calendar_create_event")!.run({ ...input, end: input.start }, s.ctx("dev-user", true));
    expect(bad.ok).toBe(false);
  });

  it("401 -> refresh uma vez e repete; token novo é salvo cifrado", async () => {
    let n = 0;
    const s = await setup((c) => {
      if (c.url.includes("/token")) return c.body.includes("refresh_token") ? { json: { access_token: "AT2", expires_in: 3600 } } : tokenOk;
      n++;
      return n === 1 ? { status: 401, json: { error: { message: "Invalid Credentials" } } } : { json: { items: [] } };
    });
    await connect(s);
    const r = await s.tools.get("calendar_list")!.run({ timeMin: "2026-03-01T00:00:00Z", timeMax: "2026-03-02T00:00:00Z" }, s.ctx("dev-user"));
    expect(r.ok).toBe(true);
    const api = s.f.calls.filter((c) => c.url.includes("/events?"));
    expect(api.map((c) => c.headers.authorization)).toEqual(["Bearer AT1", "Bearer AT2"]);
    const rec = (await s.repos.integrations.get("dev-user", "google"))!;
    expect(rec.encrypted).not.toContain("AT2");
  });

  it("access token expirado é renovado antes da chamada; 401 persistente não entra em loop", async () => {
    const s = await setup((c) => {
      if (c.url.includes("/token")) return c.body.includes("refresh_token") ? { json: { access_token: "AT2", expires_in: 3600 } } : tokenOk;
      return c.headers.authorization === "Bearer AT2" ? { status: 401, json: { error: { message: "nope" } } } : { json: { items: [] } };
    });
    await connect(s);
    s.advance(3600_000);
    const r = await s.tools.get("calendar_list")!.run({ timeMin: "2026-03-01T00:00:00Z", timeMax: "2026-03-02T00:00:00Z" }, s.ctx("dev-user"));
    expect(r.ok).toBe(false);
    expect(r.output).toMatch(/401/);
    expect(r.output).not.toMatch(/AT1|AT2|RT1/);
    expect(s.f.calls.filter((c) => c.url.includes("/events?"))).toHaveLength(2);
  });

  it("isolamento: usuário B não usa token de A", async () => {
    const s = await setup((c) => (c.url.includes("/token") ? tokenOk : { json: { items: [] } }));
    await connect(s); // dev
    const b = await jwt("user-b");
    const st = await s.app.inject({ method: "GET", url: "/v1/integrations", headers: bearer(b) });
    expect(st.json().google.connected).toBe(false);
    const before = s.f.calls.length;
    const r = await s.tools.get("calendar_list")!.run({ timeMin: "2026-03-01T00:00:00Z", timeMax: "2026-03-02T00:00:00Z" }, s.ctx("user-b"));
    expect(r).toMatchObject({ ok: false, output: "Google não conectado" });
    expect(s.f.calls.length).toBe(before);
    // DELETE de B não remove o de A
    await s.app.inject({ method: "DELETE", url: "/v1/integrations/google", headers: bearer(b) });
    expect(await s.repos.integrations.get("dev-user", "google")).not.toBeNull();
  });

  it("state de A não pode ser usado para gravar em B (uid vem do state assinado)", async () => {
    const s = await setup(() => tokenOk);
    await connect(s);
    expect(await s.repos.integrations.get("user-b", "google")).toBeNull();
  });

  it("tokens cifrados com outra chave não são lidos", async () => {
    const s = await setup(() => ({}));
    await s.repos.integrations.put({ userId: "dev-user", provider: "google", encrypted: encrypt("{}", Buffer.alloc(32, 1)), scopes: [] });
    const r = await s.tools.get("gmail_search")!.run({ query: "x" }, s.ctx("dev-user"));
    expect(r.ok).toBe(false);
  });
});

describe("auth direto", () => {
  it("createGoogleAuth sem key -> configured false", () => {
    const a = createGoogleAuth({ repos: {} as never, env: ENV });
    expect(a.configured).toBe(false);
    void registerGoogleTools;
  });
});
