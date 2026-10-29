import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { notification, post } from "@/server/db/schema";
import { getFeed, getPostDetail, listDrafts, listPopular, searchPosts, setPinned, updatePost } from "@/server/services/posts";
import { addComment, toggleLike } from "@/server/services/social";
import { searchPeople, trendingTags } from "@/server/services/discovery";
import { makePost, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);

const notesOf = async (userId: string) => db.select().from(notification).where(eq(notification.userId, userId));

describe("publicação: rascunhos, edição e hashtags", () => {
  it("rascunho é visível só para o autor, fica fora do feed e não permite interação", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const p = await makePost(ana, { draft: true, title: "Ensaio #retrato" });
    expect(await getPostDetail(ana, p.id)).not.toBeNull();
    expect(await getPostDetail(bruno, p.id)).toBeNull();
    expect(await getPostDetail(null, p.id)).toBeNull();
    expect((await getFeed(bruno, "para-voce", null)).items.map((i) => i.id)).not.toContain(p.id);
    await expect(toggleLike(bruno, p.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await listDrafts(ana.id)).map((d) => d.id)).toEqual([p.id]);
    expect(await trendingTags()).toEqual([]); // rascunho não conta em tendências
  });

  it("publicar o rascunho pela edição torna o post público e conta nas tendências", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const p = await makePost(ana, { draft: true, title: "Ensaio" });
    await updatePost(ana, p.id, { title: "Ensaio #Retrato na #luz", visibility: "public", publish: true });
    const detail = await getPostDetail(bruno, p.id);
    expect(detail?.post.status).toBe("published");
    expect(detail?.post.tags).toEqual(["retrato", "luz"]);
    expect(await trendingTags()).toEqual(expect.arrayContaining([{ tag: "retrato", posts: 1 }]));
    expect((await searchPosts(bruno.id, "#retrato", null)).map((c) => c.id)).toEqual([p.id]);
    expect((await searchPosts(bruno.id, "Ensaio", null)).map((c) => c.id)).toEqual([p.id]);
    expect(await searchPosts(bruno.id, "100%_nada", null)).toEqual([]);
  });

  it("só o autor edita", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const p = await makePost(ana);
    await expect(updatePost(bruno, p.id, { title: "Hack", visibility: "public" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("comentários desativados bloqueiam novos comentários no servidor", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const p = await makePost(ana, { commentsEnabled: false });
    await expect(addComment(bruno, { postId: p.id, body: "Oi" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("menções e créditos", () => {
  it("marcar nos créditos e @mencionar notifica uma vez; perfis inexistentes viram texto", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const carla = await makeUser("Carla");
    const p = await makePost(ana, {
      body: `Com @${carla.handle} e @${bruno.handle}`,
      credits: [
        { name: "Bruno", role: "Edição", handle: bruno.handle },
        { name: "Fulano", role: "Modelo", handle: "naoexiste_123" },
      ],
    });
    const [row] = await db.select().from(post).where(eq(post.id, p.id));
    expect(row!.credits).toEqual([
      { name: "Bruno", role: "Edição", handle: bruno.handle },
      { name: "Fulano", role: "Modelo" },
    ]);
    expect(row!.isCollaborative).toBe(true);
    expect((await notesOf(bruno.id)).filter((n) => n.type === "mention")).toHaveLength(1);
    expect((await notesOf(carla.id)).filter((n) => n.type === "mention")).toHaveLength(1);
    // Editar sem novas menções não notifica de novo.
    await updatePost(ana, p.id, { title: "Novo título", body: `Com @${carla.handle} e @${bruno.handle}`, visibility: "public", credits: row!.credits });
    expect((await notesOf(carla.id)).filter((n) => n.type === "mention")).toHaveLength(1);
  });

  it("menção em post privado não notifica (não vaza conteúdo)", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    await makePost(ana, { body: `oi @${bruno.handle}`, visibility: "private" });
    expect((await notesOf(bruno.id)).filter((n) => n.type === "mention")).toHaveLength(0);
  });

  it("menção em comentário notifica quem pode ver o post", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const carla = await makeUser("Carla");
    const p = await makePost(ana);
    await addComment(bruno, { postId: p.id, body: `olha isso @${carla.handle}` });
    expect((await notesOf(carla.id)).map((n) => n.type)).toContain("mention");
  });
});

describe("portfólio e descoberta", () => {
  it("fixa até 6 destaques e só posts públicos", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const ids = [];
    for (let i = 0; i < 7; i++) ids.push((await makePost(ana, { title: `T${i}` })).id);
    for (let i = 0; i < 6; i++) await setPinned(ana, ids[i]!, true);
    await expect(setPinned(ana, ids[6]!, true)).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(setPinned(bruno, ids[0]!, false)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const priv = await makePost(ana, { visibility: "private" });
    await setPinned(ana, ids[0]!, false);
    await expect(setPinned(ana, priv.id, true)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("destaques exigem interação real e busca de pessoas encontra por @", async () => {
    const ana = await makeUser("Ana Lima");
    const bruno = await makeUser("Bruno");
    const quiet = await makePost(ana, { title: "Sem curtidas" });
    const liked = await makePost(ana, { title: "Curtido" });
    await toggleLike(bruno, liked.id);
    const popular = await listPopular(bruno.id, 30, 10);
    expect(popular.map((c) => c.id)).toEqual([liked.id]);
    expect(popular.map((c) => c.id)).not.toContain(quiet.id);
    expect((await searchPeople(bruno.id, `@${ana.handle}`)).map((p) => p.userId)).toContain(ana.id);
    expect((await searchPeople(bruno.id, "Ana Li")).map((p) => p.userId)).toContain(ana.id);
  });
});
