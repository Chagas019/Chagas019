import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { profile } from "@/server/db/schema";
import { canMessage, getConversation, listConversations, sendMessage, startConversation, unreadConversations } from "@/server/services/messages";
import { applyToListing, createListing, decideApplication } from "@/server/services/collab";
import { setBlock, setFollow } from "@/server/services/social";
import { makeUser, resetDb } from "./helpers";

beforeEach(resetDb);

describe("mensagens", () => {
  it("por padrão só quem o destinatário segue pode iniciar conversa", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    expect(await canMessage(bruno.id, ana.id)).toBe(false);
    await expect(startConversation(bruno, { participantIds: [ana.id], body: "oi" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await setFollow(ana, bruno.id, true);
    expect(await canMessage(bruno.id, ana.id)).toBe(true);
    await db.update(profile).set({ messagesFrom: "nobody" }).where(eq(profile.userId, ana.id));
    expect(await canMessage(bruno.id, ana.id)).toBe(false);
    await db.update(profile).set({ messagesFrom: "everyone" }).where(eq(profile.userId, ana.id));
    expect(await canMessage(bruno.id, ana.id)).toBe(true);
  });

  it("colaboração aceita libera a conversa; bloqueio impede", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const l = await createListing(ana, { title: "T", description: "D", skills: ["Colorista"], projectType: "video", compensation: "R$ 1", mode: "remoto", contact: "x" });
    const app = await applyToListing(bruno, { listingId: l.id, message: "oi" });
    expect(await canMessage(bruno.id, ana.id)).toBe(false);
    await decideApplication(ana, app.id, "accepted");
    expect(await canMessage(bruno.id, ana.id)).toBe(true);
    expect(await canMessage(ana.id, bruno.id)).toBe(true);
    const c = await startConversation(bruno, { participantIds: [ana.id], body: "Obrigado!" });
    await setBlock(ana, bruno.id, true);
    expect(await canMessage(bruno.id, ana.id)).toBe(false);
    await expect(sendMessage(bruno, { conversationId: c.id, body: "?" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reaproveita a conversa 1:1, conta não lidas e protege de quem não participa", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const intrusa = await makeUser("Intrusa");
    await setFollow(ana, bruno.id, true);
    const c1 = await startConversation(bruno, { participantIds: [ana.id], body: "oi" });
    const c2 = await startConversation(bruno, { participantIds: [ana.id], body: "tudo bem?" });
    expect(c2.id).toBe(c1.id);
    expect(await unreadConversations(ana.id)).toBe(1);
    expect(await unreadConversations(bruno.id)).toBe(0);
    const list = await listConversations(ana.id);
    expect(list[0]!.unread).toBe(2);
    expect(await getConversation(intrusa, c1.id)).toBeNull();
    await expect(sendMessage(intrusa, { conversationId: c1.id, body: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
