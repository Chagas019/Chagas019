import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { getFeed } from "@/server/services/posts";
import { FEED_FILTERS, type FeedFilter } from "@/lib/taxonomy";
import { Feed } from "@/components/post/feed";
import { FeedFilters } from "@/components/post/feed-filters";
import { PostGridSkeleton } from "@/components/post/post-card";
import { Plus } from "lucide-react";
import { Landing } from "@/components/landing/landing";
import { ButtonLink } from "@/components/ui/button";
import { Marquee } from "@/components/ui/marquee";
import { PageHero } from "@/components/ui/page-hero";
import { Container } from "@/components/ui/misc";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const viewer = await getViewer();
  if (viewer && !viewer.onboarded) redirect("/onboarding");
  const { f } = await searchParams;
  const filter = (
    FEED_FILTERS.some((x) => x.slug === f) ? f : "para-voce"
  ) as FeedFilter;

  return (
    <>
      {!viewer ? (
        <Landing />
      ) : (
        <>
          <PageHero
            eyebrow="Inspiração"
            title="Sua criatividade merece um mundo inteiro"
            action={
              <ButtonLink href="/publicar" size="lg">
                <Plus className="size-4" aria-hidden /> Publicar trabalho
              </ButtonLink>
            }
          >
            Veja o que a comunidade está criando, salve referências e mostre o seu processo.
          </PageHero>
          <Marquee items={["Fotografia", "Vídeo", "Edição", "Color grading", "Design", "Motion", "Mobile", "Retrato"]} />
        </>
      )}
      <section id="inspiracao" className="scroll-mt-20">
        <Container className="pt-6 sm:pt-10">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-4xl text-paper sm:text-5xl">
                Inspiração
              </h2>
              {filter === "para-voce" ? (
                <p className="hidden max-w-sm text-right text-xs text-fog-500 md:block">
                  Ordenado por relevância, qualidade das conversas e espaço para
                  novos talentos — não só por número de seguidores.
                </p>
              ) : null}
            </div>
            <FeedFilters active={filter} signedIn={!!viewer} />
          </div>

          <Suspense key={filter} fallback={<PostGridSkeleton />}>
            <FeedLoader filter={filter} viewerId={viewer?.id ?? null} />
          </Suspense>
        </Container>
      </section>
    </>
  );
}

async function FeedLoader({
  filter,
  viewerId,
}: {
  filter: FeedFilter;
  viewerId: string | null;
}) {
  const page = await getFeed(viewerId ? { id: viewerId } : null, filter, null);
  return <Feed filter={filter} initial={page} signedIn={!!viewerId} />;
}
