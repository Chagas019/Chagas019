import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { and, arrayOverlaps, desc, eq, notInArray, sql } from "drizzle-orm";
import { db } from "../db";
import { collabApplication, collabListing, profile } from "../db/schema";
import { AppError } from "../errors";
import { enforceRateLimit } from "../rate-limit";
import type { Viewer } from "../session";
import { collabApplicationSchema, collabListingSchema, fieldErrors } from "@/lib/validation";
import { recordActivation } from "./activation";
import { notify } from "./notifications";
import { hiddenAuthorIds, isBlockedEitherWay } from "./relations";

type V = Pick<Viewer, "id" | "role">;
type Listing = typeof collabListing.$inferSelect;

/** Campos públicos de uma oportunidade — o contato e o código de acesso nunca saem daqui. */
const publicColumns = {
  id: collabListing.id,
  authorId: collabListing.authorId,
  title: collabListing.title,
  description: collabListing.description,
  skills: collabListing.skills,
  projectType: collabListing.projectType,
  compensation: collabListing.compensation,
  isVolunteer: collabListing.isVolunteer,
  location: collabListing.location,
  mode: collabListing.mode,
  deadline: collabListing.deadline,
  access: collabListing.access,
  status: collabListing.status,
  createdAt: collabListing.createdAt,
  authorHandle: profile.handle,
  authorName: profile.displayName,
  authorAvatar: profile.avatarMediaId,
  applications: sql<number>`(select count(*)::int from collab_application a where a.listing_id = ${collabListing.id})`,
};

export async function createListing(viewer: V, input: unknown) {
  const parsed = collabListingSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", undefined, fieldErrors(parsed.error));
  await enforceRateLimit(`collab-create:${viewer.id}`, 10, 86_400);
  const [row] = await db
    .insert(collabListing)
    .values({ ...parsed.data, authorId: viewer.id, accessCode: randomBytes(9).toString("base64url") })
    .returning({ id: collabListing.id, accessCode: collabListing.accessCode, access: collabListing.access });
  return row!;
}

export async function listListings(viewerId: string | null, filters: { skill?: string; mode?: string; type?: string; mine?: boolean }) {
  const hidden = viewerId ? await hiddenAuthorIds(viewerId) : [];
  return db
    .select(publicColumns)
    .from(collabListing)
    .innerJoin(profile, eq(profile.userId, collabListing.authorId))
    .where(
      and(
        filters.mine && viewerId
          ? and(eq(collabListing.authorId, viewerId), sql`${collabListing.status} <> 'removed'`)
          : and(eq(collabListing.status, "open"), eq(collabListing.access, "public")),
        hidden.length ? notInArray(collabListing.authorId, hidden) : undefined,
        filters.skill ? arrayOverlaps(collabListing.skills, [filters.skill]) : undefined,
        filters.mode ? eq(collabListing.mode, filters.mode as Listing["mode"]) : undefined,
        filters.type ? eq(collabListing.projectType, filters.type as Listing["projectType"]) : undefined,
      ),
    )
    .orderBy(desc(collabListing.createdAt))
    .limit(100);
}

function codeMatches(given: string | undefined, actual: string) {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Detalhe com regras de acesso: privadas exigem o código do link (ou ser autor/candidato);
 * removidas só para autor/moderação; bloqueios escondem nos dois sentidos.
 * O contato só é incluído para o autor e para candidaturas aceitas.
 */
export async function getListing(viewer: V | null, id: string, code?: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db.select({ ...publicColumns, contact: collabListing.contact, accessCode: collabListing.accessCode }).from(collabListing).innerJoin(profile, eq(profile.userId, collabListing.authorId)).where(eq(collabListing.id, id)).limit(1);
  if (!row) return null;
  const isAuthor = viewer?.id === row.authorId;
  const isMod = viewer?.role === "admin" || viewer?.role === "moderator";
  if (row.status === "removed" && !isAuthor && !isMod) return null;
  if (viewer && !isAuthor && (await isBlockedEitherWay(viewer.id, row.authorId))) return null;

  const [mine] = viewer && !isAuthor
    ? await db.select().from(collabApplication).where(and(eq(collabApplication.listingId, id), eq(collabApplication.applicantId, viewer.id))).limit(1)
    : [];
  if (row.access === "private" && !isAuthor && !isMod && !mine && !codeMatches(code, row.accessCode)) return null;

  const { contact, accessCode, ...rest } = row;
  return {
    listing: rest,
    acceptingApplications: rest.status === "open" && (!rest.deadline || rest.deadline.getTime() > Date.now()),
    isAuthor,
    myApplication: mine ?? null,
    contact: isAuthor || mine?.status === "accepted" ? contact : null,
    shareCode: isAuthor && row.access === "private" ? accessCode : null,
  };
}

export async function applyToListing(viewer: V, input: unknown, code?: string) {
  const parsed = collabApplicationSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", undefined, fieldErrors(parsed.error));
  const detail = await getListing(viewer, parsed.data.listingId, code);
  if (!detail) throw new AppError("NOT_FOUND");
  if (detail.isAuthor) throw new AppError("VALIDATION", "Você não pode se candidatar à própria oportunidade.");
  if (detail.listing.status !== "open") throw new AppError("VALIDATION", "Esta oportunidade não está recebendo candidaturas.");
  if (detail.listing.deadline && detail.listing.deadline.getTime() < Date.now()) throw new AppError("VALIDATION", "O prazo desta oportunidade terminou.");
  await enforceRateLimit(`collab-apply:${viewer.id}`, 20, 86_400);
  const inserted = await db
    .insert(collabApplication)
    .values({ listingId: parsed.data.listingId, applicantId: viewer.id, message: parsed.data.message, portfolioUrl: parsed.data.portfolioUrl })
    .onConflictDoNothing()
    .returning({ id: collabApplication.id });
  if (!inserted.length) throw new AppError("CONFLICT", "Você já demonstrou interesse nesta oportunidade.");
  await notify({ userId: detail.listing.authorId, actorId: viewer.id, type: "collab", message: `demonstrou interesse em “${detail.listing.title}”` });
  await recordActivation(viewer.id, "first_collab_started");
  return inserted[0]!;
}

export async function listApplications(viewer: V, listingId: string) {
  const [l] = await db.select({ authorId: collabListing.authorId }).from(collabListing).where(eq(collabListing.id, listingId)).limit(1);
  if (!l) throw new AppError("NOT_FOUND");
  if (l.authorId !== viewer.id) throw new AppError("FORBIDDEN");
  return db
    .select({
      id: collabApplication.id,
      message: collabApplication.message,
      portfolioUrl: collabApplication.portfolioUrl,
      status: collabApplication.status,
      createdAt: collabApplication.createdAt,
      applicantId: collabApplication.applicantId,
      handle: profile.handle,
      displayName: profile.displayName,
      avatar: profile.avatarMediaId,
      specialties: profile.specialties,
    })
    .from(collabApplication)
    .innerJoin(profile, eq(profile.userId, collabApplication.applicantId))
    .where(eq(collabApplication.listingId, listingId))
    .orderBy(desc(collabApplication.createdAt));
}

export async function decideApplication(viewer: V, applicationId: string, decision: "accepted" | "declined") {
  const [row] = await db
    .select({ app: collabApplication, authorId: collabListing.authorId, title: collabListing.title, listingId: collabListing.id })
    .from(collabApplication)
    .innerJoin(collabListing, eq(collabListing.id, collabApplication.listingId))
    .where(eq(collabApplication.id, applicationId))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND");
  if (row.authorId !== viewer.id) throw new AppError("FORBIDDEN");
  await db.update(collabApplication).set({ status: decision }).where(eq(collabApplication.id, applicationId));
  await notify({
    userId: row.app.applicantId,
    actorId: viewer.id,
    type: "collab",
    message: decision === "accepted" ? `aceitou sua candidatura em “${row.title}” — o contato está liberado` : `não seguiu com sua candidatura em “${row.title}”`,
  });
  if (decision === "accepted") await recordActivation(viewer.id, "first_collab_started");
  return { listingId: row.listingId };
}

export async function setListingStatus(viewer: V, id: string, status: "open" | "closed") {
  const res = await db
    .update(collabListing)
    .set({ status })
    .where(and(eq(collabListing.id, id), eq(collabListing.authorId, viewer.id), sql`${collabListing.status} <> 'removed'`))
    .returning({ id: collabListing.id });
  if (!res.length) throw new AppError("FORBIDDEN");
}

export async function deleteListing(viewer: V, id: string) {
  const res = await db.delete(collabListing).where(and(eq(collabListing.id, id), eq(collabListing.authorId, viewer.id))).returning({ id: collabListing.id });
  if (!res.length) throw new AppError("FORBIDDEN");
}

export async function myApplications(viewerId: string) {
  return db
    .select({ id: collabApplication.id, status: collabApplication.status, createdAt: collabApplication.createdAt, listingId: collabListing.id, title: collabListing.title, listingStatus: collabListing.status })
    .from(collabApplication)
    .innerJoin(collabListing, eq(collabListing.id, collabApplication.listingId))
    .where(eq(collabApplication.applicantId, viewerId))
    .orderBy(desc(collabApplication.createdAt))
    .limit(100);
}
