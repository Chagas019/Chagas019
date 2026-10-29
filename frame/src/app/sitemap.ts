import type { MetadataRoute } from "next";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { post, profile } from "@/server/db/schema";

export const dynamic = "force-dynamic";

/** Só entram perfis que autorizaram indexação, e apenas seus trabalhos públicos. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const profiles = await db.select({ handle: profile.handle, updatedAt: profile.updatedAt }).from(profile).where(eq(profile.isIndexable, true)).limit(5000);
  const posts = await db
    .select({ id: post.id, updatedAt: post.updatedAt })
    .from(post)
    .innerJoin(profile, eq(profile.userId, post.authorId))
    .where(and(eq(profile.isIndexable, true), eq(post.visibility, "public"), eq(post.status, "published"), isNull(post.communityId)))
    .orderBy(desc(post.createdAt))
    .limit(20000);
  return [
    { url: `${base}/`, changeFrequency: "daily" },
    { url: `${base}/desafios`, changeFrequency: "daily" },
    { url: `${base}/lab`, changeFrequency: "daily" },
    ...profiles.map((p) => ({ url: `${base}/u/${p.handle}`, lastModified: p.updatedAt })),
    ...posts.map((p) => ({ url: `${base}/p/${p.id}`, lastModified: p.updatedAt })),
  ];
}
