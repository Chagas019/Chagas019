import { beforeEach, describe, expect, it } from "vitest";
import { platformStats } from "@/server/services/stats";
import { toggleLike } from "@/server/services/social";
import { canSeeStats } from "@/server/session";
import { makePost, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);

describe("painel de números", () => {
  it("conta contas, publicações e curtidas reais", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const p = await makePost(ana);
    await makePost(ana, { draft: true });
    await toggleLike(bruno, p.id);
    const { totals, daily } = await platformStats();
    expect(totals.accounts).toBe(2);
    expect(totals.posts).toBe(1);
    expect(totals.drafts).toBe(1);
    expect(totals.likes).toBe(1);
    expect(daily).toHaveLength(14);
  });

  it("só equipe e e-mails donos acessam", () => {
    process.env.FRAME_OWNER_EMAILS = "Dona@Exemplo.com, outra@x.com";
    expect(canSeeStats({ role: "user", email: "dona@exemplo.com" })).toBe(true);
    expect(canSeeStats({ role: "user", email: "visitante@x.com" })).toBe(false);
    expect(canSeeStats({ role: "moderator", email: "m@x.com" })).toBe(true);
    expect(canSeeStats(null)).toBe(false);
    delete process.env.FRAME_OWNER_EMAILS;
  });
});
