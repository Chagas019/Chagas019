import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { CalendarClock, Trophy } from "lucide-react";
import { getViewer } from "@/server/session";
import { challengePhase, getChallengeBySlug, listSubmissions, viewerVotesUsed, votingRules } from "@/server/services/challenges";
import { db } from "@/server/db";
import { post } from "@/server/db/schema";
import { SubmitPanel, VoteButton, WithdrawButton } from "@/components/challenge/challenge-actions";
import { ShareButton } from "@/components/post/post-actions";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, Badge, Container, EmptyState } from "@/components/ui/misc";
import { Sparkle } from "@/components/ui/sparkle";
import { CATEGORIES, labelOf } from "@/lib/taxonomy";
import { formatDate, mediaUrl } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getChallengeBySlug(slug);
  if (!c) return { title: "Desafio" };
  return { title: `${c.title} — Creative Battle`, description: c.theme };
}

export default async function ChallengePage({ params }: Props) {
  const { slug } = await params;
  const c = await getChallengeBySlug(slug);
  if (!c) notFound();
  const viewer = await getViewer();
  const phase = challengePhase(c);
  const submissions = await listSubmissions(viewer?.id ?? null, c);
  const mine = viewer ? submissions.find((s) => s.userId === viewer.id) : undefined;
  const minAge = Number(process.env.CHALLENGE_MIN_ACCOUNT_AGE_HOURS ?? 24);
  const used = viewer && phase === "voting" ? await viewerVotesUsed(viewer.id, c.id) : 0;
  const myPosts =
    viewer && phase === "open" && !mine
      ? await db
          .select({
            id: post.id,
            title: post.title,
            coverId: sql<string | null>`(select m.id from media m where m.post_id = ${post.id} and m.purpose = 'post' and m.kind = 'image' order by m.position limit 1)`,
          })
          .from(post)
          .where(and(eq(post.authorId, viewer.id), eq(post.status, "published"), eq(post.visibility, "public"), isNull(post.communityId), sql`${post.kind} <> 'discussion'`))
          .orderBy(desc(post.createdAt))
          .limit(24)
      : [];
  const palette = c.palette.length ? c.palette : ["#d5ff40", "#c0c2b8"];
  const winners = phase === "closed" && c.votingEnabled ? submissions.slice(0, 3).filter((s) => (s.voteCount ?? 0) > 0) : [];

  return (
    <div>
      <section className="relative overflow-hidden bg-cobalt-500">
        <Sparkle className="spin-slow absolute -right-6 -top-6 size-28 text-volt-500/90 sm:right-10 sm:top-8 sm:size-14" />
        <Container className="relative py-14 sm:py-20">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-paper">
            <Sparkle className="size-3.5 text-volt-500" /> Creative Battle · {c.cadence === "mensal" ? "Mensal" : "Semanal"} · {labelOf(CATEGORIES, c.category)}
          </p>
          <h1 className="mt-4 max-w-5xl font-display text-[clamp(2.8rem,8vw,6.5rem)] leading-[0.88] text-balance text-volt-500">{c.title}</h1>
          <p className="mt-4 max-w-2xl text-xl text-paper">{c.theme}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Badge className={phase === "open" || phase === "voting" ? "bg-volt-500 text-ink-950" : "bg-ink-950/40 text-paper"}>
              {phase === "open" ? "Recebendo trabalhos" : phase === "voting" ? "Votação aberta" : phase === "upcoming" ? "Em breve" : "Encerrado"}
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-sm text-paper/85">
              <CalendarClock className="size-4" aria-hidden />
              {phase === "upcoming" ? `Começa ${formatDate(c.startsAt)}` : phase === "open" ? `Envios até ${formatDate(c.submissionDeadline)}` : phase === "voting" && c.votingEndsAt ? `Votação até ${formatDate(c.votingEndsAt)}` : "Resultados publicados"}
            </span>
            {palette.length > 1 ? (
              <span className="flex items-center gap-1" aria-label={`Paleta do desafio: ${palette.join(", ")}`}>
                {palette.map((hex) => (
                  <span key={hex} className="size-5 rounded-full ring-1 ring-white/20" style={{ background: hex }} title={hex} />
                ))}
              </span>
            ) : null}
            <ShareButton title={c.title} path={`/desafios/${c.slug}`} />
          </div>
        </Container>
      </section>

      <Container className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-12">
          <section className="space-y-3">
            <h2 className="font-display text-3xl">Briefing</h2>
            <p className="max-w-3xl whitespace-pre-line text-pretty leading-relaxed text-fog-300">{c.briefing}</p>
          </section>

          {winners.length ? (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 font-display text-3xl">
                <Trophy className="size-6 text-ember-400" aria-hidden /> Destaques da votação
              </h2>
              <ol className="grid gap-4 sm:grid-cols-3">
                {winners.map((w, i) => (
                  <li key={w.id} className="overflow-hidden rounded-[var(--radius-md)] bg-ink-850">
                    <Link href={`/p/${w.postId}`} className="relative block aspect-[4/5]">
                      {w.coverId && w.coverKind === "image" ? <Image src={mediaUrl(w.coverId, "thumb")} alt={w.title} fill unoptimized className="object-cover" /> : null}
                      <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs">{i + 1}º · {w.voteCount} votos</span>
                    </Link>
                    <p className="truncate p-3 text-sm">{w.displayName}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-3xl">Galeria ({submissions.length})</h2>
              {phase === "voting" && viewer ? (
                <p className="text-sm text-fog-400">
                  Seus votos: {used}/{c.maxVotesPerUser}
                </p>
              ) : null}
            </div>
            {submissions.length ? (
              <ul className="columns-2 gap-4 md:columns-3">
                {submissions.map((s) => (
                  <li key={s.id} className="mb-4 break-inside-avoid">
                    <Link href={`/p/${s.postId}`} className="relative block overflow-hidden rounded-[var(--radius-md)] bg-ink-850">
                      {s.coverId && s.coverKind === "image" ? (
                        <Image src={mediaUrl(s.coverId, "thumb")} alt={s.title} width={640} height={800} unoptimized className="h-auto w-full" />
                      ) : (
                        <div className="aspect-[4/5] p-4 font-display text-xl">{s.title}</div>
                      )}
                    </Link>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Link href={`/u/${s.handle}`} className="flex min-w-0 items-center gap-2 text-sm text-fog-300 hover:text-paper">
                        <Avatar mediaId={s.avatar} name={s.displayName} size={22} />
                        <span className="truncate">{s.displayName}</span>
                      </Link>
                      {phase === "voting" && c.votingEnabled && viewer && viewer.id !== s.userId ? <VoteButton submissionId={s.id} initial={s.votedByViewer} /> : null}
                      {phase === "closed" && s.voteCount !== null && c.votingEnabled ? <span className="text-xs text-fog-500">{s.voteCount} votos</span> : null}
                    </div>
                    {s.note ? <p className="mt-1 line-clamp-2 text-xs text-fog-500">{s.note}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="A galeria está esperando você">Seja a primeira pessoa a participar deste desafio.</EmptyState>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-lg)] bg-ink-850 p-5">
            <h2 className="mb-4 font-display text-2xl">Participar</h2>
            {phase !== "open" ? (
              <p className="text-sm text-fog-400">{phase === "upcoming" ? "Os envios abrem em breve." : "Os envios estão encerrados."}</p>
            ) : !viewer ? (
              <ButtonLink href={`/entrar?next=/desafios/${c.slug}`}>Entrar para participar</ButtonLink>
            ) : mine ? (
              <div className="space-y-3">
                <p className="text-sm text-success-400">Você está participando com “{mine.title}”.</p>
                <WithdrawButton challengeId={c.id} slug={c.slug} />
              </div>
            ) : (
              <SubmitPanel challengeId={c.id} slug={c.slug} myPosts={myPosts} />
            )}
          </div>
          <div className="space-y-3 rounded-[var(--radius-lg)] bg-ink-850 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fog-400">Regras</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-fog-300">
              {c.rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
              <li>Envie apenas trabalhos seus, criados para este desafio ou que respeitem o tema.</li>
            </ul>
          </div>
          {c.votingEnabled ? (
            <div className="space-y-3 rounded-[var(--radius-lg)] bg-ink-850 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fog-400">Como funciona a votação</h2>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-fog-400">
                {votingRules(c, minAge).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-[var(--radius-lg)] bg-ink-850 p-5 text-sm text-fog-400">Este desafio não tem votação: o objetivo é praticar e trocar feedback.</p>
          )}
        </aside>
      </Container>
    </div>
  );
}
