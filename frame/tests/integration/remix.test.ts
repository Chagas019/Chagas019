import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { notification, post } from "@/server/db/schema";
import { remixRelations, updatePost } from "@/server/services/posts";
import { generateMission, missionToProposal } from "@/lib/creative/missions";
import { ideaProposalSchema } from "@/lib/validation";
import { labParticipantCounts } from "@/server/services/studio";
import { labTag } from "@/lib/creative/lab-challenges";
import { makePost, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);

describe("remix", () => {
  it("só é possível quando o autor permite; credita e notifica o original", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const closed = await makePost(ana);
    await expect(makePost(bruno, { remixOfId: closed.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const open = await makePost(ana, { allowRemix: true });
    const r = await makePost(bruno, { remixOfId: open.id });
    const [row] = await db.select().from(post).where(eq(post.id, r.id));
    expect(row!.remixOfId).toBe(open.id);
    expect(row!.credits[0]).toEqual({ name: "Ana", role: "Obra original", handle: ana.handle });
    const notes = await db.select().from(notification).where(eq(notification.userId, ana.id));
    expect(notes.some((n) => n.message.includes("remix"))).toBe(true);
    const rel = await remixRelations(null, { id: open.id, remixOfId: null });
    expect(rel.remixes.map((c) => c.id)).toEqual([r.id]);
  });

  it("autor pode desligar o remix: novos são bloqueados, os existentes continuam", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const p = await makePost(ana, { allowRemix: true });
    const first = await makePost(bruno, { remixOfId: p.id });
    await updatePost(ana, p.id, { title: "Trabalho de teste", visibility: "public", allowRemix: false });
    await expect(makePost(bruno, { remixOfId: p.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const [row] = await db.select().from(post).where(eq(post.id, first.id));
    expect(row!.remixOfId).toBe(p.id);
  });

  it("não deixa remixar o que não pode ver", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const priv = await makePost(ana, { allowRemix: true, visibility: "private" });
    await expect(makePost(bruno, { remixOfId: priv.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("missões e LAB", () => {
  it("missão vira proposta válida para salvar", () => {
    for (let s = 1; s < 30; s++) {
      const m = generateMission(s);
      expect(m.rules.length).toBeGreaterThanOrEqual(2);
      expect(ideaProposalSchema.safeParse(missionToProposal(m)).success).toBe(true);
    }
    expect(generateMission(5, "video").category).toBe("video");
  });

  it("participantes do LAB contam pessoas distintas com a hashtag", async () => {
    const ana = await makeUser("Ana");
    const tag = labTag("so-luz-natural");
    await makePost(ana, { body: `#${tag}` });
    await makePost(ana, { body: `#${tag}` });
    await makePost(ana, { body: `#${tag}`, visibility: "private" });
    expect(await labParticipantCounts([tag])).toEqual({ [tag]: 1 });
  });
});
