import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { block, collection, comment, follow, mute, post, reaction, report, savedItem, tutorial, tutorialRating, profile } from "../db/schema";
import { AppError } from "../errors";
import type { Viewer } from "../session";
import { collectionSchema, commentSchema, fieldErrors, reportSchema } from "@/lib/validation";
import { canInteractWithPost } from "./access";
import { recordActivation } from "./activation";
import { notify } from "./notifications";
import { isBlockedEitherWay } from "./relations";
import { enforceRateLimit } from "../rate-limit";

type V = Pick<Viewer, "id" | "role">;

async function loadInteractablePost(viewer: V, postId: string) {
  const [p] = await db.select().from(post).where(eq(post.id, postId)).limit(1);
  if (!p) throw new AppError("NOT_FOUND");
  if (!(await canInteractWithPost(viewer, p))) throw new AppError("FORBIDDEN");
  return p;
}

export async function toggleLike(viewer: V, postId: string): Promise<{ liked: boolean; count: number }> {
  const p = await loadInteractablePost(viewer, postId);
  await enforceRateLimit(`like:${viewer.id}`, 120, 60);
  const result = await db.transaction(async (tx) => {
    const inserted = await tx.insert(reaction).values({ postId, userId: viewer.id }).onConflictDoNothing().returning({ postId: reaction.postId });
    if (inserted.length === 0) {
      await tx.delete(reaction).where(and(eq(reaction.postId, postId), eq(reaction.userId, viewer.id)));
    }
    const [row] = await tx
      .update(post)
      .set({ likeCount: sql`greatest(0, ${post.likeCount} + ${inserted.length ? 1 : -1})` })
      .where(eq(post.id, postId))
      .returning({ count: post.likeCount });
    return { liked: inserted.length > 0, count: row!.count };
  });
  if (result.liked) await notify({ userId: p.authorId, actorId: viewer.id, type: "like", postId, message: "curtiu seu trabalho" });
  return result;
}

export async function addComment(viewer: V, input: unknown) {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", undefined, fieldErrors(parsed.error));
  const { postId, parentId, body } = parsed.data;
  const p = await loadInteractablePost(viewer, postId);
  await enforceRateLimit(`comment:${viewer.id}`, 20, 60);

  let parentAuthor: string | null = null;
  if (parentId) {
    const [parent] = await db.select({ authorId: comment.authorId, postId: comment.postId }).from(comment).where(eq(comment.id, parentId)).limit(1);
    if (!parent || parent.postId !== postId) throw new AppError("VALIDATION", "Comentário original não encontrado.");
    parentAuthor = parent.authorId;
  }

  const created = await db.transaction(async (tx) => {
    const [c] = await tx.insert(comment).values({ postId, authorId: viewer.id, parentId, body }).returning();
    await tx.update(post).set({ commentCount: sql`${post.commentCount} + 1` }).where(eq(post.id, postId));
    return c!;
  });

  await notify({ userId: p.authorId, actorId: viewer.id, type: "comment", postId, message: "comentou no seu trabalho" });
  if (parentAuthor && parentAuthor !== p.authorId) {
    await notify({ userId: parentAuthor, actorId: viewer.id, type: "reply", postId, message: "respondeu ao seu comentário" });
  }
  return created;
}

/** Autor do comentário ou autor do post podem apagar. */
export async function deleteComment(viewer: V, commentId: string) {
  const [c] = await db
    .select({ id: comment.id, authorId: comment.authorId, postId: comment.postId, postAuthor: post.authorId })
    .from(comment)
    .innerJoin(post, eq(post.id, comment.postId))
    .where(eq(comment.id, commentId))
    .limit(1);
  if (!c) throw new AppError("NOT_FOUND");
  if (c.authorId !== viewer.id && c.postAuthor !== viewer.id) throw new AppError("FORBIDDEN");
  await db.transaction(async (tx) => {
    const removed = await tx.delete(comment).where(eq(comment.id, commentId)).returning({ id: comment.id });
    const replies = await tx.delete(comment).where(eq(comment.parentId, commentId)).returning({ id: comment.id });
    const n = removed.length + replies.length;
    await tx.update(post).set({ commentCount: sql`greatest(0, ${post.commentCount} - ${n})` }).where(eq(post.id, c.postId));
  });
}

export async function setFollow(viewer: V, targetId: string, shouldFollow: boolean): Promise<{ following: boolean }> {
  if (targetId === viewer.id) throw new AppError("VALIDATION", "Você não pode seguir a si mesmo.");
  if (shouldFollow && (await isBlockedEitherWay(viewer.id, targetId))) throw new AppError("FORBIDDEN");
  await enforceRateLimit(`follow:${viewer.id}`, 60, 60);
  const changed = await db.transaction(async (tx) => {
    if (shouldFollow) {
      const ins = await tx.insert(follow).values({ followerId: viewer.id, followingId: targetId }).onConflictDoNothing().returning({ f: follow.followerId });
      if (ins.length) {
        await tx.update(profile).set({ followerCount: sql`${profile.followerCount} + 1` }).where(eq(profile.userId, targetId));
        await tx.update(profile).set({ followingCount: sql`${profile.followingCount} + 1` }).where(eq(profile.userId, viewer.id));
      }
      return ins.length > 0;
    }
    const del = await tx.delete(follow).where(and(eq(follow.followerId, viewer.id), eq(follow.followingId, targetId))).returning({ f: follow.followerId });
    if (del.length) {
      await tx.update(profile).set({ followerCount: sql`greatest(0, ${profile.followerCount} - 1)` }).where(eq(profile.userId, targetId));
      await tx.update(profile).set({ followingCount: sql`greatest(0, ${profile.followingCount} - 1)` }).where(eq(profile.userId, viewer.id));
    }
    return del.length > 0;
  });
  if (shouldFollow && changed) {
    await notify({ userId: targetId, actorId: viewer.id, type: "follow", message: "começou a seguir você" });
    await recordActivation(viewer.id, "first_follow");
  }
  return { following: shouldFollow };
}

async function removeFollowBothWays(a: string, b: string) {
  for (const [x, y] of [[a, b], [b, a]] as const) {
    const del = await db.delete(follow).where(and(eq(follow.followerId, x), eq(follow.followingId, y))).returning({ f: follow.followerId });
    if (del.length) {
      await db.update(profile).set({ followerCount: sql`greatest(0, ${profile.followerCount} - 1)` }).where(eq(profile.userId, y));
      await db.update(profile).set({ followingCount: sql`greatest(0, ${profile.followingCount} - 1)` }).where(eq(profile.userId, x));
    }
  }
}

export async function toggleSave(viewer: V, postId: string, collectionId: string | null = null): Promise<{ saved: boolean }> {
  const p = await loadInteractablePost(viewer, postId);
  if (collectionId) {
    const [c] = await db.select({ ownerId: collection.ownerId }).from(collection).where(eq(collection.id, collectionId)).limit(1);
    if (!c || c.ownerId !== viewer.id) throw new AppError("FORBIDDEN");
  }
  const saved = await db.transaction(async (tx) => {
    const ins = await tx.insert(savedItem).values({ userId: viewer.id, postId, collectionId }).onConflictDoNothing().returning({ p: savedItem.postId });
    if (!ins.length) {
      if (collectionId) {
        await tx.update(savedItem).set({ collectionId }).where(and(eq(savedItem.userId, viewer.id), eq(savedItem.postId, postId)));
        return true;
      }
      await tx.delete(savedItem).where(and(eq(savedItem.userId, viewer.id), eq(savedItem.postId, postId)));
    }
    await tx.update(post).set({ saveCount: sql`greatest(0, ${post.saveCount} + ${ins.length ? 1 : -1})` }).where(eq(post.id, postId));
    return ins.length > 0;
  });
  if (saved && p.kind === "tutorial") await recordActivation(viewer.id, "first_tutorial_saved");
  return { saved };
}

export async function createCollection(viewer: V, input: unknown) {
  const parsed = collectionSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", undefined, fieldErrors(parsed.error));
  const count = await db.select({ n: sql<number>`count(*)::int` }).from(collection).where(eq(collection.ownerId, viewer.id));
  if ((count[0]?.n ?? 0) >= 50) throw new AppError("VALIDATION", "Limite de 50 coleções atingido.");
  const [c] = await db.insert(collection).values({ ownerId: viewer.id, ...parsed.data }).returning();
  return c!;
}

export async function deleteCollection(viewer: V, id: string) {
  const res = await db.delete(collection).where(and(eq(collection.id, id), eq(collection.ownerId, viewer.id))).returning({ id: collection.id });
  if (!res.length) throw new AppError("FORBIDDEN");
}

export async function listCollections(ownerId: string, onlyPublic: boolean) {
  return db
    .select({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      isPublic: collection.isPublic,
      count: sql<number>`(select count(*)::int from saved_item s where s.collection_id = ${collection.id})`,
    })
    .from(collection)
    .where(and(eq(collection.ownerId, ownerId), onlyPublic ? eq(collection.isPublic, true) : undefined))
    .orderBy(desc(collection.createdAt));
}

export async function setBlock(viewer: V, targetId: string, shouldBlock: boolean) {
  if (targetId === viewer.id) throw new AppError("VALIDATION", "Você não pode bloquear a si mesmo.");
  if (shouldBlock) {
    await db.insert(block).values({ blockerId: viewer.id, blockedId: targetId }).onConflictDoNothing();
    await removeFollowBothWays(viewer.id, targetId);
  } else {
    await db.delete(block).where(and(eq(block.blockerId, viewer.id), eq(block.blockedId, targetId)));
  }
}

export async function setMute(viewer: V, targetId: string, shouldMute: boolean) {
  if (targetId === viewer.id) throw new AppError("VALIDATION");
  if (shouldMute) await db.insert(mute).values({ muterId: viewer.id, mutedId: targetId }).onConflictDoNothing();
  else await db.delete(mute).where(and(eq(mute.muterId, viewer.id), eq(mute.mutedId, targetId)));
}

export async function createReport(viewer: V, input: unknown) {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", undefined, fieldErrors(parsed.error));
  await enforceRateLimit(`report:${viewer.id}`, 10, 3600);
  const existing = await db
    .select({ id: report.id })
    .from(report)
    .where(and(eq(report.reporterId, viewer.id), eq(report.targetType, parsed.data.targetType), eq(report.targetId, parsed.data.targetId), eq(report.status, "open")))
    .limit(1);
  if (existing.length) return existing[0]!;
  const [r] = await db.insert(report).values({ reporterId: viewer.id, ...parsed.data }).returning({ id: report.id });
  return r!;
}

export async function rateTutorial(viewer: V, postId: string, helpful: boolean) {
  const p = await loadInteractablePost(viewer, postId);
  if (p.kind !== "tutorial") throw new AppError("VALIDATION");
  if (p.authorId === viewer.id) throw new AppError("VALIDATION", "Você não pode avaliar o próprio tutorial.");
  await db.transaction(async (tx) => {
    await tx
      .insert(tutorialRating)
      .values({ postId, userId: viewer.id, helpful })
      .onConflictDoUpdate({ target: [tutorialRating.postId, tutorialRating.userId], set: { helpful } });
    await tx
      .update(tutorial)
      .set({ helpfulCount: sql`(select count(*)::int from tutorial_rating where post_id = ${postId} and helpful)` })
      .where(eq(tutorial.postId, postId));
  });
}
