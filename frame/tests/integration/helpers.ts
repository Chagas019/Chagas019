import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/server/db";
import { profile, user } from "@/server/db/schema";
import { createProfileForUser } from "@/server/services/profiles";
import { storeUpload } from "@/server/services/media";
import { createPost } from "@/server/services/posts";

export type TestUser = { id: string; role: "user" | "moderator" | "admin"; createdAt: Date; handle: string };

export async function resetDb() {
  await db.execute(sql`truncate table "user", community, challenge, app_rate_limit, report cascade`);
}

export async function makeUser(name = "Pessoa", role: TestUser["role"] = "user"): Promise<TestUser> {
  const id = randomUUID();
  const email = `${id.slice(0, 8)}@test.local`;
  await db.insert(user).values({ id, name, email, role, createdAt: new Date(Date.now() - 30 * 864e5) });
  await createProfileForUser({ id, name, email });
  await db.update(profile).set({ onboardedAt: new Date() }).where(eq(profile.userId, id));
  const [p] = await db.select({ handle: profile.handle }).from(profile).where(eq(profile.userId, id));
  return { id, role, createdAt: new Date(Date.now() - 30 * 864e5), handle: p!.handle };
}

export async function jpeg(color = "#7c3aed", w = 400, h = 300) {
  return sharp({ create: { width: w, height: h, channels: 3, background: color } }).jpeg().toBuffer();
}

export async function makePost(author: TestUser, overrides: Record<string, unknown> = {}) {
  const m = await storeUpload({ ownerId: author.id, purpose: "post", data: await jpeg() });
  return createPost(author, { kind: "work", format: "photo", title: "Trabalho de teste", categories: ["fotografia"], ...overrides }, { mediaIds: [m.id] });
}
