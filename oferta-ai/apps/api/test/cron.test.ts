import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.hoisted(() => {
  process.env.REDIS_URL = "";
  process.env.CRON_SECRET = "segredo-cron-de-teste-123";
});

import request from "supertest";
import { prisma } from "../src/lib/core";
import * as kvm from "../src/lib/kv";
import * as orch from "../src/orchestrator/orchestrator";
import * as settings from "../src/lib/settings";
import { ensureBootstrap } from "../src/bootstrap";
import * as appm from "../src/app";

/**
 * Modo serverless (sem Redis): KV no PostgreSQL + ciclo agendado do Orchestrator.
 * vi.hoisted garante REDIS_URL vazio antes de carregar a configuração.
 */
const mods: any = { prisma, kvm, orch, settings, app: appm };
beforeAll(async () => {
  await ensureBootstrap();
  await settings.updateSettings({ publishWindowStart: "00:00", publishWindowEnd: "00:00", minIntervalMinutes: 1, keywordsPerCycle: 2, systemHalted: false, publishingPaused: false });
});
afterAll(async () => mods.prisma.$disconnect());

describe("Modo serverless (pg_cron)", () => {
  it("KV no PostgreSQL: set/get, setNx com expiração, incr e conjuntos", async () => {
    const { kv, redisEnabled } = mods.kvm;
    expect(redisEnabled()).toBe(false);
    await kv().set("t:a", "1");
    expect(await kv().get("t:a")).toBe("1");
    expect(await kv().setNx("t:lock", "x", 50)).toBe(true);
    expect(await kv().setNx("t:lock", "x", 50)).toBe(false);
    await new Promise((r) => setTimeout(r, 80));
    expect(await kv().setNx("t:lock", "x", 50)).toBe(true);
    await kv().del("t:c");
    const n = await Promise.all([kv().incr("t:c"), kv().incr("t:c"), kv().incr("t:c")]);
    expect(n.sort()).toEqual([1, 2, 3]);
    await kv().sadd("t:s", "a", "b");
    await kv().srem("t:s", "a");
    expect(await kv().smembers("t:s")).toEqual(["b"]);
  });

  it("ciclo agendado executa Scout → Copywriter → Distributor sem Redis", async () => {
    const r = await mods.orch.runCronCycle();
    expect(r.scout).toBe("executado");
    // copies geradas em linha logo após a pesquisa
    expect(await prisma.generatedCopy.count()).toBeGreaterThan(0);
    expect(["published", "waiting", "idle"]).toContain(r.distributor.action);
    // segunda chamada imediata não repete a pesquisa (intervalo de 2h)
    const r2 = await mods.orch.runCronCycle();
    expect(r2.scout).toBeUndefined();
  });

  it("endpoint /api/cron/run exige o segredo", async () => {
    const app = mods.app.createApp();
    expect((await request(app).post("/api/cron/run")).status).toBe(401);
    expect((await request(app).post("/api/cron/run").set("x-cron-secret", "errado-errado-errado-errad")).status).toBe(401);
    const ok = await request(app).post("/api/cron/run").set("x-cron-secret", "segredo-cron-de-teste-123");
    expect(ok.status).toBe(200);
    expect(ok.body.ok).toBe(true);
  });
});
