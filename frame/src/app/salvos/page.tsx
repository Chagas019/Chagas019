import Link from "next/link";
import { sql } from "drizzle-orm";
import { Bookmark } from "lucide-react";
import { requireViewerPage } from "@/server/session";
import { listCards } from "@/server/services/posts";
import { listCollections } from "@/server/services/social";
import { post } from "@/server/db/schema";
import { PostGrid } from "@/components/post/post-card";
import { CollectionsManager } from "@/components/social/collections-manager";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, SectionTitle } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export const metadata = { title: "Salvos e coleções", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ colecao?: string }> }) {
  const viewer = await requireViewerPage("/salvos");
  const { colecao } = await searchParams;
  const collections = await listCollections(viewer.id, false);
  const active = collections.find((c) => c.id === colecao);
  const saved = sql`exists (select 1 from saved_item s where s.post_id = ${post.id} and s.user_id = ${viewer.id} ${active ? sql`and s.collection_id = ${active.id}` : sql``})`;
  const cards = await listCards(viewer.id, saved, 120);
  return (
    <Container className="space-y-8 py-10">
      <SectionTitle eyebrow="Biblioteca" title="Salvos e coleções">
        Só você vê seus salvos. Coleções podem ser públicas e aparecer no seu portfólio.
      </SectionTitle>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/salvos" className={cn("rounded-full px-4 py-2 text-sm", !active ? "bg-volt-500 text-ink-950" : "bg-ink-850 text-fog-400 hover:text-paper")}>
          Tudo
        </Link>
        {collections.map((c) => (
          <Link key={c.id} href={`/salvos?colecao=${c.id}`} className={cn("rounded-full px-4 py-2 text-sm", active?.id === c.id ? "bg-volt-500 text-ink-950" : "bg-ink-850 text-fog-400 hover:text-paper")}>
            {c.name} <span className="opacity-60">{c.count}</span>
          </Link>
        ))}
        <CollectionsManager activeId={active?.id ?? null} />
      </div>
      {cards.length ? (
        <PostGrid cards={cards} signedIn />
      ) : (
        <EmptyState icon={<Bookmark className="size-6" />} title={active ? "Coleção vazia" : "Nada salvo ainda"} action={<ButtonLink href="/">Explorar inspirações</ButtonLink>}>
          Use o botão Salvar em qualquer trabalho ou tutorial.
        </EmptyState>
      )}
    </Container>
  );
}
