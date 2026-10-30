import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { community, communityMember, post } from "../db/schema";
import type { Viewer } from "../session";
import { isApprovedFollower, isBlockedEitherWay } from "./relations";

type PostLike = Pick<typeof post.$inferSelect, "authorId" | "visibility" | "status" | "communityId">;
type ViewerLike = Pick<Viewer, "id" | "role"> | null;

export type CommunityAccess = { access: "public" | "private" | "invite"; status: "published" | "removed" | "draft"; memberStatus: "active" | "pending" | "banned" | null; role: "owner" | "admin" | "member" | null };

export async function communityAccessFor(communityId: string, viewerId: string | null): Promise<CommunityAccess | null> {
  const [c] = await db.select({ access: community.access, status: community.status }).from(community).where(eq(community.id, communityId)).limit(1);
  if (!c) return null;
  let memberStatus: CommunityAccess["memberStatus"] = null;
  let role: CommunityAccess["role"] = null;
  if (viewerId) {
    const [m] = await db
      .select({ status: communityMember.status, role: communityMember.role })
      .from(communityMember)
      .where(and(eq(communityMember.communityId, communityId), eq(communityMember.userId, viewerId)))
      .limit(1);
    memberStatus = m?.status ?? null;
    role = m?.role ?? null;
  }
  return { ...c, memberStatus, role };
}

export function canReadCommunityContent(c: CommunityAccess, isMod: boolean): boolean {
  if (isMod) return true;
  if (c.status !== "published") return false;
  if (c.memberStatus === "banned") return false;
  return c.access === "public" || c.memberStatus === "active";
}

/**
 * Regra única de visibilidade de uma publicação. Usada pelas páginas, pelas ações
 * (curtir, comentar, salvar…) e pela rota que entrega arquivos de mídia.
 */
export async function canViewPost(viewer: ViewerLike, p: PostLike): Promise<boolean> {
  const isMod = viewer?.role === "admin" || viewer?.role === "moderator";
  const isAuthor = viewer?.id === p.authorId;
  if (p.status === "draft") return isAuthor;
  if (p.status === "removed") return isAuthor || isMod;
  if (isAuthor || isMod) return true;
  if (viewer && (await isBlockedEitherWay(viewer.id, p.authorId))) return false;
  if (p.visibility === "private") return false;
  if (p.visibility === "followers" && (!viewer || !(await isApprovedFollower(viewer.id, p.authorId)))) return false;
  if (p.communityId) {
    const c = await communityAccessFor(p.communityId, viewer?.id ?? null);
    if (!c || !canReadCommunityContent(c, false)) return false;
  }
  return true;
}

/** Interações (curtir, comentar…) exigem poder ver o post e não estar removido. */
export async function canInteractWithPost(viewer: ViewerLike, p: PostLike): Promise<boolean> {
  if (!viewer || p.status !== "published") return false;
  return canViewPost(viewer, p);
}
