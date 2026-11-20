import { describe, expect, it } from "vitest";
import { createAuthenticator } from "../../src/server/auth.js";
import { loadConfig } from "../../src/server/config.js";
import { DEV, JWT_SECRET, jwt } from "./helpers.js";

const mk = (env: Record<string, string> = {}) => createAuthenticator(loadConfig({ NODE_ENV: "test", SUPABASE_JWT_SECRET: JWT_SECRET, JARVIS_DEV_TOKEN: DEV, ...env }));

describe("auth", () => {
  it("aceita JWT HS256 válido", async () => {
    const u = await mk()(`Bearer ${await jwt("user-1")}`);
    expect(u).toEqual({ userId: "user-1", email: "user-1@x.com" });
  });
  it("rejeita JWT expirado", async () => {
    expect(await mk()(`Bearer ${await jwt("u", { exp: Math.floor(Date.now() / 1000) - 60 })}`)).toBeNull();
  });
  it("rejeita audiência errada", async () => {
    expect(await mk()(`Bearer ${await jwt("u", { aud: "other" })}`)).toBeNull();
  });
  it("rejeita assinatura errada e cabeçalho malformado", async () => {
    expect(await mk()(`Bearer ${await jwt("u", { secret: "x".repeat(40) })}`)).toBeNull();
    expect(await mk()("Basic abc")).toBeNull();
    expect(await mk()(undefined)).toBeNull();
    expect(await mk()("Bearer lixo")).toBeNull();
  });
  it("token de dev vira dev-user", async () => {
    expect(await mk()(`Bearer ${DEV}`)).toEqual({ userId: "dev-user" });
    expect(await mk()("Bearer errado")).toBeNull();
  });
  it("sem JARVIS_DEV_TOKEN, não há dev", async () => {
    expect(await mk({ JARVIS_DEV_TOKEN: "" })(`Bearer ${DEV}`)).toBeNull();
  });
  it("produção rejeita token de dev", async () => {
    const a = mk({ NODE_ENV: "production", JARVIS_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64") });
    expect(await a(`Bearer ${DEV}`)).toBeNull();
    expect((await a(`Bearer ${await jwt("p")}`))?.userId).toBe("p");
  });
});

describe("config", () => {
  it("produção exige chave de criptografia", () => {
    expect(() => loadConfig({ NODE_ENV: "production", SUPABASE_JWT_SECRET: "x" })).toThrow(/JARVIS_ENCRYPTION_KEY/);
  });
  it("chave deve ter 32 bytes", () => {
    expect(() => loadConfig({ JARVIS_ENCRYPTION_KEY: "abc" })).toThrow();
  });
  it("padrões", () => {
    const c = loadConfig({});
    expect(c.dailyBudgetUsd).toBe(1);
    expect(c.rateLimitPerMin).toBe(60);
  });
});
