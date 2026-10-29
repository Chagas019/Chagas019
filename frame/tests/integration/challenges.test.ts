import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { challenge } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { listSubmissions, submitToChallenge, toggleVote } from "@/server/services/challenges";
import { makePost, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);

async function makeChallenge(phase: "open" | "voting", maxVotes = 2) {
  const now = Date.now();
  const h = 3_600_000;
  const [c] = await db
    .insert(challenge)
    .values({
      slug: `d-${now}`,
      title: "Desafio",
      theme: "Tema",
      briefing: "Briefing",
      rules: ["regra"],
      category: "fotografia",
      startsAt: new Date(now - 48 * h),
      submissionDeadline: new Date(phase === "open" ? now + 24 * h : now - h),
      votingEnabled: true,
      votingEndsAt: new Date(now + 48 * h),
      maxVotesPerUser: maxVotes,
    })
    .returning();
  return c!;
}

describe("Creative Battles", () => {
  it("aceita apenas trabalho público próprio, um por pessoa", async () => {
    const c = await makeChallenge("open");
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const p = await makePost(ana);
    const privado = await makePost(ana, { visibility: "private" });
    await expect(submitToChallenge(bruno, { challengeId: c.id, postId: p.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(submitToChallenge(ana, { challengeId: c.id, postId: privado.id })).rejects.toMatchObject({ code: "VALIDATION" });
    await submitToChallenge(ana, { challengeId: c.id, postId: p.id });
    const outro = await makePost(ana);
    await expect(submitToChallenge(ana, { challengeId: c.id, postId: outro.id })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("votação: sem voto próprio, com limite por pessoa e contagem oculta até o fim", async () => {
    const c = await makeChallenge("open", 2);
    const [a, b, d, voter] = await Promise.all([makeUser("A"), makeUser("B"), makeUser("D"), makeUser("Votante")]);
    const subs = [];
    for (const u of [a, b, d]) subs.push(await submitToChallenge(u, { challengeId: c.id, postId: (await makePost(u)).id }));
    // Antes da fase de votação, votar falha.
    await expect(toggleVote(voter, subs[0]!.id)).rejects.toMatchObject({ code: "VALIDATION" });
    await db.update(challenge).set({ submissionDeadline: new Date(Date.now() - 1000) }).where(eq(challenge.id, c.id));

    await expect(toggleVote(a, subs[0]!.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await toggleVote(voter, subs[0]!.id)).used).toBe(1);
    expect((await toggleVote(voter, subs[1]!.id)).used).toBe(2);
    await expect(toggleVote(voter, subs[2]!.id)).rejects.toMatchObject({ code: "VALIDATION" });
    // Retirar um voto libera outro.
    expect((await toggleVote(voter, subs[0]!.id)).voted).toBe(false);
    expect((await toggleVote(voter, subs[2]!.id)).voted).toBe(true);

    const [fresh] = await db.select().from(challenge).where(eq(challenge.id, c.id));
    const during = await listSubmissions(voter.id, fresh!);
    expect(during.every((s) => s.voteCount === null)).toBe(true);
  });

  it("conta nova não vota quando há idade mínima", async () => {
    process.env.CHALLENGE_MIN_ACCOUNT_AGE_HOURS = "24";
    try {
      const c = await makeChallenge("open");
      const a = await makeUser("A");
      const s = await submitToChallenge(a, { challengeId: c.id, postId: (await makePost(a)).id });
      await db.update(challenge).set({ submissionDeadline: new Date(Date.now() - 1000) }).where(eq(challenge.id, c.id));
      const novato = await makeUser("Novato");
      const { user } = await import("@/server/db/schema");
      await db.update(user).set({ createdAt: new Date() }).where(eq(user.id, novato.id));
      await expect(toggleVote(novato, s.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      process.env.CHALLENGE_MIN_ACCOUNT_AGE_HOURS = "0";
    }
  });
});
