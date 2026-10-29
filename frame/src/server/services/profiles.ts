import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { media, profile } from "../db/schema";
import { AppError } from "../errors";
import { fieldErrors, onboardingSchema, profileSchema, RESERVED_HANDLES } from "@/lib/validation";
import { recordActivation } from "./activation";
import { deleteMediaRows } from "./media";

function baseHandle(name: string, email: string): string {
  const fromName = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  const fromEmail = email.split("@")[0]!.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20);
  const base = fromName.length >= 3 ? fromName : fromEmail.length >= 3 ? fromEmail : "criador";
  return RESERVED_HANDLES.has(base) ? `${base}_` : base;
}

async function handleTaken(handle: string, exceptUserId?: string): Promise<boolean> {
  const where = exceptUserId
    ? and(sql`lower(${profile.handle}) = ${handle.toLowerCase()}`, ne(profile.userId, exceptUserId))
    : sql`lower(${profile.handle}) = ${handle.toLowerCase()}`;
  const rows = await db.select({ id: profile.userId }).from(profile).where(where).limit(1);
  return rows.length > 0;
}

/** Chamado pelo hook de criação de usuário do Better Auth. */
export async function createProfileForUser(u: { id: string; name: string; email: string }) {
  const base = baseHandle(u.name, u.email);
  let handle = base;
  for (let i = 0; i < 20 && (await handleTaken(handle)); i++) {
    handle = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  }
  await db.insert(profile).values({ userId: u.id, handle, displayName: u.name.trim().slice(0, 60) || handle }).onConflictDoNothing();
  await recordActivation(u.id, "signup_completed");
}

export async function getProfileByHandle(handle: string) {
  const [row] = await db.select().from(profile).where(sql`lower(${profile.handle}) = ${handle.toLowerCase()}`).limit(1);
  return row ?? null;
}

export async function getProfileByUserId(userId: string) {
  const [row] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
  return row ?? null;
}

export async function completeOnboarding(userId: string, input: unknown) {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", undefined, fieldErrors(parsed.error));
  if (await handleTaken(parsed.data.handle, userId)) {
    throw new AppError("CONFLICT", "Este identificador já está em uso.", { handle: "Este identificador já está em uso." });
  }
  await db
    .update(profile)
    .set({
      handle: parsed.data.handle,
      displayName: parsed.data.displayName,
      interests: parsed.data.interests,
      specialties: parsed.data.specialties,
      onboardedAt: new Date(),
    })
    .where(eq(profile.userId, userId));
  await recordActivation(userId, "onboarding_completed");
}

export async function updateProfile(userId: string, input: unknown) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", undefined, fieldErrors(parsed.error));
  if (await handleTaken(parsed.data.handle, userId)) {
    throw new AppError("CONFLICT", "Este identificador já está em uso.", { handle: "Este identificador já está em uso." });
  }
  await db.update(profile).set(parsed.data).where(eq(profile.userId, userId));
  return parsed.data;
}

/** Troca avatar/capa por uma mídia já enviada pelo próprio usuário, apagando a anterior. */
export async function setProfileImage(userId: string, which: "avatar" | "cover", mediaId: string) {
  const [m] = await db.select().from(media).where(and(eq(media.id, mediaId), eq(media.ownerId, userId))).limit(1);
  if (!m || m.purpose !== which || m.kind !== "image") throw new AppError("FORBIDDEN");
  const current = await getProfileByUserId(userId);
  const previousId = which === "avatar" ? current?.avatarMediaId : current?.coverMediaId;
  await db
    .update(profile)
    .set(which === "avatar" ? { avatarMediaId: mediaId } : { coverMediaId: mediaId })
    .where(eq(profile.userId, userId));
  if (previousId && previousId !== mediaId) {
    const old = await db
      .select({ id: media.id, storageKey: media.storageKey, thumbKey: media.thumbKey })
      .from(media)
      .where(and(eq(media.id, previousId), eq(media.ownerId, userId)));
    await deleteMediaRows(old);
  }
}
