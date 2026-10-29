import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { getFeed } from "@/server/services/posts";
import { FEED_FILTERS, type FeedFilter } from "@/lib/taxonomy";
import { Feed } from "@/components/post/feed";
import { FeedFilters } from "@/components/post/feed-filters";
import { EditorialSkeleton } from "@/components/post/editorial-grid";
import { Assistant } from "@/components/home/assistant";
import { Container } from "@/components/ui/misc";

export default async function Home({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const viewer = await getViewer();
  if (viewer && !viewer.onboarded) redirect("/onboarding");
  const { f } = await searchParams;
  const filter = (FEED_FILTERS.some((x) => x.slug === f) ? f : "para-voce") as FeedFilter;
  const minimized = (await cookies()).get("frame_hero")?.value === "min";

  return (
    <Container className="space-y-6 pt-4 sm:pt-6">
      <Assistant minimized={minimized} />
      <section aria-label="Feed" className="space-y-5">
        <h2 className="sr-only">{viewer ? "Seu feed" : "Inspiração"}</h2>
        <FeedFilters active={filter} signedIn={!!viewer} />
        <Suspense key={filter} fallback={<EditorialSkeleton />}>
          <FeedLoader filter={filter} viewerId={viewer?.id ?? null} />
        </Suspense>
      </section>
    </Container>
  );
}

async function FeedLoader({ filter, viewerId }: { filter: FeedFilter; viewerId: string | null }) {
  const page = await getFeed(viewerId ? { id: viewerId } : null, filter, null);
  return <Feed filter={filter} initial={page} signedIn={!!viewerId} viewerId={viewerId} variant="editorial" />;
}
