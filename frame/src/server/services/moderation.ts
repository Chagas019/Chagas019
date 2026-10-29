import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { collabListing, comment, community, moderationLog, post, profile, report } from "../db/schema";
import { AppError } from "../errors";
import { isModerator, type Viewer } from "../session";

type V = Pick<Viewer, "id" | "role">;

export async function listReports(viewer: V, status: "open" | "resolved" | "dismissed" = "open") {
  if (!isModerator(viewer)) throw new AppError("FORBIDDEN");
  const rows = await db
    .select({
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      details: report.details,
      status: report.status,
      createdAt: report.createdAt,
      reporterHandle: profile.handle,
      // Quantas denúncias abertas o mesmo alvo acumula (ajuda a priorizar).
      sameTarget: sql<number>`(select count(*)::int from report r2 where r2.target_type = ${report.targetType} and r2.target_id = ${report.targetId} and r2.status = 'open')`,
    })
    .from(report)
    .leftJoin(profile, eq(profile.userId, report.reporterId))
    .where(eq(report.status, status))
    .orderBy(desc(sql`case ${report.reason} when 'copyright' then 2 when 'harassment' then 2 when 'hate' then 2 else 1 end`), desc(report.createdAt))
    .limit(100);

  // Prévia curta do alvo para decisão (sem copiar conteúdo para logs).
  return Promise.all(
    rows.map(async (r) => {
      let preview: { label: string; href: string | null; status?: string } = { label: "(conteúdo não encontrado)", href: null };
      if (r.targetType === "post") {
        const [p] = await db.select({ title: post.title, status: post.status }).from(post).where(eq(post.id, r.targetId)).limit(1);
        if (p) preview = { label: p.title, href: `/p/${r.targetId}`, status: p.status };
      } else if (r.targetType === "comment") {
        const [c] = await db.select({ body: comment.body, postId: comment.postId, status: comment.status }).from(comment).where(eq(comment.id, r.targetId)).limit(1);
        if (c) preview = { label: c.body.slice(0, 200), href: `/p/${c.postId}`, status: c.status };
      } else if (r.targetType === "user") {
        const [u] = await db.select({ handle: profile.handle }).from(profile).where(eq(profile.userId, r.targetId)).limit(1);
        if (u) preview = { label: `@${u.handle}`, href: `/u/${u.handle}` };
      } else if (r.targetType === "collab") {
        const [l] = await db.select({ title: collabListing.title, status: collabListing.status }).from(collabListing).where(eq(collabListing.id, r.targetId)).limit(1);
        if (l) preview = { label: l.title, href: `/collab/${r.targetId}`, status: l.status };
      } else {
        const [c] = await db.select({ name: community.name, slug: community.slug, status: community.status }).from(community).where(eq(community.id, r.targetId)).limit(1);
        if (c) preview = { label: c.name, href: `/comunidades/${c.slug}`, status: c.status };
      }
      return { ...r, preview };
    }),
  );
}

/**
 * Resolve uma denúncia. "remove" oculta o conteúdo (status removed) — o autor continua vendo,
 * com aviso, e pode exportar seus dados. Todas as denúncias abertas do mesmo alvo são fechadas juntas.
 */
export async function resolveReport(viewer: V, reportId: string, action: "remove" | "dismiss", note = "") {
  if (!isModerator(viewer)) throw new AppError("FORBIDDEN");
  const [r] = await db.select().from(report).where(eq(report.id, reportId)).limit(1);
  if (!r) throw new AppError("NOT_FOUND");
  await db.transaction(async (tx) => {
    if (action === "remove") {
      if (r.targetType === "post") await tx.update(post).set({ status: "removed" }).where(eq(post.id, r.targetId));
      else if (r.targetType === "comment") {
        const [c] = await tx.update(comment).set({ status: "removed" }).where(and(eq(comment.id, r.targetId), eq(comment.status, "published"))).returning({ postId: comment.postId });
        if (c) await tx.update(post).set({ commentCount: sql`greatest(0, ${post.commentCount} - 1)` }).where(eq(post.id, c.postId));
      } else if (r.targetType === "community") await tx.update(community).set({ status: "removed" }).where(eq(community.id, r.targetId));
      else if (r.targetType === "collab") await tx.update(collabListing).set({ status: "removed" }).where(eq(collabListing.id, r.targetId));
      else if (r.targetType === "user") {
        // Remove todo o conteúdo público do perfil denunciado (suspensão de conta: ver pendências no README).
        await tx.update(post).set({ status: "removed" }).where(eq(post.authorId, r.targetId));
      }
    }
    await tx
      .update(report)
      .set({ status: action === "remove" ? "resolved" : "dismissed", resolvedById: viewer.id, resolution: note.slice(0, 500), resolvedAt: new Date() })
      .where(and(eq(report.targetType, r.targetType), eq(report.targetId, r.targetId), eq(report.status, "open")));
    await tx.insert(moderationLog).values({ moderatorId: viewer.id, action, targetType: r.targetType, targetId: r.targetId, reportId: r.id });
  });
}

export async function restoreContent(viewer: V, targetType: "post" | "comment", targetId: string) {
  if (!isModerator(viewer)) throw new AppError("FORBIDDEN");
  if (targetType === "post") await db.update(post).set({ status: "published" }).where(eq(post.id, targetId));
  else await db.update(comment).set({ status: "published" }).where(eq(comment.id, targetId));
  await db.insert(moderationLog).values({ moderatorId: viewer.id, action: "restore", targetType, targetId });
}
