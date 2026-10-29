import { existsSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { media, post, user } from "@/server/db/schema";
import { storeUpload } from "@/server/services/media";
import { deleteAccount, exportUserData } from "@/server/services/privacy";
import { storage } from "@/server/storage";
import { makePost, makeUser, resetDb } from "./helpers";
import { TEST_STORAGE_DIR } from "../env";

beforeEach(resetDb);

describe("mídia e privacidade", () => {
  it("remove EXIF/GPS e gera versão de exibição + miniatura", async () => {
    const ana = await makeUser("Ana");
    const withExif = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#123456" } })
      .withExif({ IFD0: { Copyright: "Ana", Artist: "Ana" }, IFD3: { GPSLatitudeRef: "S", GPSLatitude: "2/1 30/1 0/1" } })
      .jpeg()
      .toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const m = await storeUpload({ ownerId: ana.id, purpose: "post", data: withExif });
    const [row] = await db.select().from(media).where(eq(media.id, m.id));
    const stored = await storage().get(row!.storageKey);
    const buf = Buffer.from(await new Response(stored!.body).arrayBuffer());
    const meta = await sharp(buf).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(row!.thumbKey).toBeTruthy();
  });

  it("rejeita arquivo disfarçado de imagem", async () => {
    const ana = await makeUser("Ana");
    await expect(storeUpload({ ownerId: ana.id, purpose: "post", data: Buffer.from("<html><script>alert(1)</script></html>          ") })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("exporta dados e exclui conta com arquivos", async () => {
    const ana = await makeUser("Ana");
    const p = await makePost(ana, { title: "meu trabalho" });
    const exported = await exportUserData(ana.id);
    expect(exported.posts.map((x) => x.title)).toContain("meu trabalho");
    expect(JSON.stringify(exported)).not.toContain("password");

    const [row] = await db.select().from(media).where(eq(media.postId, p.id));
    const file = path.join(TEST_STORAGE_DIR, row!.storageKey);
    expect(existsSync(file)).toBe(true);
    await deleteAccount(ana.id);
    expect(existsSync(file)).toBe(false);
    expect(await db.select().from(user).where(eq(user.id, ana.id))).toHaveLength(0);
    expect(await db.select().from(post).where(eq(post.id, p.id))).toHaveLength(0);
  });
});

describe("exclusão de conta com comunidade sem herdeiro", () => {
  it("apaga a comunidade e os arquivos dos posts dela", async () => {
    const { createCommunity } = await import("@/server/services/communities");
    const dona = await makeUser("Dona");
    const c = await createCommunity(dona, { name: "Solo", access: "public" });
    const p = await makePost(dona, { communityId: c.id });
    const [row] = await db.select().from(media).where(eq(media.postId, p.id));
    const file = path.join(TEST_STORAGE_DIR, row!.storageKey);
    expect(existsSync(file)).toBe(true);
    await deleteAccount(dona.id);
    expect(existsSync(file)).toBe(false);
    expect(await db.select().from(media).where(eq(media.id, row!.id))).toHaveLength(0);
  });
});
