import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { rateLimit } from "@/server/db/schema";

describe("tabela de rate limit do Better Auth", () => {
  it("aceita timestamps em milissegundos (regressão: login quebrava em produção)", async () => {
    const now = Date.now();
    const [row] = await db.insert(rateLimit).values({ id: `t-${now}`, key: `127.0.0.1|/sign-in/email|${now}`, count: 1, lastRequest: now }).returning();
    expect(row!.lastRequest).toBe(now);
  });
});
