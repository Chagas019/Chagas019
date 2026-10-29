import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { community, communityMember, post, profile } from "../db/schema";
import { AppError } from "../errors";
import type { Viewer } from "../session";
import { communitySchema, fieldErrors } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { communityAccessFor } from "./access";
import { recordActivation } from "./activation";
import { notify } from "./notifications";

type V = Pick<Viewer, "id" | "role">;

const newInviteCode = () => randomBytes(9).toString("base64url");

export async function createCommunity(viewer: V, input: unknown) {
  const parsed = communitySchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", undefined, fieldErrors(parsed.error));
  const owned = await db.select({ n: sql<number>`count(*)::int` }).from(community).where(eq(community.ownerId, viewer.id));
  if ((owned[0]?.n ?? 0) >= 10) throw new AppError("VALIDATION", "Cada pessoa pode criar até 10 comunidades.");
  const base = slugify(parsed.data.name) || "comunidade";
  let slug = base;
  for (let i = 2; i < 100; i++) {
    const exists = await db.select({ id: community.id }).from(community).where(eq(community.slug, slug)).limit(1);
    if (!exists.length) break;
    slug = `${base}-${i}`;
  }
  return db.transaction(async (tx) => {
    const [c] = await tx
      .insert(community)
      .values({ ...parsed.data, slug, ownerId: viewer.id, inviteCode: newInviteCode(), memberCount: 1 })
      .returning();
    await tx.insert(communityMember).values({ communityId: c!.id, userId: viewer.id, role: "owner", status: "active" });
    return c!;
  });
}

export async function listCommunities(viewerId: string | null, opts: { mine?: boolean } = {}) {
  const memberOf = viewerId
    ? sql<string | null>`(select m.status from community_member m where m.community_id = ${community.id} and m.user_id = ${viewerId})`
    : sql<string | null>`null`;
  const rows = await db
    .select({
      id: community.id,
      slug: community.slug,
      name: community.name,
      description: community.description,
      categories: community.categories,
      access: community.access,
      memberCount: community.memberCount,
      memberStatus: memberOf,
    })
    .from(community)
    .where(
      and(
        eq(community.status, "published"),
        opts.mine && viewerId
          ? sql`exists (select 1 from community_member m where m.community_id = ${community.id} and m.user_id = ${viewerId} and m.status = 'active')`
          : // Comunidades por convite só aparecem para membros.
            viewerId
            ? sql`(${community.access} <> 'invite' or exists (select 1 from community_member m where m.community_id = ${community.id} and m.user_id = ${viewerId} and m.status = 'active'))`
            : sql`${community.access} <> 'invite'`,
      ),
    )
    .orderBy(desc(community.memberCount), asc(community.name))
    .limit(100);
  return rows;
}

export async function getCommunityBySlug(slug: string) {
  const [c] = await db.select().from(community).where(eq(community.slug, slug)).limit(1);
  return c ?? null;
}

export async function joinCommunity(viewer: V, communityId: string, inviteCode?: string): Promise<{ status: "active" | "pending" }> {
  const [c] = await db.select().from(community).where(eq(community.id, communityId)).limit(1);
  if (!c || c.status === "removed") throw new AppError("NOT_FOUND");
  const access = await communityAccessFor(communityId, viewer.id);
  if (access?.memberStatus === "banned") throw new AppError("FORBIDDEN", "Você não pode entrar nesta comunidade.");
  if (access?.memberStatus === "active") return { status: "active" };

  let status: "active" | "pending" = "active";
  if (c.access === "private") status = "pending";
  if (c.access === "invite") {
    const a = Buffer.from(inviteCode ?? "");
    const b = Buffer.from(c.inviteCode);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new AppError("FORBIDDEN", "Convite inválido ou expirado.");
  }
  await db.transaction(async (tx) => {
    await tx
      .insert(communityMember)
      .values({ communityId, userId: viewer.id, status })
      .onConflictDoUpdate({ target: [communityMember.communityId, communityMember.userId], set: { status } });
    if (status === "active") await tx.update(community).set({ memberCount: sql`${community.memberCount} + 1` }).where(eq(community.id, communityId));
  });
  if (status === "active") await recordActivation(viewer.id, "first_community_join");
  else {
    const admins = await db
      .select({ userId: communityMember.userId })
      .from(communityMember)
      .where(and(eq(communityMember.communityId, communityId), inArray(communityMember.role, ["owner", "admin"])));
    await Promise.all(admins.map((a) => notify({ userId: a.userId, actorId: viewer.id, type: "community", communityId, message: "pediu para entrar na comunidade" })));
  }
  return { status };
}

export async function leaveCommunity(viewer: V, communityId: string) {
  const access = await communityAccessFor(communityId, viewer.id);
  if (!access?.memberStatus) return;
  if (access.role === "owner") throw new AppError("VALIDATION", "Transfira a administração antes de sair da comunidade que você criou.");
  if (access.memberStatus === "banned") return;
  await db.transaction(async (tx) => {
    await tx.delete(communityMember).where(and(eq(communityMember.communityId, communityId), eq(communityMember.userId, viewer.id)));
    if (access.memberStatus === "active") await tx.update(community).set({ memberCount: sql`greatest(0, ${community.memberCount} - 1)` }).where(eq(community.id, communityId));
  });
}

async function requireCommunityAdmin(viewer: V, communityId: string) {
  const access = await communityAccessFor(communityId, viewer.id);
  if (!access) throw new AppError("NOT_FOUND");
  const isMod = viewer.role === "admin" || viewer.role === "moderator";
  if (!isMod && (access.memberStatus !== "active" || (access.role !== "owner" && access.role !== "admin"))) throw new AppError("FORBIDDEN");
  return access;
}

export async function moderateMember(viewer: V, communityId: string, userId: string, action: "approve" | "reject" | "ban" | "promote" | "demote") {
  const actor = await requireCommunityAdmin(viewer, communityId);
  const [m] = await db
    .select()
    .from(communityMember)
    .where(and(eq(communityMember.communityId, communityId), eq(communityMember.userId, userId)))
    .limit(1);
  if (!m) throw new AppError("NOT_FOUND");
  if (m.role === "owner") throw new AppError("FORBIDDEN", "A pessoa criadora da comunidade não pode ser alterada.");
  const isPlatformMod = viewer.role === "admin" || viewer.role === "moderator";
  if ((m.role === "admin" || action === "promote") && actor.role !== "owner" && !isPlatformMod) {
    throw new AppError("FORBIDDEN", "Só a pessoa criadora pode promover ou alterar administradores.");
  }
  await db.transaction(async (tx) => {
    const where = and(eq(communityMember.communityId, communityId), eq(communityMember.userId, userId));
    const dec = sql`greatest(0, ${community.memberCount} - 1)`;
    switch (action) {
      case "approve":
        if (m.status !== "pending") return;
        await tx.update(communityMember).set({ status: "active" }).where(where);
        await tx.update(community).set({ memberCount: sql`${community.memberCount} + 1` }).where(eq(community.id, communityId));
        break;
      case "reject":
        await tx.delete(communityMember).where(where);
        if (m.status === "active") await tx.update(community).set({ memberCount: dec }).where(eq(community.id, communityId));
        break;
      case "ban":
        await tx.update(communityMember).set({ status: "banned", role: "member" }).where(where);
        if (m.status === "active") await tx.update(community).set({ memberCount: dec }).where(eq(community.id, communityId));
        break;
      case "promote":
        if (m.status === "active") await tx.update(communityMember).set({ role: "admin" }).where(where);
        break;
      case "demote":
        await tx.update(communityMember).set({ role: "member" }).where(where);
        break;
    }
  });
  if (action === "approve") await notify({ userId, actorId: viewer.id, type: "community", communityId, message: "aprovou sua entrada na comunidade" });
}

export async function removeCommunityPost(viewer: V, communityId: string, postId: string) {
  await requireCommunityAdmin(viewer, communityId);
  const res = await db
    .update(post)
    .set({ status: "removed" })
    .where(and(eq(post.id, postId), eq(post.communityId, communityId)))
    .returning({ id: post.id });
  if (!res.length) throw new AppError("NOT_FOUND");
}

export async function regenerateInvite(viewer: V, communityId: string) {
  await requireCommunityAdmin(viewer, communityId);
  const code = newInviteCode();
  await db.update(community).set({ inviteCode: code }).where(eq(community.id, communityId));
  return code;
}

export async function setCommunityNotify(viewer: V, communityId: string, notifyOn: boolean) {
  await db
    .update(communityMember)
    .set({ notify: notifyOn })
    .where(and(eq(communityMember.communityId, communityId), eq(communityMember.userId, viewer.id)));
}

export async function listMembers(communityId: string, includePending: boolean) {
  return db
    .select({
      userId: communityMember.userId,
      role: communityMember.role,
      status: communityMember.status,
      handle: profile.handle,
      displayName: profile.displayName,
      avatar: profile.avatarMediaId,
    })
    .from(communityMember)
    .innerJoin(profile, eq(profile.userId, communityMember.userId))
    .where(
      and(
        eq(communityMember.communityId, communityId),
        includePending ? inArray(communityMember.status, ["active", "pending"]) : eq(communityMember.status, "active"),
      ),
    )
    .orderBy(sql`case ${communityMember.role} when 'owner' then 0 when 'admin' then 1 else 2 end`, asc(communityMember.joinedAt))
    .limit(200);
}
