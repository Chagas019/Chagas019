import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { ArrowRight, Hash, Info, TrendingUp } from "lucide-react";
import { getViewer } from "@/server/session";
import { creatorsBySpecialty, NEW_TALENT_CRITERIA, newTalents, searchPeople, suggestedCreators, trendingTags } from "@/server/services/discovery";
import { listCommunities } from "@/server/services/communities";
import { listChallenges } from "@/server/services/challenges";
import { listCards, listPopular, searchPosts } from "@/server/services/posts";
import { post } from "@/server/db/schema";
import { CreatorCard } from "@/components/discovery/creator-card";
import { SearchBox } from "@/components/discovery/search-box";
import { PostGrid } from "@/components/post/post-card";
import { Container, EmptyState, SectionTitle } from "@/components/ui/misc";
import { CATEGORIES, SPECIALTIES } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

export const metadata = { title: "Descobrir" };

export default async function Page({ searchParams }: { searchParams: Promise<{ esp?: string; q?: string; cat?: string; formato?: string; ordem?: string }> }) {
  const sp = await searchParams;
  const specialty = SPECIALTIES.find((s) => s === sp.esp);
  const q = (sp.q ?? "").trim().slice(0, 80);
  const cat = CATEGORIES.find((c) => c.slug === sp.cat)?.slug ?? null;
  const viewer = await getViewer();
  const vid = viewer?.id ?? null;
  const format = sp.formato === "foto" || sp.formato === "video" ? sp.formato : null;
  const order = sp.ordem === "populares" || sp.ordem === "recentes" ? sp.ordem : null;
  const searching = !!q || !!cat || !!format || !!order;
  const catWhere = cat ? sql`${post.categories} @> array[${cat}]::text[]` : undefined;
  const [results, people, tags, popular, recent, talents, suggested, bySpecialty, communities, challenges, collabs] = await Promise.all([
    searching ? searchPosts(vid, q, cat, 48, { format, order }) : Promise.resolve([]),
    q ? searchPeople(vid, q) : Promise.resolve([]),
    trendingTags(7, 12),
    searching ? Promise.resolve([]) : listPopular(vid, 30, 12),
    searching ? Promise.resolve([]) : listCards(vid, and(sql`${post.communityId} is null`, sql`${post.kind} <> 'discussion'`, catWhere), 12),
    searching ? Promise.resolve([]) : newTalents(vid, 6),
    vid && !searching ? suggestedCreators(vid, 6) : Promise.resolve([]),
    specialty ? creatorsBySpecialty(vid, specialty) : Promise.resolve([]),
    searching ? Promise.resolve([]) : listCommunities(vid),
    searching ? Promise.resolve([]) : listChallenges(),
    searching ? Promise.resolve([]) : listCards(vid, eq(post.isCollaborative, true), 8),
  ]);
  const openChallenges = challenges.filter((c) => c.phase === "open" || c.phase === "voting").slice(0, 3);
  const link = (patch: Record<string, string | null>) => {
    const cur: Record<string, string | null> = { q: q || null, cat, formato: format, ordem: order, ...patch };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(cur)) if (v) p.set(k, v);
    return `/descobrir${p.size ? `?${p}` : ""}`;
  };
  const catHref = (slug: string | null) => link({ cat: slug });

  return (
    <>
      <section className="overflow-x-clip bg-cobalt-500">
        <Container className="space-y-5 py-8 sm:py-10">
          <h1 className="font-display text-[clamp(2.6rem,7vw,5rem)] leading-[0.9] text-volt-500">Descobrir</h1>
          <div className="max-w-2xl">
            <SearchBox initial={q} category={cat} />
          </div>
          <nav aria-label="Áreas criativas" className="scrollbar-none -mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            <Link href={catHref(null)} aria-current={!cat ? "page" : undefined} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm", !cat ? "bg-volt-500 text-ink-950" : "bg-ink-950/30 text-paper hover:bg-ink-950/50")}>
              Tudo
            </Link>
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={catHref(c.slug)} aria-current={cat === c.slug ? "page" : undefined} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm", cat === c.slug ? "bg-volt-500 text-ink-950" : "bg-ink-950/30 text-paper hover:bg-ink-950/50")}>
                {c.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap gap-2 text-sm" role="group" aria-label="Formato e ordem">
            {[
              { label: "Fotos", on: format === "foto", href: link({ formato: format === "foto" ? null : "foto" }) },
              { label: "Vídeos", on: format === "video", href: link({ formato: format === "video" ? null : "video" }) },
              { label: "Recentes", on: order === "recentes", href: link({ ordem: order === "recentes" ? null : "recentes" }) },
              { label: "Populares", on: order === "populares", href: link({ ordem: order === "populares" ? null : "populares" }) },
            ].map((o) => (
              <Link key={o.label} href={o.href} aria-pressed={o.on} className={cn("rounded-full px-3 py-1 ring-1 ring-inset", o.on ? "bg-paper text-ink-950 ring-paper" : "text-paper ring-paper/40 hover:bg-white/10")}>
                {o.label}
              </Link>
            ))}
          </div>
        </Container>
      </section>
      <Container className="space-y-14 py-10">
      {tags.length ? (
        <section className="space-y-3" aria-labelledby="em-alta">
          <h2 id="em-alta" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-fog-400">
            <TrendingUp className="size-4 text-volt-500" aria-hidden /> Em alta nos últimos 7 dias
          </h2>
          <ul className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <li key={t.tag}>
                <Link href={`/descobrir?q=${encodeURIComponent("#" + t.tag)}`} className="inline-flex items-center gap-1.5 rounded-full bg-ink-850 px-3.5 py-2 text-sm ring-1 ring-inset ring-white/[0.06] hover:ring-volt-500/60">
                  <Hash className="size-3.5 text-cobalt-400" aria-hidden />
                  <span className="font-medium">{t.tag}</span>
                  <span className="text-xs text-fog-500">{t.posts} {t.posts === 1 ? "publicação" : "publicações"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {searching ? (
        <>
          {people.length ? (
            <section className="space-y-5">
              <h2 className="font-display text-3xl">Pessoas</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {people.map((c) => (
                  <CreatorCard key={c.userId} c={c} signedIn={!!viewer} />
                ))}
              </div>
            </section>
          ) : null}
          <section className="space-y-5">
            <h2 className="font-display text-3xl">
              {q ? <>Resultados para “{q}”</> : order === "populares" ? "Mais populares" : "Mais recentes"}
              {cat ? <span className="text-fog-500"> · {CATEGORIES.find((c) => c.slug === cat)?.label}</span> : null}
            </h2>
            {results.length ? (
              <PostGrid cards={results} signedIn={!!viewer} viewerId={vid} />
            ) : (
              <EmptyState title="Nada encontrado" action={<Link href="/descobrir" className="text-sm text-volt-500 hover:underline">Limpar busca</Link>}>
                Tente outra palavra, uma #hashtag ou outra área.
              </EmptyState>
            )}
          </section>
        </>
      ) : null}

      {!searching && popular.length ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">Projetos em destaque</h2>
          <p className="-mt-3 text-sm text-fog-500">Mais curtidos, comentados e salvos nos últimos 30 dias.</p>
          <PostGrid cards={popular} signedIn={!!viewer} viewerId={vid} />
        </section>
      ) : null}

      {suggested.length ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">Criadores para você</h2>
          <p className="-mt-3 text-sm text-fog-500">Com base nos interesses que você escolheu.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suggested.map((c) => (
              <CreatorCard key={c.userId} c={c} signedIn={!!viewer} />
            ))}
          </div>
        </section>
      ) : null}

      {!searching ? (
      <>
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

      {recent.length ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">Recentes</h2>
          <PostGrid cards={recent} signedIn={!!viewer} viewerId={vid} />
        </section>
      ) : null}

      {collabs.length ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">Projetos colaborativos</h2>
          <PostGrid cards={collabs} signedIn={!!viewer} />
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 [&>*]:min-w-0">
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
      </>
      ) : null}
      </Container>
    </>
  );
}
