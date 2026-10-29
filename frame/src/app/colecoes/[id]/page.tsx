import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { post } from "@/server/db/schema";
import { getViewer } from "@/server/session";
import { listCards } from "@/server/services/posts";
import { getCollection } from "@/server/services/social";
import { PostGrid } from "@/components/post/post-card";
import { Badge, Container, EmptyState, SectionTitle } from "@/components/ui/misc";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const c = await getCollection(null, id);
  return c ? { title: `${c.name} — coleção de ${c.ownerName}` } : { title: "Coleção", robots: { index: false } };
}

export default async function CollectionPage({ params }: Props) {
  const { id } = await params;
  const viewer = await getViewer();
  const c = await getCollection(viewer?.id ?? null, id);
  if (!c) notFound();
  // Só mostra itens que o visitante também pode ver (a regra de visibilidade de cada post vale aqui).
  const cards = await listCards(viewer?.id ?? null, sql`exists (select 1 from saved_item s where s.post_id = ${post.id} and s.collection_id = ${c.id})`, 120);
  return (
    <Container className="space-y-8 py-10">
      <SectionTitle eyebrow="Coleção" title={c.name}>
        {c.description || null}
      </SectionTitle>
      <p className="-mt-4 flex items-center gap-2 text-sm text-fog-400">
        por{" "}
        <Link href={`/u/${c.ownerHandle}`} className="text-paper hover:underline">
          {c.ownerName}
        </Link>
        {!c.isPublic ? <Badge tone="ember">Privada — só você vê</Badge> : null}
      </p>
      {cards.length ? <PostGrid cards={cards} signedIn={!!viewer} viewerId={viewer?.id ?? null} /> : <EmptyState title="Coleção vazia">Ainda não há trabalhos visíveis nesta coleção.</EmptyState>}
    </Container>
  );
}
