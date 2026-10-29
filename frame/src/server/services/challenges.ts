import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { challenge, challengeSubmission, challengeVote, post, profile, user } from "../db/schema";
import { AppError } from "../errors";
import type { Viewer } from "../session";
import { challengeSchema, fieldErrors } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { recordActivation } from "./activation";
import { notify } from "./notifications";
import { visibleToViewer } from "./posts";

type V = Pick<Viewer, "id" | "role" | "createdAt">;
export type Challenge = typeof challenge.$inferSelect;
export type ChallengePhase = "upcoming" | "open" | "voting" | "closed";

export function challengePhase(c: Pick<Challenge, "startsAt" | "submissionDeadline" | "votingEnabled" | "votingEndsAt">, now = new Date()): ChallengePhase {
  if (now < c.startsAt) return "upcoming";
  if (now < c.submissionDeadline) return "open";
  if (c.votingEnabled && c.votingEndsAt && now < c.votingEndsAt) return "voting";
  return "closed";
}

/** Regras de voto em linguagem clara — exibidas na página do desafio. */
export function votingRules(c: Pick<Challenge, "maxVotesPerUser">, minAgeHours: number): string[] {
  return [
    `Cada pessoa pode distribuir até ${c.maxVotesPerUser} votos, um por trabalho.`,
    "Não é possível votar no próprio trabalho.",
    minAgeHours > 0 ? `Contas criadas há menos de ${minAgeHours} horas não votam (proteção contra contas falsas).` : "Qualquer conta ativa pode votar.",
    "A contagem fica oculta durante a votação para reduzir o efeito manada; o resultado aparece no encerramento.",
    "Votos de contas removidas por abuso são descartados.",
  ];
}

function minAccountAgeHours(): number {
  const n = Number(process.env.CHALLENGE_MIN_ACCOUNT_AGE_HOURS ?? 24);
  return Number.isFinite(n) && n >= 0 ? n : 24;
}

export async function listChallenges() {
  const rows = await db
    .select({
      c: challenge,
      submissions: sql<number>`(select count(*)::int from challenge_submission s where s.challenge_id = ${challenge.id})`,
    })
    .from(challenge)
    .where(sql`${challenge.communityId} is null`)
    .orderBy(desc(challenge.submissionDeadline))
    .limit(60);
  const now = new Date();
  return rows.map((r) => ({ ...r.c, submissions: r.submissions, phase: challengePhase(r.c, now) }));
}

export async function getChallengeBySlug(slug: string) {
  const [c] = await db.select().from(challenge).where(eq(challenge.slug, slug)).limit(1);
  return c ?? null;
}

export async function listSubmissions(viewerId: string | null, c: Challenge) {
  const phase = challengePhase(c);
  const rows = await db
    .select({
      id: challengeSubmission.id,
      note: challengeSubmission.note,
      voteCount: challengeSubmission.voteCount,
      createdAt: challengeSubmission.createdAt,
      userId: challengeSubmission.userId,
      postId: post.id,
      title: post.title,
      handle: profile.handle,
      displayName: profile.displayName,
      avatar: profile.avatarMediaId,
      coverId: sql<string | null>`(select m.id from media m where m.post_id = ${post.id} and m.purpose = 'post' order by m.position limit 1)`,
      coverKind: sql<"image" | "video" | null>`(select m.kind from media m where m.post_id = ${post.id} and m.purpose = 'post' order by m.position limit 1)`,
      votedByViewer: viewerId
        ? sql<boolean>`exists (select 1 from challenge_vote v where v.submission_id = ${challengeSubmission.id} and v.voter_id = ${viewerId})`
        : sql<boolean>`false`,
    })
    .from(challengeSubmission)
    .innerJoin(post, eq(post.id, challengeSubmission.postId))
    .innerJoin(profile, eq(profile.userId, challengeSubmission.userId))
    .where(and(eq(challengeSubmission.challengeId, c.id), visibleToViewer(viewerId)))
    .orderBy(phase === "closed" && c.votingEnabled ? desc(challengeSubmission.voteCount) : asc(challengeSubmission.createdAt), asc(challengeSubmission.createdAt));
  // Durante a votação a contagem não é exposta.
  return rows.map((r) => ({ ...r, voteCount: phase === "closed" ? r.voteCount : null }));
}

export async function viewerVotesUsed(viewerId: string, challengeId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(challengeVote)
    .where(and(eq(challengeVote.challengeId, challengeId), eq(challengeVote.voterId, viewerId)));
  return row?.n ?? 0;
}

export async function submitToChallenge(viewer: V, input: { challengeId: string; postId: string; note?: string }) {
  const [c] = await db.select().from(challenge).where(eq(challenge.id, input.challengeId)).limit(1);
  if (!c) throw new AppError("NOT_FOUND");
  if (challengePhase(c) !== "open") throw new AppError("VALIDATION", "Este desafio não está recebendo trabalhos agora.");
  const [p] = await db.select().from(post).where(eq(post.id, input.postId)).limit(1);
  if (!p || p.authorId !== viewer.id) throw new AppError("FORBIDDEN", "Você só pode enviar trabalhos seus.");
  if (p.status !== "published" || p.visibility !== "public" || p.communityId) {
    throw new AppError("VALIDATION", "Envie um trabalho público para que a comunidade possa vê-lo.");
  }
  const note = (input.note ?? "").trim().slice(0, 500);
  const inserted = await db
    .insert(challengeSubmission)
    .values({ challengeId: c.id, postId: p.id, userId: viewer.id, note })
    .onConflictDoNothing()
    .returning({ id: challengeSubmission.id });
  if (!inserted.length) throw new AppError("CONFLICT", "Você já participou deste desafio. Remova o envio atual para trocar.");
  await recordActivation(viewer.id, "first_challenge_submission");
  return inserted[0]!;
}

export async function withdrawSubmission(viewer: V, challengeId: string) {
  const [c] = await db.select().from(challenge).where(eq(challenge.id, challengeId)).limit(1);
  if (!c) throw new AppError("NOT_FOUND");
  if (challengePhase(c) !== "open") throw new AppError("VALIDATION", "Envios só podem ser retirados enquanto o desafio está aberto.");
  await db.delete(challengeSubmission).where(and(eq(challengeSubmission.challengeId, challengeId), eq(challengeSubmission.userId, viewer.id)));
}

/** Alterna o voto do usuário em um envio, aplicando as regras anti-abuso. */
export async function toggleVote(viewer: V, submissionId: string): Promise<{ voted: boolean; used: number; max: number }> {
  const [s] = await db
    .select({ s: challengeSubmission, c: challenge })
    .from(challengeSubmission)
    .innerJoin(challenge, eq(challenge.id, challengeSubmission.challengeId))
    .where(eq(challengeSubmission.id, submissionId))
    .limit(1);
  if (!s) throw new AppError("NOT_FOUND");
  const { c } = s;
  if (!c.votingEnabled) throw new AppError("VALIDATION", "Este desafio não tem votação.");
  if (challengePhase(c) !== "voting") throw new AppError("VALIDATION", "A votação não está aberta.");
  if (s.s.userId === viewer.id) throw new AppError("FORBIDDEN", "Não é possível votar no próprio trabalho.");
  const [u] = await db.select({ createdAt: user.createdAt }).from(user).where(eq(user.id, viewer.id)).limit(1);
  const ageHours = (Date.now() - (u?.createdAt ?? new Date()).getTime()) / 3_600_000;
  if (ageHours < minAccountAgeHours()) throw new AppError("FORBIDDEN", "Sua conta ainda é muito nova para votar. Participe enviando um trabalho!");

  return db.transaction(async (tx) => {
    // Serializa votos do mesmo usuário no mesmo desafio para respeitar o limite.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`vote:${c.id}:${viewer.id}`}))`);
    const removed = await tx
      .delete(challengeVote)
      .where(and(eq(challengeVote.submissionId, submissionId), eq(challengeVote.voterId, viewer.id)))
      .returning({ s: challengeVote.submissionId });
    if (removed.length) {
      await tx.update(challengeSubmission).set({ voteCount: sql`greatest(0, ${challengeSubmission.voteCount} - 1)` }).where(eq(challengeSubmission.id, submissionId));
    } else {
      const [used] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(challengeVote)
        .where(and(eq(challengeVote.challengeId, c.id), eq(challengeVote.voterId, viewer.id)));
      if ((used?.n ?? 0) >= c.maxVotesPerUser) throw new AppError("VALIDATION", `Você já usou seus ${c.maxVotesPerUser} votos. Retire um voto para votar em outro trabalho.`);
      await tx.insert(challengeVote).values({ submissionId, voterId: viewer.id, challengeId: c.id });
      await tx.update(challengeSubmission).set({ voteCount: sql`${challengeSubmission.voteCount} + 1` }).where(eq(challengeSubmission.id, submissionId));
    }
    const [after] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(challengeVote)
      .where(and(eq(challengeVote.challengeId, c.id), eq(challengeVote.voterId, viewer.id)));
    return { voted: removed.length === 0, used: after?.n ?? 0, max: c.maxVotesPerUser };
  });
}

export async function createChallenge(viewer: V, input: unknown) {
  if (viewer.role !== "admin" && viewer.role !== "moderator") throw new AppError("FORBIDDEN");
  const parsed = challengeSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", undefined, fieldErrors(parsed.error));
  const base = slugify(parsed.data.title) || "desafio";
  let slug = base;
  for (let i = 2; (await getChallengeBySlug(slug)) && i < 50; i++) slug = `${base}-${i}`;
  const [c] = await db.insert(challenge).values({ ...parsed.data, slug, createdById: viewer.id }).returning();
  return c!;
}

/** Avisa participantes quando um desafio entra em votação/encerra (chamado pelo cron). */
export async function notifyChallengeParticipants(c: Challenge, message: string) {
  const participants = await db.select({ userId: challengeSubmission.userId }).from(challengeSubmission).where(eq(challengeSubmission.challengeId, c.id));
  await Promise.all(participants.map((p) => notify({ userId: p.userId, actorId: null, type: "challenge", challengeId: c.id, message })));
}
