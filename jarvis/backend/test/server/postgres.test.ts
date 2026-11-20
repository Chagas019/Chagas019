import { describe, expect, it } from "vitest";
import { createPostgresRepos } from "../../src/server/repos/postgres.js";

// Requer um Postgres com a migração aplicada. Sem TEST_DATABASE_URL, é ignorado.
describe.skipIf(!process.env.TEST_DATABASE_URL)("repos postgres", () => {
  it("fluxo básico e isolamento", async () => {
    const r = createPostgresRepos(process.env.TEST_DATABASE_URL!);
    const a = `t-${Date.now()}-a`, b = `t-${Date.now()}-b`;
    try {
      const c = await r.conversations.create(a, "t");
      expect(await r.conversations.get(b, c.id)).toBeNull();
      await r.messages.add({ conversationId: c.id, role: "user", content: "oi", meta: { x: 1 } });
      expect((await r.messages.list(c.id))[0]!.meta).toEqual({ x: 1 });
      const pm = await r.messages.add({ conversationId: c.id, role: "assistant", content: "?", meta: { pending: { tool: "t" }, k: 1 } });
      const claims = await Promise.all([r.messages.claimPending(c.id, pm.id), r.messages.claimPending(c.id, pm.id)]);
      expect(claims.filter(Boolean)).toHaveLength(1);
      expect((await r.messages.list(c.id)).find((x) => x.id === pm.id)!.meta).toEqual({ k: 1 });
      expect(await r.messages.claimPending("00000000-0000-4000-8000-000000000000", pm.id)).toBe(false);
      await r.memories.add(a, "fact", "Eu gosto de cafés fortes");
      expect(await r.memories.search(a, "café")).toHaveLength(1);
      expect(await r.memories.search(b, "café")).toHaveLength(0);
      const t = await r.tasks.add({ userId: a, title: "x", dueAt: "2026-12-01T10:00:00.000Z" });
      expect((await r.tasks.update(a, t.id, { status: "done" }))?.status).toBe("done");
      expect(await r.tasks.update(b, t.id, { status: "open" })).toBeNull();
      await r.usage.add({ userId: a, provider: "p", model: "m", inputTokens: 1, outputTokens: 1, costUsd: 0.1 });
      expect(await r.usage.costSince(a, new Date(Date.now() - 60000).toISOString())).toBeCloseTo(0.1);
      await r.devices.upsert({ userId: a, apnsToken: "tok", platform: "ios" });
      await r.devices.upsert({ userId: a, apnsToken: "tok", platform: "ios" });
      expect(await r.devices.list(a)).toHaveLength(1);
      await r.integrations.put({ userId: a, provider: "google", encrypted: "e", scopes: ["s"] });
      expect((await r.integrations.get(a, "google"))?.scopes).toEqual(["s"]);
    } finally {
      for (const u of [a, b]) for (const tb of ["conversations", "memories", "tasks", "usage_records", "audit_events", "devices", "integration_tokens"]) await r.pool.query(`DELETE FROM ${tb} WHERE user_id = $1`, [u]);
      await r.close();
    }
  });
});

describe("sslFor com CA do Supabase", () => {
  it("pooler do Supabase usa a CA fixada com verificação ligada", async () => {
    const { sslFor } = await import("../../src/server/repos/postgres.js");
    const s = sslFor("postgresql://u:p@aws-1-sa-east-1.pooler.supabase.com:6543/postgres", {}) as { rejectUnauthorized: boolean; ca?: string };
    expect(s.rejectUnauthorized).toBe(true);
    expect(s.ca).toContain("BEGIN CERTIFICATE");
    expect((sslFor("postgresql://u:p@db.example.com/x", {}) as { ca?: string }).ca).toBeUndefined();
  });
});
