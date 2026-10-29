import "server-only";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "../db";
import { block, follow, mute } from "../db/schema";

export async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const rows = await db
    .select({ x: sql<number>`1` })
    .from(block)
    .where(or(and(eq(block.blockerId, a), eq(block.blockedId, b)), and(eq(block.blockerId, b), eq(block.blockedId, a))))
    .limit(1);
  return rows.length > 0;
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const rows = await db
    .select({ x: sql<number>`1` })
    .from(follow)
    .where(and(eq(follow.followerId, followerId), eq(follow.followingId, followingId)))
    .limit(1);
  return rows.length > 0;
}

/** IDs que nunca devem aparecer para o usuário: quem ele bloqueou, quem o bloqueou e quem ele silenciou. */
/** Seguidor aprovado: pode ver publicações com visibilidade "só seguidores". */
export async function isApprovedFollower(followerId: string, followingId: string): Promise<boolean> {
  const rows = await db
    .select({ x: sql<number>`1` })
    .from(follow)
    .where(and(eq(follow.followerId, followerId), eq(follow.followingId, followingId), eq(follow.approved, true)))
    .limit(1);
  return rows.length > 0;
}

export async function hiddenAuthorIds(viewerId: string): Promise<string[]> {
  const rows = await db.execute<{ id: string }>(sql`
    select blocked_id as id from block where blocker_id = ${viewerId}
    union select blocker_id from block where blocked_id = ${viewerId}
    union select muted_id from mute where muter_id = ${viewerId}
  `);
  return rows.map((r) => r.id);
}

export async function relationshipState(viewerId: string, otherId: string) {
  const [f, b, m] = await Promise.all([
    isFollowing(viewerId, otherId),
    db.select({ x: sql<number>`1` }).from(block).where(and(eq(block.blockerId, viewerId), eq(block.blockedId, otherId))).limit(1),
    db.select({ x: sql<number>`1` }).from(mute).where(and(eq(mute.muterId, viewerId), eq(mute.mutedId, otherId))).limit(1),
  ]);
  return { following: f, blocked: b.length > 0, muted: m.length > 0 };
}
