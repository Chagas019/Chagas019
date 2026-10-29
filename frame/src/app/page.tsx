import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getViewer } from "@/server/session";
import { getFeed } from "@/server/services/posts";
import { FEED_FILTERS, type FeedFilter } from "@/lib/taxonomy";
import { Feed } from "@/components/post/feed";
import { FeedFilters } from "@/components/post/feed-filters";
import { PostGridSkeleton } from "@/components/post/post-card";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { Sparkle } from "@/components/ui/sparkle";

export default async function Home({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const viewer = await getViewer();
  if (viewer && !viewer.onboarded) redirect("/onboarding");
  const { f } = await searchParams;
  const filter = (FEED_FILTERS.some((x) => x.slug === f) ? f : "para-voce") as FeedFilter;

  return (
    <>
      {!viewer ? (
        <section className="bg-cobalt-500">
          <Container className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:py-6">
            <div className="flex items-start gap-3">
              <Sparkle className="mt-1 size-5 shrink-0 text-volt-500" />
              <div>
                <h2 className="font-display text-3xl leading-none text-volt-500 sm:text-4xl">Sua criatividade merece um mundo inteiro</h2>
                <p className="mt-1.5 text-sm text-paper/85">
                  A rede social de fotógrafos, videomakers, editores e designers.{" "}
                  <Link href="/sobre" className="font-semibold text-paper underline underline-offset-4">
                    Conheça o FRAME
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <ButtonLink href="/cadastro">
                Criar conta <ArrowUpRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/entrar" variant="ghost" className="text-paper ring-1 ring-inset ring-paper/40 hover:bg-white/10">
                Entrar
              </ButtonLink>
            </div>
          </Container>
        </section>
      ) : null}
      <Container className="pt-5 sm:pt-8">
        <h1 className="sr-only">{viewer ? "Seu feed" : "Inspiração"}</h1>
        <div className="mb-5 sm:mb-7">
          <FeedFilters active={filter} signedIn={!!viewer} />
        </div>
        <Suspense key={filter} fallback={<PostGridSkeleton />}>
          <FeedLoader filter={filter} viewerId={viewer?.id ?? null} />
        </Suspense>
      </Container>
    </>
  );
}

async function FeedLoader({ filter, viewerId }: { filter: FeedFilter; viewerId: string | null }) {
  const page = await getFeed(viewerId ? { id: viewerId } : null, filter, null);
  return <Feed filter={filter} initial={page} signedIn={!!viewerId} viewerId={viewerId} />;
}
