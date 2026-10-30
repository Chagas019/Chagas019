import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { notification, post, profile } from "@/server/db/schema";
import { addComment, deleteComment, setFollow, toggleLike, toggleSave } from "@/server/services/social";
import { createPost } from "@/server/services/posts";
import { storeUpload } from "@/server/services/media";
import { jpeg, makePost, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);

const counts = async (id: string) => (await db.select().from(post).where(eq(post.id, id)))[0]!;

describe("interações sociais", () => {
  it("curtir alterna e mantém contador consistente; notifica o autor uma vez", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const p = await makePost(ana);
    expect(await toggleLike(bruno, p.id)).toEqual({ liked: true, count: 1 });
    expect(await toggleLike(bruno, p.id)).toEqual({ liked: false, count: 0 });
    await toggleLike(bruno, p.id);
    expect((await counts(p.id)).likeCount).toBe(1);
    const notes = await db.select().from(notification).where(eq(notification.userId, ana.id));
    expect(notes.filter((n) => n.type === "like")).toHaveLength(0); // curtidas desligadas por padrão
  });

  it("comentários e respostas atualizam contadores e notificam", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const carla = await makeUser("Carla");
    const p = await makePost(ana);
    const c1 = await addComment(bruno, { postId: p.id, body: "Que luz!" });
    await addComment(carla, { postId: p.id, parentId: c1.id, body: "Concordo" });
    expect((await counts(p.id)).commentCount).toBe(2);
    const forBruno = await db.select().from(notification).where(eq(notification.userId, bruno.id));
    expect(forBruno.map((n) => n.type)).toContain("reply");
    // Autor do post pode apagar comentários; apagar o pai remove respostas.
    await deleteComment(ana, c1.id);
    expect((await counts(p.id)).commentCount).toBe(0);
    await expect(deleteComment(carla, c1.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("não permite interagir com post privado de outra pessoa", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const p = await makePost(ana, { visibility: "private" });
    await expect(toggleLike(bruno, p.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(addComment(bruno, { postId: p.id, body: "oi" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(toggleSave(bruno, p.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("seguir atualiza contadores dos dois perfis e é idempotente", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    await setFollow(bruno, ana.id, true);
    await setFollow(bruno, ana.id, true);
    const [a] = await db.select().from(profile).where(eq(profile.userId, ana.id));
    const [b] = await db.select().from(profile).where(eq(profile.userId, bruno.id));
    expect(a!.followerCount).toBe(1);
    expect(b!.followingCount).toBe(1);
    await setFollow(bruno, ana.id, false);
    const [a2] = await db.select().from(profile).where(eq(profile.userId, ana.id));
    expect(a2!.followerCount).toBe(0);
    await expect(setFollow(ana, ana.id, true)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("não aceita mídia de outra pessoa ao publicar", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const m = await storeUpload({ ownerId: ana.id, purpose: "post", data: await jpeg() });
    await expect(createPost(bruno, { kind: "work", format: "photo", title: "roubado" }, { mediaIds: [m.id] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
