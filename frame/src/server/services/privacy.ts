import "server-only";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../db";
import {
  activationEvent,
  aiUsage,
  block,
  challengeSubmission,
  challengeVote,
  collection,
  comment,
  community,
  communityMember,
  follow,
  media,
  mute,
  post,
  profile,
  reaction,
  savedItem,
  showcase,
  tutorial,
  user,
} from "../db/schema";
import { deleteMediaRows } from "./media";

/** Exportação de dados pessoais (LGPD, art. 18). Retorna JSON legível com tudo que é do usuário. */
export async function exportUserData(userId: string) {
  const [u] = await db.select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }).from(user).where(eq(user.id, userId));
  const [p] = await db.select().from(profile).where(eq(profile.userId, userId));
  const posts = await db.select().from(post).where(eq(post.authorId, userId)).orderBy(asc(post.createdAt));
  const postIds = posts.map((x) => x.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const files = await db
    .select({ id: media.id, postId: media.postId, purpose: media.purpose, kind: media.kind, mimeType: media.mimeType, createdAt: media.createdAt })
    .from(media)
    .where(eq(media.ownerId, userId));
  return {
    exportedAt: new Date().toISOString(),
    notice: "Arquivos de mídia podem ser baixados pelos links abaixo enquanto você estiver logado.",
    account: u,
    profile: p,
    posts: posts.map((x) => ({ ...x })),
    showcases: postIds.length ? await db.select().from(showcase).where(inArray(showcase.postId, postIds)) : [],
    tutorials: postIds.length ? await db.select().from(tutorial).where(inArray(tutorial.postId, postIds)) : [],
    media: files.map((f) => ({ ...f, url: `${appUrl}/api/media/${f.id}` })),
    comments: await db.select({ id: comment.id, postId: comment.postId, body: comment.body, createdAt: comment.createdAt }).from(comment).where(eq(comment.authorId, userId)),
    likes: await db.select({ postId: reaction.postId, createdAt: reaction.createdAt }).from(reaction).where(eq(reaction.userId, userId)),
    following: await db.select({ userId: follow.followingId, since: follow.createdAt }).from(follow).where(eq(follow.followerId, userId)),
    followers: await db.select({ userId: follow.followerId, since: follow.createdAt }).from(follow).where(eq(follow.followingId, userId)),
    saved: await db.select().from(savedItem).where(eq(savedItem.userId, userId)),
    collections: await db.select().from(collection).where(eq(collection.ownerId, userId)),
    communities: await db.select().from(communityMember).where(eq(communityMember.userId, userId)),
    challengeSubmissions: await db.select().from(challengeSubmission).where(eq(challengeSubmission.userId, userId)),
    challengeVotes: await db.select().from(challengeVote).where(eq(challengeVote.voterId, userId)),
    blocks: await db.select({ userId: block.blockedId }).from(block).where(eq(block.blockerId, userId)),
    mutes: await db.select({ userId: mute.mutedId }).from(mute).where(eq(mute.muterId, userId)),
    aiUsage: await db.select({ feature: aiUsage.feature, createdAt: aiUsage.createdAt, inputTokens: aiUsage.inputTokens, outputTokens: aiUsage.outputTokens }).from(aiUsage).where(eq(aiUsage.userId, userId)),
    activation: await db.select().from(activationEvent).where(eq(activationEvent.userId, userId)),
  };
}

/**
 * Exclusão definitiva da conta: arquivos no storage + cascata no banco.
 * Comunidades criadas pela pessoa passam para o admin/membro mais antigo.
 * Denúncias feitas por ela ficam anonimizadas (reporter_id = null) para histórico de moderação.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const owned = await db.select({ id: community.id }).from(community).where(eq(community.ownerId, userId));
  for (const c of owned) {
    const [heir] = await db
      .select({ userId: communityMember.userId })
      .from(communityMember)
      .where(and(eq(communityMember.communityId, c.id), ne(communityMember.userId, userId), eq(communityMember.status, "active")))
      .orderBy(sql`case ${communityMember.role} when 'admin' then 0 else 1 end`, asc(communityMember.joinedAt))
      .limit(1);
    if (heir) {
      await db.update(community).set({ ownerId: heir.userId }).where(eq(community.id, c.id));
      await db.update(communityMember).set({ role: "owner" }).where(and(eq(communityMember.communityId, c.id), eq(communityMember.userId, heir.userId)));
    } else {
      await db.delete(community).where(eq(community.id, c.id));
    }
  }

  // Ajusta contadores de quem a pessoa seguia / era seguida.
  await db.execute(sql`update profile set follower_count = greatest(0, follower_count - 1) where user_id in (select following_id from follow where follower_id = ${userId})`);
  await db.execute(sql`update profile set following_count = greatest(0, following_count - 1) where user_id in (select follower_id from follow where following_id = ${userId})`);
  await db.execute(sql`update post set like_count = greatest(0, like_count - 1) where id in (select post_id from reaction where user_id = ${userId})`);
  await db.execute(sql`update post set save_count = greatest(0, save_count - 1) where id in (select post_id from saved_item where user_id = ${userId})`);
  await db.execute(sql`update community set member_count = greatest(0, member_count - 1) where id in (select community_id from community_member where user_id = ${userId} and status = 'active')`);
  await db.execute(sql`update challenge_submission set vote_count = greatest(0, vote_count - 1) where id in (select submission_id from challenge_vote where voter_id = ${userId})`);
  await db.execute(sql`update post set comment_count = greatest(0, comment_count - sub.n) from (select post_id, count(*)::int n from comment where author_id = ${userId} and status = 'published' group by post_id) sub where post.id = sub.post_id`);

  const files = await db.select({ id: media.id, storageKey: media.storageKey, thumbKey: media.thumbKey }).from(media).where(eq(media.ownerId, userId));
  await deleteMediaRows(files);
  await db.delete(user).where(eq(user.id, userId));
}
