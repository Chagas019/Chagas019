import "server-only";
import { sql } from "drizzle-orm";
import { db } from "../db";

/** Números agregados da plataforma, direto do banco. Nada identifica pessoas. */
export async function platformStats() {
  const [totals] = await db.execute<Record<string, number>>(sql`
    select
      (select count(*)::int from "user") as accounts,
      (select count(*)::int from "user" where created_at > now() - interval '1 day') as accounts_24h,
      (select count(*)::int from "user" where created_at > now() - interval '7 days') as accounts_7d,
      (select count(*)::int from "user" where created_at > now() - interval '30 days') as accounts_30d,
      (select count(*)::int from profile where onboarded_at is not null) as onboarded,
      (select count(distinct user_id)::int from session where updated_at > now() - interval '1 day') as active_24h,
      (select count(distinct user_id)::int from session where updated_at > now() - interval '7 days') as active_7d,
      (select count(*)::int from post where status = 'published') as posts,
      (select count(*)::int from post where status = 'published' and created_at > now() - interval '7 days') as posts_7d,
      (select count(distinct author_id)::int from post where status = 'published') as creators,
      (select count(*)::int from post where status = 'draft') as drafts,
      (select count(*)::int from comment where status = 'published') as comments,
      (select count(*)::int from reaction) as likes,
      (select count(*)::int from follow) as follows,
      (select count(*)::int from saved_item) as saves,
      (select count(*)::int from message) as messages,
      (select count(*)::int from challenge_submission) as submissions,
      (select count(*)::int from community) as communities,
      (select count(*)::int from collab_listing) as collabs,
      (select count(*)::int from report where status = 'open') as open_reports`);
  const daily = await db.execute<{ day: string; signups: number; posts: number }>(sql`
    select to_char(d, 'DD/MM') as day,
      (select count(*)::int from "user" u where u.created_at >= d and u.created_at < d + interval '1 day') as signups,
      (select count(*)::int from post p where p.status = 'published' and p.created_at >= d and p.created_at < d + interval '1 day') as posts
    from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') as d
    order by d`);
  return { totals: totals ?? {}, daily: daily.map((r) => ({ day: r.day, signups: Number(r.signups), posts: Number(r.posts) })) };
}
