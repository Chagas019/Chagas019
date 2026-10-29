import "server-only";
import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import { db } from "../db";
import { profile, user } from "../db/schema";
import { hiddenAuthorIds } from "./relations";

export type CreatorCard = {
  userId: string;
  handle: string;
  displayName: string;
  avatarMediaId: string | null;
  specialties: string[];
  followerCount: number;
  availableForWork: boolean;
  isNew: boolean;
  previews: string[];
  following: boolean;
};

/**
 * Critérios transparentes de "Novos talentos" (exibidos na página):
 * - conta com menos de 45 dias OU menos de 50 seguidores;
 * - pelo menos 1 trabalho público publicado;
 * - nenhuma remoção por moderação nos últimos 30 dias;
 * - a ordem muda todo dia (rotação determinística), sem pagar por destaque.
 */
export const NEW_TALENT_CRITERIA = [
  "Conta com menos de 45 dias ou com menos de 50 seguidores.",
  "Pelo menos um trabalho público publicado.",
  "Sem conteúdo removido pela moderação nos últimos 30 dias.",
  "A ordem muda diariamente para dar visibilidade a mais gente. Destaque não é pago.",
];

async function creators(viewerId: string | null, opts: { newOnly?: boolean; specialty?: string; interests?: string[]; limit: number }): Promise<CreatorCard[]> {
  const hidden = viewerId ? await hiddenAuthorIds(viewerId) : [];
  const exclude = viewerId ? [viewerId, ...hidden] : [];
  const isNew = sql<boolean>`(${user.createdAt} > now() - interval '45 days' or ${profile.followerCount} < 50)`;
  const hasPublicWork = sql`exists (select 1 from post p where p.author_id = ${profile.userId} and p.status = 'published' and p.visibility = 'public' and p.community_id is null and p.kind <> 'discussion')`;
  const noRecentRemoval = sql`not exists (select 1 from post p where p.author_id = ${profile.userId} and p.status = 'removed' and p.updated_at > now() - interval '30 days')`;
  const interestOverlap = opts.interests?.length
    ? sql<number>`cardinality(array(select unnest(${profile.interests}) intersect select unnest(${sql.param(opts.interests)}::text[])))`
    : sql<number>`0`;

  const rows = await db
    .select({
      userId: profile.userId,
      handle: profile.handle,
      displayName: profile.displayName,
      avatarMediaId: profile.avatarMediaId,
      specialties: profile.specialties,
      followerCount: profile.followerCount,
      availableForWork: profile.availableForWork,
      isNew,
      previews: sql<string[]>`array(select m.id from media m join post p on p.id = m.post_id where p.author_id = ${profile.userId} and p.status = 'published' and p.visibility = 'public' and p.community_id is null and m.purpose = 'post' and m.kind = 'image' and m.position = 0 order by p.created_at desc limit 3)`,
      following: viewerId
        ? sql<boolean>`exists (select 1 from follow f where f.follower_id = ${viewerId} and f.following_id = ${profile.userId})`
        : sql<boolean>`false`,
    })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(
      and(
        hasPublicWork,
        noRecentRemoval,
        exclude.length ? notInArray(profile.userId, exclude) : undefined,
        opts.newOnly ? isNew : undefined,
        opts.specialty ? sql`${profile.specialties} @> array[${opts.specialty}]::text[]` : undefined,
      ),
    )
    .orderBy(
      ...(opts.newOnly
        ? [sql`md5(${profile.userId} || current_date::text)`]
        : [desc(interestOverlap), sql`md5(${profile.userId} || current_date::text)`]),
    )
    .limit(opts.limit);
  return rows;
}

export function newTalents(viewerId: string | null, limit = 12) {
  return creators(viewerId, { newOnly: true, limit });
}

export function creatorsBySpecialty(viewerId: string | null, specialty: string, limit = 24) {
  return creators(viewerId, { specialty, limit });
}

/** Sugestões para quem acabou de chegar: afinidade de interesses + rotação, sem ranking por seguidores. */
export async function suggestedCreators(viewerId: string, limit = 9) {
  const [p] = await db.select({ interests: profile.interests }).from(profile).where(eq(profile.userId, viewerId)).limit(1);
  return creators(viewerId, { interests: p?.interests ?? [], limit });
}

/** Hashtags mais usadas em publicações públicas no período (contagem real, nunca estimada). */
export async function trendingTags(days = 7, limit = 12): Promise<{ tag: string; posts: number }[]> {
  const rows = await db.execute<{ tag: string; posts: number }>(sql`
    select t.tag, count(*)::int as posts
    from post p, unnest(p.tags) as t(tag)
    where p.status = 'published' and p.visibility = 'public' and p.community_id is null
      and p.created_at > now() - make_interval(days => ${days})
    group by t.tag
    order by posts desc, max(p.created_at) desc
    limit ${limit}`);
  return rows.map((r) => ({ tag: r.tag, posts: Number(r.posts) }));
}

/** Busca de pessoas por @usuário, nome ou especialidade. */
export async function searchPeople(viewerId: string | null, q: string, limit = 12): Promise<CreatorCard[]> {
  const term = q.trim().replace(/^@/, "");
  if (term.length < 2 || term.startsWith("#")) return [];
  const hidden = viewerId ? await hiddenAuthorIds(viewerId) : [];
  const like = `%${term.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
  const rows = await db
    .select({
      userId: profile.userId,
      handle: profile.handle,
      displayName: profile.displayName,
      avatarMediaId: profile.avatarMediaId,
      specialties: profile.specialties,
      followerCount: profile.followerCount,
      availableForWork: profile.availableForWork,
      isNew: sql<boolean>`(${user.createdAt} > now() - interval '45 days' or ${profile.followerCount} < 50)`,
      previews: sql<string[]>`array(select m.id from media m join post p on p.id = m.post_id where p.author_id = ${profile.userId} and p.status = 'published' and p.visibility = 'public' and p.community_id is null and m.purpose = 'post' and m.kind = 'image' and m.position = 0 order by p.created_at desc limit 3)`,
      following: viewerId
        ? sql<boolean>`exists (select 1 from follow f where f.follower_id = ${viewerId} and f.following_id = ${profile.userId})`
        : sql<boolean>`false`,
    })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(
      and(
        sql`${profile.onboardedAt} is not null`,
        sql`(${profile.handle} ilike ${like} or ${profile.displayName} ilike ${like} or array_to_string(${profile.specialties}, ' ') ilike ${like})`,
        hidden.length ? notInArray(profile.userId, hidden) : undefined,
      ),
    )
    .orderBy(sql`(${profile.handle} = ${term.toLowerCase()}) desc`, sql`(${profile.handle} ilike ${term.toLowerCase() + "%"}) desc`, desc(profile.followerCount))
    .limit(limit);
  return rows;
}

/** Ferramentas mais citadas em trabalhos públicos (contagem real). */
export async function popularTools(limit = 14): Promise<{ tool: string; posts: number }[]> {
  const rows = await db.execute<{ tool: string; posts: number }>(sql`
    select min(t.tool) as tool, count(*)::int as posts
    from post p, unnest(p.tools) as t(tool)
    where p.status = 'published' and p.visibility = 'public' and p.community_id is null
    group by lower(t.tool)
    order by posts desc
    limit ${limit}`);
  return rows.map((r) => ({ tool: r.tool, posts: Number(r.posts) }));
}

/** Coleções públicas com pelo menos 3 trabalhos públicos — curadoria feita pela comunidade. */
export async function themedCollections(limit = 6) {
  return db.execute<{ id: string; name: string; description: string; owner_handle: string; owner_name: string; items: number; covers: string[] }>(sql`
    select c.id, c.name, c.description, pr.handle as owner_handle, pr.display_name as owner_name,
      (select count(*)::int from saved_item s join post p on p.id = s.post_id where s.collection_id = c.id and p.status = 'published' and p.visibility = 'public') as items,
      array(select m.id from saved_item s join post p on p.id = s.post_id join media m on m.post_id = p.id
            where s.collection_id = c.id and p.status = 'published' and p.visibility = 'public' and m.purpose = 'post' and m.kind = 'image' and m.position = 0
            order by s.created_at desc limit 3) as covers
    from collection c join profile pr on pr.user_id = c.owner_id
    where c.is_public
    order by items desc, c.created_at desc
    limit ${limit * 3}`).then((rows) => rows.filter((r) => Number(r.items) >= 3).slice(0, limit));
}
