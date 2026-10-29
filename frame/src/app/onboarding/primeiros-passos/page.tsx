import Link from "next/link";
import { ArrowRight, Check, GraduationCap, ImagePlus, Swords, UserPlus, Users } from "lucide-react";
import { requireViewerPage } from "@/server/session";
import { suggestedCreators } from "@/server/services/discovery";
import { listCommunities } from "@/server/services/communities";
import { listChallenges } from "@/server/services/challenges";
import { db } from "@/server/db";
import { activationEvent } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { CreatorCard } from "@/components/discovery/creator-card";
import { ButtonLink } from "@/components/ui/button";
import { Container, SectionTitle } from "@/components/ui/misc";

export const metadata = { title: "Primeiros passos" };

export default async function Page() {
  const viewer = await requireViewerPage("/onboarding/primeiros-passos");
  const [creators, communities, challenges, events] = await Promise.all([
    suggestedCreators(viewer.id, 6),
    listCommunities(viewer.id),
    listChallenges(),
    db.select({ event: activationEvent.event }).from(activationEvent).where(eq(activationEvent.userId, viewer.id)),
  ]);
  const done = new Set(events.map((e) => e.event));
  const steps = [
    { key: "first_post", label: "Publique seu primeiro trabalho", href: "/publicar", icon: ImagePlus },
    { key: "first_follow", label: "Siga um criador que inspira você", href: "/descobrir", icon: UserPlus },
    { key: "first_tutorial_saved", label: "Salve um tutorial no FRAME LAB", href: "/lab", icon: GraduationCap },
    { key: "first_challenge_submission", label: "Participe de um desafio", href: "/desafios", icon: Swords },
    { key: "first_community_join", label: "Entre em uma comunidade", href: "/comunidades", icon: Users },
  ] as const;
  const open = challenges.filter((c) => c.phase === "open").slice(0, 3);

  return (
    <Container className="max-w-5xl space-y-14 py-12">
      <SectionTitle eyebrow="Tudo pronto" title="Seus primeiros passos">
        Sugestões baseadas nos interesses que você escolheu. Nada aqui é obrigatório.
      </SectionTitle>

      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s) => {
          const isDone = done.has(s.key);
          return (
            <li key={s.key}>
              <Link href={s.href} className="flex items-center gap-3 rounded-[var(--radius-md)] bg-ink-850 p-4 transition-colors hover:bg-ink-800">
                <span className={`grid size-9 place-items-center rounded-full ${isDone ? "bg-success-400/15 text-success-400" : "bg-volt-500/15 text-volt-300"}`}>
                  {isDone ? <Check className="size-4" aria-hidden /> : <s.icon className="size-4" aria-hidden />}
                </span>
                <span className={`text-sm ${isDone ? "text-fog-500 line-through" : "text-paper"}`}>{s.label}</span>
                <span className="sr-only">{isDone ? "(concluído)" : ""}</span>
              </Link>
            </li>
          );
        })}
      </ol>

      {creators.length ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">Criadores com interesses parecidos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((c) => (
              <CreatorCard key={c.userId} c={c} signedIn />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="font-display text-3xl">Comunidades</h2>
          <ul className="space-y-2">
            {communities.slice(0, 4).map((c) => (
              <li key={c.id}>
                <Link href={`/comunidades/${c.slug}`} className="flex items-center justify-between rounded-[var(--radius-md)] bg-ink-850 p-4 hover:bg-ink-800">
                  <span>
                    <span className="block font-medium">{c.name}</span>
                    <span className="text-xs text-fog-500">{c.memberCount} participantes</span>
                  </span>
                  <ArrowRight className="size-4 text-fog-500" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-4">
          <h2 className="font-display text-3xl">Desafios abertos</h2>
          <ul className="space-y-2">
            {open.length ? (
              open.map((c) => (
                <li key={c.id}>
                  <Link href={`/desafios/${c.slug}`} className="flex items-center justify-between rounded-[var(--radius-md)] bg-ink-850 p-4 hover:bg-ink-800">
                    <span>
                      <span className="block font-medium">{c.title}</span>
                      <span className="text-xs text-fog-500">{c.theme}</span>
                    </span>
                    <ArrowRight className="size-4 text-fog-500" aria-hidden />
                  </Link>
                </li>
              ))
            ) : (
              <li className="text-sm text-fog-500">Nenhum desafio aberto agora. Novos desafios saem toda semana.</li>
            )}
          </ul>
        </section>
      </div>

      <ButtonLink href="/" size="lg">
        Ir para a Inspiração <ArrowRight className="size-4" aria-hidden />
      </ButtonLink>
    </Container>
  );
}
