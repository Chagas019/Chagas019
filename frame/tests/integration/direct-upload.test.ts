import { existsSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { media } from "@/server/db/schema";
import { finalizeDirectUpload, incomingPrefix } from "@/server/services/media";
import { storage } from "@/server/storage";
import { TEST_STORAGE_DIR } from "../env";
import { jpeg, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);

describe("envio direto ao storage", () => {
  it("processa a imagem, remove o original e registra a mídia", async () => {
    const ana = await makeUser("Ana");
    const key = `${incomingPrefix(ana.id)}foto-abc.jpg`;
    await storage().put(key, await jpeg("#334455", 1200, 800), "image/jpeg");
    const m = await finalizeDirectUpload({ ownerId: ana.id, pathname: key, purpose: "post" });
    expect(m.kind).toBe("image");
    expect(existsSync(path.join(TEST_STORAGE_DIR, key))).toBe(false);
    const [row] = await db.select().from(media).where(eq(media.id, m.id));
    expect(row!.mimeType).toBe("image/webp");
  });

  it("registra vídeo sem reprocessar", async () => {
    const ana = await makeUser("Ana");
    const key = `${incomingPrefix(ana.id)}clip.mp4`;
    await storage().put(key, Buffer.concat([Buffer.from("\0\0\0\x18ftypisom\0\0\0\0"), Buffer.alloc(2048)]), "video/mp4");
    const m = await finalizeDirectUpload({ ownerId: ana.id, pathname: key, purpose: "post" });
    const [row] = await db.select().from(media).where(eq(media.id, m.id));
    expect(row!.kind).toBe("video");
    expect(row!.storageKey).toBe(key);
  });

  it("recusa caminho de outra pessoa e apaga arquivo inválido", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const key = `${incomingPrefix(ana.id)}a.jpg`;
    await storage().put(key, await jpeg(), "image/jpeg");
    await expect(finalizeDirectUpload({ ownerId: bruno.id, pathname: key, purpose: "post" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const bad = `${incomingPrefix(ana.id)}x.jpg`;
    await storage().put(bad, Buffer.from("<html><script>alert(1)</script></html>                 "), "image/jpeg");
    await expect(finalizeDirectUpload({ ownerId: ana.id, pathname: bad, purpose: "post" })).rejects.toMatchObject({ code: "VALIDATION" });
    expect(existsSync(path.join(TEST_STORAGE_DIR, bad))).toBe(false);
  });
});
