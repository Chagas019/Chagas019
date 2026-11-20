import { describe, expect, it } from "vitest";
import { DEV, JWT_SECRET, USER_A, b64, bearer, call, jwt, makeStack } from "./helpers.js";

const me = (s: Awaited<ReturnType<typeof makeStack>>, token?: string) =>
  s.app.inject({ url: "/v1/me", headers: token ? bearer(token) : {} });

describe("e2e autenticação", () => {
  it("JWT HS256 válido (aud authenticated) funciona e expõe sub/email", async () => {
    const s = await makeStack();
    const r = await me(s, await jwt(USER_A));
    expect(r.statusCode).toBe(200);
    expect(JSON.parse(r.body)).toEqual({ userId: USER_A, email: `${USER_A}@x.com` });
  });

  it("rejeita: alg none, assinatura errada, expirado, aud errada, sem exp, HS384, sem sub, lixo, sem header", async () => {
    const s = await makeStack();
    const payload = { sub: USER_A, aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 };
    const none = `${b64({ alg: "none", typ: "JWT" })}.${b64(payload)}.`;
    const noneSig = `${b64({ alg: "none", typ: "JWT" })}.${b64(payload)}.AAAA`;
    const valid = await jwt(USER_A);
    const tampered = valid.split(".").map((p, i) => (i === 1 ? b64({ ...payload, sub: "outro-usuario" }) : p)).join(".");
    const bad = [
      none, noneSig, tampered,
      await jwt(USER_A, { secret: "x".repeat(40) }),
      await jwt(USER_A, { exp: Math.floor(Date.now() / 1000) - 10 }),
      await jwt(USER_A, { aud: "anon" }),
      await jwt(USER_A, { exp: null }),
      await jwt(USER_A, { alg: "HS384" }),
      "abc.def.ghi", "x",
    ];
    for (const t of bad) expect((await me(s, t)).statusCode, t.slice(0, 30)).toBe(401);
    expect((await me(s)).statusCode).toBe(401);
    expect((await s.app.inject({ url: "/v1/me", headers: { authorization: `Basic ${DEV}` } })).statusCode).toBe(401);
    const r = await me(s, bad[0]!);
    expect(JSON.parse(r.body).error.code).toBe("unauthorized");
  });

  it("JWT sem SUPABASE_JWT_SECRET configurado não é aceito (HS256 sem segredo)", async () => {
    const s = await makeStack({ env: { SUPABASE_JWT_SECRET: "" } });
    expect((await me(s, await jwt(USER_A))).statusCode).toBe(401);
  });

  it("token de dev: aceito fora de produção, errado rejeitado, e inválido em produção", async () => {
    const s = await makeStack();
    expect((await me(s, DEV)).statusCode).toBe(200);
    expect((await me(s, DEV + "x")).statusCode).toBe(401);
    const prod = await makeStack({ env: { NODE_ENV: "production", JARVIS_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64") } });
    expect((await me(prod, DEV)).statusCode).toBe(401);
    expect((await me(prod, await jwt(USER_A))).statusCode).toBe(200);
  });

  // ACHADO F-06 (média): NODE_ENV ausente vira "development" => token de dev aceito em deploy mal configurado (fail-open).
  it.fails("F-06: sem NODE_ENV, token de dev não deve ser aceito", async () => {
    const s = await makeStack({ env: { NODE_ENV: "" } });
    expect((await me(s, DEV)).statusCode).toBe(401);
  });

  // ACHADO F-07 (baixa): `iss` não é validado; com SUPABASE_URL deveria exigir `${SUPABASE_URL}/auth/v1`.
  it.fails("F-07: JWT com issuer estranho é rejeitado quando SUPABASE_URL está configurada", async () => {
    const s = await makeStack({ env: { SUPABASE_URL: "https://proj.supabase.co" } });
    expect((await me(s, await jwt(USER_A, { iss: "https://evil.example/auth/v1" }))).statusCode).toBe(401);
  });

  it("com SUPABASE_URL (JWKS) token alg none/HS256 inválido continua 401 sem rede", async () => {
    const s = await makeStack({ env: { SUPABASE_URL: "https://proj.supabase.co", SUPABASE_JWT_SECRET: "" } });
    const none = `${b64({ alg: "none" })}.${b64({ sub: USER_A, aud: "authenticated", exp: 9999999999 })}.`;
    expect((await me(s, none)).statusCode).toBe(401);
    expect((await me(s, await jwt(USER_A))).statusCode).toBe(401);
    expect(JWT_SECRET).toBeTruthy();
  });
});

describe("e2e hardening HTTP", () => {
  it("headers de segurança, /health sem auth e 404 no formato do contrato", async () => {
    const s = await makeStack();
    const h = await s.app.inject({ url: "/health" });
    expect(h.statusCode).toBe(200);
    expect(h.headers["x-content-type-options"]).toBe("nosniff");
    expect(h.headers["cache-control"]).toBe("no-store");
    expect(h.headers["strict-transport-security"]).toBeTruthy();
    expect(h.headers["content-security-policy"]).toContain("default-src 'none'");
    const n = await s.app.inject({ url: "/nao-existe" });
    expect(n.statusCode).toBe(404);
    expect(JSON.parse(n.body).error.code).toBe("not_found");
  });

  it("CORS: só origens da allowlist", async () => {
    const s = await makeStack({ env: { CORS_ORIGINS: "https://app.example" } });
    const ok = await s.app.inject({ method: "OPTIONS", url: "/v1/chat", headers: { origin: "https://app.example" } });
    expect(ok.statusCode).toBe(204);
    expect(ok.headers["access-control-allow-origin"]).toBe("https://app.example");
    const no = await s.app.inject({ url: "/health", headers: { origin: "https://evil.example" } });
    expect(no.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("corpo > 32KB => 400; campos extras/inválidos => 400; sem auth o corpo nem é considerado", async () => {
    const s = await makeStack();
    const big = await s.app.inject({ method: "POST", url: "/v1/chat", headers: bearer(DEV), payload: { message: "x".repeat(40_000) } });
    expect(big.statusCode).toBe(400);
    expect((await call(s.app, DEV, "POST", "/v1/chat", { message: "oi", extra: 1 })).status).toBe(400);
    expect((await call(s.app, DEV, "POST", "/v1/chat", { message: "x".repeat(4001) })).status).toBe(400);
    expect((await call(s.app, DEV, "POST", "/v1/tasks", { title: "t", dueAt: "ontem" })).status).toBe(400);
  });

  it("rate limit por usuário: 429 com Retry-After; outro usuário não é afetado", async () => {
    const s = await makeStack({ env: { RATE_LIMIT_PER_MIN: "3" } });
    for (let i = 0; i < 3; i++) expect((await call(s.app, DEV, "GET", "/v1/me")).status).toBe(200);
    const r = await call(s.app, DEV, "GET", "/v1/me");
    expect(r.status).toBe(429);
    expect(r.headers["retry-after"]).toBeTruthy();
    expect(r.body.error.code).toBe("rate_limited");
    expect((await call(s.app, await jwt(USER_A), "GET", "/v1/me")).status).toBe(200);
  });

  it("erro interno não vaza mensagem/stack ao cliente", async () => {
    const s = await makeStack();
    s.repos.conversations.create = async () => { throw new Error("postgres://user:SENHA@host/db falhou\n    at secret.ts:1"); };
    const r = await call(s.app, DEV, "POST", "/v1/chat", { message: "oi" });
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ error: { code: "internal", message: "Erro interno." } });
    expect(r.raw).not.toMatch(/SENHA|secret\.ts|\bat /);
  });
});
