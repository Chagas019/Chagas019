import { and, gte, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { challenge } from "@/server/db/schema";
import { cleanupAbandonedIncoming, cleanupOrphanMedia } from "@/server/services/media";
import { notifyChallengeParticipants } from "@/server/services/challenges";

export const runtime = "nodejs";

/**
 * Tarefa periódica (Vercel Cron diário por padrão; ajuste CRON_WINDOW_HOURS se rodar com outra frequência).
 * Protegida por CRON_SECRET.
 * - remove uploads abandonados (> 24h sem post);
 * - avisa participantes quando um desafio entra em votação ou encerra;
 * - limpa janelas antigas de rate limit.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Não autorizado", { status: 401 });
  }
  const removed = await cleanupOrphanMedia();
  // Envios diretos abandonados (nunca finalizados) ficam em incoming/ — removidos pelo ciclo de vida abaixo.
  const abandoned = await cleanupAbandonedIncoming();
  const windowHours = Number(process.env.CRON_WINDOW_HOURS ?? 24);
  const hourAgo = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const now = new Date();
  const toVoting = await db.select().from(challenge).where(and(gte(challenge.submissionDeadline, hourAgo), lt(challenge.submissionDeadline, now)));
  for (const c of toVoting) {
    await notifyChallengeParticipants(c, c.votingEnabled ? `A votação de "${c.title}" começou.` : `"${c.title}" foi encerrado. Veja a galeria completa.`);
  }
  const closed = await db.select().from(challenge).where(and(gte(challenge.votingEndsAt, hourAgo), lt(challenge.votingEndsAt, now)));
  for (const c of closed) await notifyChallengeParticipants(c, `Resultados de "${c.title}" publicados.`);
  await db.execute(sql`delete from app_rate_limit where window_start < now() - interval '1 day'`);
  return Response.json({ removedMedia: removed, abandonedUploads: abandoned, challengeUpdates: toVoting.length + closed.length });
}
