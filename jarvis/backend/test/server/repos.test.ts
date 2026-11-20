import { describe, expect, it } from "vitest";
import { createMemoryRepos } from "../../src/server/repos/memory.js";

describe("repos em memória", () => {
  it("conversas e mensagens isoladas por usuário", async () => {
    const r = createMemoryRepos();
    const c = await r.conversations.create("a", "t");
    expect(await r.conversations.get("b", c.id)).toBeNull();
    expect((await r.conversations.get("a", c.id))?.title).toBe("t");
    for (let i = 0; i < 5; i++) await r.messages.add({ conversationId: c.id, role: "user", content: `m${i}` });
    const last = await r.messages.list(c.id, 3);
    expect(last.map((m) => m.content)).toEqual(["m2", "m3", "m4"]);
    expect(await r.conversations.list("b")).toEqual([]);
  });
  it("memórias: add/search/list/remove", async () => {
    const r = createMemoryRepos();
    await r.memories.add("a", "fact", "Gosto de café");
    const m2 = await r.memories.add("a", "preference", "Prefiro CAFÉ sem açúcar");
    await r.memories.add("b", "fact", "café do b");
    const s = await r.memories.search("a", "café");
    expect(s).toHaveLength(2);
    expect(s[0]!.id).toBe(m2.id); // mais recente primeiro
    expect(await r.memories.remove("b", m2.id)).toBe(false);
    expect(await r.memories.remove("a", m2.id)).toBe(true);
    expect(await r.memories.list("a")).toHaveLength(1);
  });
  it("tarefas: update parcial e filtro", async () => {
    const r = createMemoryRepos();
    const t = await r.tasks.add({ userId: "a", title: "x" });
    expect(t.status).toBe("open");
    const u = await r.tasks.update("a", t.id, { status: "done", notes: "n" });
    expect(u).toMatchObject({ status: "done", notes: "n", title: "x" });
    expect(await r.tasks.update("b", t.id, { status: "open" })).toBeNull();
    expect(await r.tasks.list("a", "open")).toHaveLength(0);
    expect(await r.tasks.list("a", "done")).toHaveLength(1);
  });
  it("uso: soma e resumo", async () => {
    const r = createMemoryRepos();
    const base = { userId: "a", provider: "p", model: "m", inputTokens: 10, outputTokens: 5 };
    await r.usage.add({ ...base, costUsd: 0.25 });
    await r.usage.add({ ...base, costUsd: 0.5 });
    await r.usage.add({ ...base, userId: "b", costUsd: 9 });
    const since = new Date(Date.now() - 1000).toISOString();
    expect(await r.usage.costSince("a", since)).toBeCloseTo(0.75);
    expect(await r.usage.costSince("a", new Date(Date.now() + 1000).toISOString())).toBe(0);
    expect(await r.usage.summary("a", since)).toEqual([{ provider: "p", model: "m", calls: 2, inputTokens: 20, outputTokens: 10, costUsd: 0.75 }]);
  });
  it("dispositivos (upsert idempotente), auditoria e integrações", async () => {
    const r = createMemoryRepos();
    await r.devices.upsert({ userId: "a", apnsToken: "tok", platform: "ios" });
    await r.devices.upsert({ userId: "a", apnsToken: "tok", platform: "ios" });
    expect(await r.devices.list("a")).toHaveLength(1);
    await r.audit.add({ userId: "a", actor: "o", action: "x", status: "ok" });
    expect(await r.audit.list("b")).toHaveLength(0);
    await r.integrations.put({ userId: "a", provider: "google", encrypted: "e", scopes: ["s"] });
    expect((await r.integrations.get("a", "google"))?.encrypted).toBe("e");
    expect(await r.integrations.get("b", "google")).toBeNull();
    await r.integrations.remove("a", "google");
    expect(await r.integrations.get("a", "google")).toBeNull();
  });
});
