import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getViewer } from "@/server/session";
import { getFeed } from "@/server/services/posts";
import { FEED_FILTERS, type FeedFilter } from "@/lib/taxonomy";
import { Feed } from "@/components/post/feed";
import { FeedFilters } from "@/components/post/feed-filters";
import { PostGridSkeleton } from "@/components/post/post-card";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";

export default async function Home({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const viewer = await getViewer();
  if (viewer && !viewer.onboarded) redirect("/onboarding");
  const { f } = await searchParams;
  const filter = (FEED_FILTERS.some((x) => x.slug === f) ? f : "para-voce") as FeedFilter;

  return (
    <Container className="pt-6 sm:pt-10">
      {!viewer ? (
        <section className="relative mb-12 overflow-hidden rounded-[var(--radius-xl)] px-6 py-14 sm:px-12 sm:py-20">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(700px_380px_at_15%_20%,rgb(213_255_64/0.16),transparent_65%),radial-gradient(600px_400px_at_90%_90%,rgb(192_194_184/0.08),transparent_60%)]" />
          <div aria-hidden className="absolute inset-3 -z-10 rounded-[calc(var(--radius-xl)-6px)] border border-white/[0.07]" />
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-volt-300">Fotografia · Vídeo · Edição · Design</p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.95] text-balance text-paper sm:text-7xl">
            Sua criatividade merece <em className="text-volt-300">um mundo inteiro.</em>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg text-fog-300">
            Publique o resultado e mostre o processo. Aprenda no FRAME LAB, entre em desafios criativos e encontre gente para criar junto.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/cadastro" size="lg">
              Criar meu portfólio <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/descobrir" size="lg" variant="outline">
              Explorar talentos
            </ButtonLink>
          </div>
        </section>
      ) : null}

      <div className="mb-6 flex flex-col gap-4 sm:mb-8">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-4xl text-paper sm:text-5xl">Inspiração</h2>
          {filter === "para-voce" ? (
            <p className="hidden max-w-sm text-right text-xs text-fog-500 md:block">
              Ordenado por relevância, qualidade das conversas e espaço para novos talentos — não só por número de seguidores.
            </p>
          ) : null}
        </div>
        <FeedFilters active={filter} signedIn={!!viewer} />
      </div>

      <Suspense key={filter} fallback={<PostGridSkeleton />}>
        <FeedLoader filter={filter} viewerId={viewer?.id ?? null} />
      </Suspense>
    </Container>
  );
}

async function FeedLoader({ filter, viewerId }: { filter: FeedFilter; viewerId: string | null }) {
  const page = await getFeed(viewerId ? { id: viewerId } : null, filter, null);
  return <Feed filter={filter} initial={page} signedIn={!!viewerId} />;
}
