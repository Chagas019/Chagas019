import { beforeEach, describe, expect, it } from "vitest";
import { canViewPost } from "@/server/services/access";
import { getFeed, getPostDetail, listUserCards } from "@/server/services/posts";
import { setBlock, setFollow, setMute } from "@/server/services/social";
import { createCommunity, joinCommunity } from "@/server/services/communities";
import { makePost, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);

describe("visibilidade de publicações", () => {
  it("público aparece para todos; seguidores só para quem segue; privado só para o autor", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const pub = await makePost(ana, { title: "público" });
    const fol = await makePost(ana, { title: "seguidores", visibility: "followers" });
    const priv = await makePost(ana, { title: "privado", visibility: "private" });

    expect(await getPostDetail(null, pub.id)).not.toBeNull();
    expect(await getPostDetail(null, fol.id)).toBeNull();
    expect(await getPostDetail(bruno, fol.id)).toBeNull();
    expect(await getPostDetail(bruno, priv.id)).toBeNull();
    expect(await getPostDetail(ana, priv.id)).not.toBeNull();

    await setFollow(bruno, ana.id, true);
    expect(await getPostDetail(bruno, fol.id)).not.toBeNull();
    expect(await getPostDetail(bruno, priv.id)).toBeNull();

    // Listagem SQL concorda com a regra em código.
    const titles = (await listUserCards(bruno.id, ana.id)).map((c) => c.title).sort();
    expect(titles).toEqual(["público", "seguidores"]);
    const anon = (await listUserCards(null, ana.id)).map((c) => c.title);
    expect(anon).toEqual(["público"]);
  });

  it("bloqueio esconde conteúdo nos dois sentidos e desfaz o follow", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const p = await makePost(ana);
    await setFollow(bruno, ana.id, true);
    await setBlock(ana, bruno.id, true);
    expect(await getPostDetail(bruno, p.id)).toBeNull();
    const feed = await getFeed(bruno, "para-voce", null);
    expect(feed.items.find((i) => i.id === p.id)).toBeUndefined();
    await expect(setFollow(bruno, ana.id, true)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("silenciar remove do feed sem bloquear o acesso direto", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const p = await makePost(ana);
    await setMute(bruno, ana.id, true);
    expect((await getFeed(bruno, "para-voce", null)).items.map((i) => i.id)).not.toContain(p.id);
    expect(await getPostDetail(bruno, p.id)).not.toBeNull();
  });

  it("conteúdo de comunidade privada só para participantes ativos", async () => {
    const dona = await makeUser("Dona");
    const fora = await makeUser("Fora");
    const c = await createCommunity(dona, { name: "Grupo fechado", access: "private" });
    const p = await makePost(dona, { communityId: c.id });
    expect(await canViewPost(fora, { authorId: dona.id, visibility: "public", status: "published", communityId: c.id })).toBe(false);
    expect(await getPostDetail(null, p.id)).toBeNull();
    const r = await joinCommunity(fora, c.id);
    expect(r.status).toBe("pending");
    expect(await getPostDetail(fora, p.id)).toBeNull();
    // Conteúdo de comunidade não vaza para o feed geral.
    expect((await getFeed(dona, "para-voce", null)).items.map((i) => i.id)).not.toContain(p.id);
  });

  it("comunidade por convite exige o código correto", async () => {
    const dona = await makeUser("Dona");
    const conv = await makeUser("Convidada");
    const c = await createCommunity(dona, { name: "Só convite", access: "invite" });
    await expect(joinCommunity(conv, c.id, "errado")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await joinCommunity(conv, c.id, c.inviteCode)).status).toBe("active");
  });
});

describe("papéis em comunidades", () => {
  it("admin não pode banir outro admin; só a criadora pode", async () => {
    const { moderateMember } = await import("@/server/services/communities");
    const dona = await makeUser("Dona");
    const adm1 = await makeUser("Adm1");
    const adm2 = await makeUser("Adm2");
    const c = await createCommunity(dona, { name: "Papéis", access: "public" });
    await joinCommunity(adm1, c.id);
    await joinCommunity(adm2, c.id);
    await moderateMember(dona, c.id, adm1.id, "promote");
    await expect(moderateMember(adm1, c.id, adm2.id, "promote")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await moderateMember(dona, c.id, adm2.id, "promote");
    await expect(moderateMember(adm1, c.id, adm2.id, "ban")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await moderateMember(dona, c.id, adm2.id, "ban");
  });
});
