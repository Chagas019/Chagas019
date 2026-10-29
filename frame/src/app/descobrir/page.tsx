import Link from "next/link";
import { PageHero } from "@/components/ui/page-hero";
import { eq } from "drizzle-orm";
import { ArrowRight, Info } from "lucide-react";
import { getViewer } from "@/server/session";
import { creatorsBySpecialty, NEW_TALENT_CRITERIA, newTalents } from "@/server/services/discovery";
import { listCommunities } from "@/server/services/communities";
import { listChallenges } from "@/server/services/challenges";
import { listCards } from "@/server/services/posts";
import { post } from "@/server/db/schema";
import { CreatorCard } from "@/components/discovery/creator-card";
import { PostGrid } from "@/components/post/post-card";
import { Container, EmptyState, SectionTitle } from "@/components/ui/misc";
import { CATEGORIES, SPECIALTIES } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

export const metadata = { title: "Descobrir talentos" };

export default async function Page({ searchParams }: { searchParams: Promise<{ esp?: string }> }) {
  const { esp } = await searchParams;
  const specialty = SPECIALTIES.find((s) => s === esp);
  const viewer = await getViewer();
  const vid = viewer?.id ?? null;
  const [talents, bySpecialty, communities, challenges, collabs] = await Promise.all([
    newTalents(vid, 9),
    specialty ? creatorsBySpecialty(vid, specialty) : Promise.resolve([]),
    listCommunities(vid),
    listChallenges(),
    listCards(vid, eq(post.isCollaborative, true), 8),
  ]);
  const openChallenges = challenges.filter((c) => c.phase === "open" || c.phase === "voting").slice(0, 3);

  return (
    <>
      <PageHero eyebrow="Descobrir" title="Talentos, projetos e comunidades"
      >
        Explore por especialidade e interesse. Aqui ninguém aparece por ter mais seguidores — a rotação é diária e os critérios são públicos.
      </PageHero>
      <Container className="space-y-16 py-10">

      {specialty ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">{specialty}</h2>
          {bySpecialty.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bySpecialty.map((c) => (
                <CreatorCard key={c.userId} c={c} signedIn={!!viewer} />
              ))}
            </div>
          ) : (
            <EmptyState title="Ainda ninguém por aqui">Ainda não há criadores com essa especialidade e trabalhos públicos.</EmptyState>
          )}
        </section>
      ) : (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-3xl">Novos talentos</h2>
            <details className="max-w-md text-sm text-fog-400">
              <summary className="flex cursor-pointer items-center gap-1.5 hover:text-paper">
                <Info className="size-4" aria-hidden /> Como escolhemos
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-fog-500">
                {NEW_TALENT_CRITERIA.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </details>
          </div>
          {talents.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {talents.map((c) => (
                <CreatorCard key={c.userId} c={c} signedIn={!!viewer} />
              ))}
            </div>
          ) : (
            <EmptyState title="Os primeiros talentos estão chegando">Publique um trabalho público e você pode aparecer aqui.</EmptyState>
          )}
        </section>
      )}

      <section className="space-y-5">
        <h2 className="font-display text-3xl">Explorar por interesse</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((c, i) => (
            <li key={c.slug}>
              <Link
                href={`/?f=${c.slug}`}
                className="group relative flex h-28 items-end overflow-hidden rounded-[var(--radius-md)] bg-ink-850 p-4 transition-colors hover:bg-ink-800"
              >
                <span
                  aria-hidden
                  className="absolute -right-6 -top-6 size-24 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-70"
                  style={{ background: i % 2 ? "var(--color-cobalt-500)" : "var(--color-volt-500)" }}
                />
                <span className="relative font-display text-xl">{c.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {collabs.length ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">Projetos colaborativos</h2>
          <PostGrid cards={collabs} signedIn={!!viewer} />
        </section>
      ) : null}

      <div className="grid gap-12 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl">Comunidades</h2>
            <Link href="/comunidades" className="text-sm text-fog-400 hover:text-paper">
              Ver todas
            </Link>
          </div>
          <ul className="space-y-2">
            {communities.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link href={`/comunidades/${c.slug}`} className="flex items-center justify-between rounded-[var(--radius-md)] bg-ink-850 p-4 hover:bg-ink-800">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="block truncate text-xs text-fog-500">{c.description || `${c.memberCount} participantes`}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-fog-500" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl">Desafios em andamento</h2>
            <Link href="/desafios" className="text-sm text-fog-400 hover:text-paper">
              Ver todos
            </Link>
          </div>
          <ul className="space-y-2">
            {openChallenges.length ? (
              openChallenges.map((c) => (
                <li key={c.id}>
                  <Link href={`/desafios/${c.slug}`} className="flex items-center justify-between rounded-[var(--radius-md)] bg-ink-850 p-4 hover:bg-ink-800">
                    <span>
                      <span className="block font-medium">{c.title}</span>
                      <span className="text-xs text-fog-500">{c.phase === "open" ? "Recebendo trabalhos" : "Em votação"} · {c.submissions} participações</span>
                    </span>
                    <ArrowRight className="size-4 text-fog-500" aria-hidden />
                  </Link>
                </li>
              ))
            ) : (
              <li className="text-sm text-fog-500">Nenhum desafio em andamento.</li>
            )}
          </ul>
        </section>
      </div>
      </Container>
    </>
  );
}
