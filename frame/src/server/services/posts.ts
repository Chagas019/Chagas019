import "server-only";
import { and, asc, desc, eq, gt, inArray, isNull, lt, lte, notInArray, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { comment, community, communityMember, media, post, profile, showcase, tutorial, user } from "../db/schema";
import { AppError } from "../errors";
import type { Viewer } from "../session";
import { fieldErrors, postSchema } from "@/lib/validation";
import { rankFeed, type RankCandidate } from "@/lib/ranking";
import type { FeedFilter } from "@/lib/taxonomy";
import { canViewPost, communityAccessFor } from "./access";
import { recordActivation } from "./activation";
import { deleteMediaRows } from "./media";
import { notify } from "./notifications";
import { hiddenAuthorIds } from "./relations";

const MAX_MEDIA = 10;

/* ------------------------------------------------------------------ */
/* Criação                                                             */
/* ------------------------------------------------------------------ */

export async function createPost(
  viewer: Pick<Viewer, "id">,
  input: unknown,
  files: { mediaIds: string[]; beforeMediaId?: string | null },
): Promise<{ id: string }> {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", undefined, fieldErrors(parsed.error));
  const data = parsed.data;

  const mediaIds = [...new Set(files.mediaIds)].slice(0, MAX_MEDIA);
  if (data.kind !== "discussion" && data.kind !== "tutorial" && mediaIds.length === 0) {
    throw new AppError("VALIDATION", "Adicione pelo menos uma imagem ou vídeo.", { media: "Adicione pelo menos uma imagem ou vídeo." });
  }
  const allIds = files.beforeMediaId ? [...mediaIds, files.beforeMediaId] : mediaIds;

  if (data.communityId) {
    const c = await communityAccessFor(data.communityId, viewer.id);
    if (!c || c.status === "removed" || c.memberStatus !== "active") {
      throw new AppError("FORBIDDEN", "Entre na comunidade para publicar nela.");
    }
  }

  const postId = await db.transaction(async (tx) => {
    // Só aceita mídias do próprio usuário que ainda não pertencem a nenhum post.
    if (allIds.length) {
      const owned = await tx
        .select({ id: media.id, kind: media.kind })
        .from(media)
        .where(and(inArray(media.id, allIds), eq(media.ownerId, viewer.id), isNull(media.postId)));
      if (owned.length !== allIds.length) throw new AppError("FORBIDDEN", "Uma das mídias não pertence a você ou já foi usada.");
    }

    const [created] = await tx
      .insert(post)
      .values({
        authorId: viewer.id,
        kind: data.kind,
        format: data.format,
        title: data.title,
        body: data.body,
        categories: data.categories,
        tools: data.tools,
        visibility: data.visibility,
        isCollaborative: data.isCollaborative,
        communityId: data.communityId,
      })
      .returning({ id: post.id });
    const id = created!.id;

    for (const [index, mediaId] of mediaIds.entries()) {
      await tx
        .update(media)
        .set({ postId: id, position: index, purpose: "post", alt: data.alts[index] ?? "" })
        .where(eq(media.id, mediaId));
    }

    if (data.kind === "showcase" && data.showcase) {
      if (files.beforeMediaId) {
        await tx.update(media).set({ postId: id, purpose: "showcase_before", position: 999 }).where(eq(media.id, files.beforeMediaId));
      }
      await tx.insert(showcase).values({
        postId: id,
        ...data.showcase,
        beforeMediaId: files.beforeMediaId ?? null,
        afterMediaId: mediaIds[0] ?? null,
      });
    }
    if (data.kind === "tutorial" && data.tutorial) {
      await tx.insert(tutorial).values({ postId: id, ...data.tutorial });
    }
    return id;
  });

  await recordActivation(viewer.id, "first_post");
  return { id: postId };
}

export async function deletePost(viewer: Pick<Viewer, "id" | "role">, postId: string) {
  const [p] = await db.select({ authorId: post.authorId }).from(post).where(eq(post.id, postId)).limit(1);
  if (!p) throw new AppError("NOT_FOUND");
  if (p.authorId !== viewer.id) throw new AppError("FORBIDDEN");
  const files = await db
    .select({ id: media.id, storageKey: media.storageKey, thumbKey: media.thumbKey })
    .from(media)
    .where(eq(media.postId, postId));
  await db.delete(post).where(eq(post.id, postId));
  await deleteMediaRows(files);
}

export async function updatePostVisibility(viewer: Pick<Viewer, "id">, postId: string, v: "public" | "followers" | "private") {
  const res = await db
    .update(post)
    .set({ visibility: v })
    .where(and(eq(post.id, postId), eq(post.authorId, viewer.id)))
    .returning({ id: post.id });
  if (!res.length) throw new AppError("FORBIDDEN");
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

/**
 * Condição SQL de visibilidade para listagens — espelha `canViewPost`.
 * Mantenha as duas em sincronia (coberto por testes de integração).
 */
export function visibleToViewer(viewerId: string | null): SQL {
  const base = sql`${post.status} = 'published'`;
  const community = sql`(${post.communityId} is null or exists (
      select 1 from community c where c.id = ${post.communityId} and c.status = 'published' and (
        c.access = 'public' ${viewerId ? sql`or exists (select 1 from community_member m where m.community_id = c.id and m.user_id = ${viewerId} and m.status = 'active')` : sql``}
      ) ${viewerId ? sql`and not exists (select 1 from community_member mb where mb.community_id = c.id and mb.user_id = ${viewerId} and mb.status = 'banned')` : sql``}))`;
  if (!viewerId) return sql`(${base} and ${post.visibility} = 'public' and ${community})`;
  return sql`(${base} and ${community} and (
      ${post.authorId} = ${viewerId}
      or ${post.visibility} = 'public'
      or (${post.visibility} = 'followers' and exists (select 1 from follow f where f.follower_id = ${viewerId} and f.following_id = ${post.authorId} and f.approved))
    ) and not exists (
      select 1 from block b where (b.blocker_id = ${viewerId} and b.blocked_id = ${post.authorId}) or (b.blocker_id = ${post.authorId} and b.blocked_id = ${viewerId})
    ))`;
}

const coverIdSql = sql<string | null>`(select m.id from media m where m.post_id = ${post.id} and m.purpose = 'post' order by m.position limit 1)`;
const coverKindSql = sql<"image" | "video" | null>`(select m.kind from media m where m.post_id = ${post.id} and m.purpose = 'post' order by m.position limit 1)`;
const coverAltSql = sql<string | null>`(select m.alt from media m where m.post_id = ${post.id} and m.purpose = 'post' order by m.position limit 1)`;
const coverWidthSql = sql<number | null>`(select m.width from media m where m.post_id = ${post.id} and m.purpose = 'post' order by m.position limit 1)`;
const coverHeightSql = sql<number | null>`(select m.height from media m where m.post_id = ${post.id} and m.purpose = 'post' order by m.position limit 1)`;
const mediaCountSql = sql<number>`(select count(*)::int from media m where m.post_id = ${post.id} and m.purpose = 'post')`;

function viewerFlags(viewerId: string | null) {
  if (!viewerId) return { liked: sql<boolean>`false`, saved: sql<boolean>`false` };
  return {
    liked: sql<boolean>`exists (select 1 from reaction r where r.post_id = ${post.id} and r.user_id = ${viewerId})`,
    saved: sql<boolean>`exists (select 1 from saved_item s where s.post_id = ${post.id} and s.user_id = ${viewerId})`,
  };
}

function cardSelect(viewerId: string | null) {
  return {
    id: post.id,
    kind: post.kind,
    format: post.format,
    title: post.title,
    body: post.body,
    categories: post.categories,
    tools: post.tools,
    visibility: post.visibility,
    isCollaborative: post.isCollaborative,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    saveCount: post.saveCount,
    createdAt: post.createdAt,
    communityId: post.communityId,
    authorId: post.authorId,
    authorHandle: profile.handle,
    authorName: profile.displayName,
    authorAvatar: profile.avatarMediaId,
    authorFollowers: profile.followerCount,
    authorCreatedAt: user.createdAt,
    coverId: coverIdSql,
    coverKind: coverKindSql,
    coverAlt: coverAltSql,
    coverWidth: coverWidthSql,
    coverHeight: coverHeightSql,
    mediaCount: mediaCountSql,
    hasBefore: sql<boolean>`exists (select 1 from showcase sc where sc.post_id = ${post.id} and sc.before_media_id is not null)`,
    tutorialLevel: tutorial.level,
    tutorialMinutes: tutorial.durationMinutes,
    tutorialTopic: tutorial.topic,
    ...viewerFlags(viewerId),
  };
}

export type PostCard = Awaited<ReturnType<typeof queryCards>>[number];

async function queryCards(viewerId: string | null, where: SQL | undefined, opts: { limit: number; order?: "recent" | "none" }) {
  const q = db
    .select(cardSelect(viewerId))
    .from(post)
    .innerJoin(profile, eq(profile.userId, post.authorId))
    .innerJoin(user, eq(user.id, post.authorId))
    .leftJoin(tutorial, eq(tutorial.postId, post.id))
    .where(and(visibleToViewer(viewerId), where))
    .limit(opts.limit);
  return opts.order === "none" ? q : q.orderBy(desc(post.createdAt), desc(post.id));
}

export async function listCards(viewerId: string | null, where: SQL | undefined, limit = 30): Promise<PostCard[]> {
  const rows = await queryCards(viewerId, where, { limit });
  return rows.map(normalizeCard);
}

function normalizeCard<T extends { createdAt: Date | string; authorCreatedAt: Date | string }>(r: T): T & { createdAt: Date; authorCreatedAt: Date } {
  return { ...r, createdAt: new Date(r.createdAt), authorCreatedAt: new Date(r.authorCreatedAt) };
}

export type FeedPage = { items: PostCard[]; nextCursor: string | null };

const PAGE = 24;

/** Feed "Inspiração" com filtros. Exclui autores bloqueados/silenciados e conteúdo de comunidades fechadas. */
export async function getFeed(viewer: Pick<Viewer, "id"> | null, filter: FeedFilter, cursor: string | null): Promise<FeedPage> {
  const viewerId = viewer?.id ?? null;
  const hidden = viewerId ? await hiddenAuthorIds(viewerId) : [];
  const notHidden = hidden.length ? notInArray(post.authorId, hidden) : undefined;
  const onlyOpenSpaces = sql`${post.communityId} is null`;

  if (filter === "para-voce") {
    // Candidatos recentes (30 dias) → ranking em memória → página por offset.
    const offset = Math.max(0, Number(cursor ?? 0) || 0);
    const since = new Date(Date.now() - 30 * 86_400_000);
    const candidates = (await queryCards(viewerId, and(notHidden, onlyOpenSpaces, gt(post.createdAt, since), sql`${post.kind} <> 'discussion'`), { limit: 400 })).map(normalizeCard);
    let interests: string[] = [];
    let followingIds = new Set<string>();
    if (viewerId) {
      const [p] = await db.select({ interests: profile.interests }).from(profile).where(eq(profile.userId, viewerId)).limit(1);
      interests = p?.interests ?? [];
      const f = await db.execute<{ id: string }>(sql`select following_id as id from follow where follower_id = ${viewerId}`);
      followingIds = new Set(f.map((r) => r.id));
    }
    const ranked = rankFeed(candidates as (PostCard & RankCandidate)[], { now: new Date(), interests, followingIds });
    // Completa com conteúdo mais antigo quando os recentes acabam.
    let items = ranked.slice(offset, offset + PAGE);
    if (items.length < PAGE && offset + items.length >= ranked.length) {
      const older = await listCards(viewerId, and(notHidden, onlyOpenSpaces, lte(post.createdAt, since), sql`${post.kind} <> 'discussion'`), PAGE - items.length);
      items = items.concat(offset === 0 || items.length > 0 ? older : []);
      return { items, nextCursor: null };
    }
    return { items, nextCursor: offset + PAGE < ranked.length ? String(offset + PAGE) : null };
  }

  const conditions: (SQL | undefined)[] = [notHidden, onlyOpenSpaces, sql`${post.kind} <> 'discussion'`];
  if (cursor) {
    const d = new Date(cursor);
    if (!Number.isNaN(d.getTime())) conditions.push(lt(post.createdAt, d));
  }
  switch (filter) {
    case "seguindo":
      if (!viewerId) return { items: [], nextCursor: null };
      conditions.push(sql`exists (select 1 from follow f where f.follower_id = ${viewerId} and f.following_id = ${post.authorId})`);
      break;
    case "tutoriais":
      conditions.push(eq(post.kind, "tutorial"));
      break;
    case "antes-e-depois":
      conditions.push(sql`(${post.format} = 'before_after' or exists (select 1 from showcase sc where sc.post_id = ${post.id} and sc.before_media_id is not null))`);
      break;
    case "colaborativos":
      conditions.push(eq(post.isCollaborative, true));
      break;
    default:
      conditions.push(sql`${post.categories} @> array[${filter}]::text[]`);
  }
  const items = await listCards(viewerId, and(...conditions), PAGE);
  const last = items[items.length - 1];
  return { items, nextCursor: items.length === PAGE && last ? last.createdAt.toISOString() : null };
}

export async function getPostDetail(viewer: Pick<Viewer, "id" | "role"> | null, postId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(postId)) return null;
  const [p] = await db.select().from(post).where(eq(post.id, postId)).limit(1);
  if (!p || !(await canViewPost(viewer, p))) return null;

  const [author] = await db
    .select({
      id: profile.userId,
      handle: profile.handle,
      displayName: profile.displayName,
      avatarMediaId: profile.avatarMediaId,
      specialties: profile.specialties,
      followerCount: profile.followerCount,
      isIndexable: profile.isIndexable,
    })
    .from(profile)
    .where(eq(profile.userId, p.authorId))
    .limit(1);

  const files = await db
    .select({ id: media.id, kind: media.kind, width: media.width, height: media.height, alt: media.alt, purpose: media.purpose, mimeType: media.mimeType })
    .from(media)
    .where(eq(media.postId, postId))
    .orderBy(asc(media.position));

  const [sc] = p.kind === "showcase" ? await db.select().from(showcase).where(eq(showcase.postId, postId)).limit(1) : [];
  const [tut] = p.kind === "tutorial" ? await db.select().from(tutorial).where(eq(tutorial.postId, postId)).limit(1) : [];
  const [comm] = p.communityId
    ? await db.select({ slug: community.slug, name: community.name }).from(community).where(eq(community.id, p.communityId)).limit(1)
    : [];

  let liked = false;
  let saved = false;
  let helpfulVote: boolean | null = null;
  if (viewer) {
    const flags = await db.execute<{ liked: boolean; saved: boolean; helpful: boolean | null }>(sql`
      select exists (select 1 from reaction where post_id = ${postId} and user_id = ${viewer.id}) as liked,
             exists (select 1 from saved_item where post_id = ${postId} and user_id = ${viewer.id}) as saved,
             (select helpful from tutorial_rating where post_id = ${postId} and user_id = ${viewer.id}) as helpful
    `);
    liked = Boolean(flags[0]?.liked);
    saved = Boolean(flags[0]?.saved);
    helpfulVote = flags[0]?.helpful ?? null;
  }

  return {
    post: p,
    author: author!,
    media: files.filter((f) => f.purpose === "post"),
    before: files.find((f) => f.purpose === "showcase_before") ?? null,
    showcase: sc ?? null,
    tutorial: tut ?? null,
    community: comm ?? null,
    liked,
    saved,
    helpfulVote,
  };
}

export async function listComments(viewer: Pick<Viewer, "id"> | null, postId: string) {
  const hidden = viewer ? await hiddenAuthorIds(viewer.id) : [];
  const rows = await db
    .select({
      id: comment.id,
      parentId: comment.parentId,
      body: comment.body,
      createdAt: comment.createdAt,
      authorId: comment.authorId,
      authorHandle: profile.handle,
      authorName: profile.displayName,
      authorAvatar: profile.avatarMediaId,
    })
    .from(comment)
    .innerJoin(profile, eq(profile.userId, comment.authorId))
    .where(and(eq(comment.postId, postId), eq(comment.status, "published"), hidden.length ? notInArray(comment.authorId, hidden) : undefined))
    .orderBy(asc(comment.createdAt))
    .limit(300);
  return rows;
}

export async function listUserCards(viewerId: string | null, authorId: string, limit = 60) {
  return listCards(viewerId, and(eq(post.authorId, authorId), sql`${post.kind} <> 'discussion'`), limit);
}

export async function listCommunityPosts(viewerId: string | null, communityId: string, kind?: "discussion" | "tutorial") {
  return listCards(viewerId, and(eq(post.communityId, communityId), kind ? eq(post.kind, kind) : undefined), 60);
}

/** Notifica seguidores? Não — o FRAME não envia notificação de "novo post" para não gerar ruído. */
export async function notifyCommunityPost(communityId: string, authorId: string, postId: string) {
  const admins = await db
    .select({ userId: communityMember.userId })
    .from(communityMember)
    .where(and(eq(communityMember.communityId, communityId), inArray(communityMember.role, ["owner", "admin"]), eq(communityMember.notify, true)));
  await Promise.all(admins.map((a) => notify({ userId: a.userId, actorId: authorId, type: "community", communityId, postId, message: "publicou na sua comunidade" })));
}
