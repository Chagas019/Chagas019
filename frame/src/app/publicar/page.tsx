import { requireViewerPage } from "@/server/session";
import { getCommunityBySlug } from "@/server/services/communities";
import { communityAccessFor } from "@/server/services/access";
import { PublishForm } from "@/components/post/publish-form";
import { Container, SectionTitle } from "@/components/ui/misc";

export const metadata = { title: "Publicar" };

const KINDS = ["work", "showcase", "tutorial", "discussion"] as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ tipo?: string; comunidade?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewerPage("/publicar");
  let community: { id: string; name: string } | null = null;
  if (sp.comunidade) {
    const c = await getCommunityBySlug(sp.comunidade);
    const access = c ? await communityAccessFor(c.id, viewer.id) : null;
    if (c && access?.memberStatus === "active") community = { id: c.id, name: c.name };
  }
  const initial = (KINDS as readonly string[]).includes(sp.tipo ?? "") ? (sp.tipo as (typeof KINDS)[number]) : "work";
  return (
    <Container className="max-w-3xl py-10">
      <SectionTitle eyebrow={community ? `Publicando em ${community.name}` : "Novo trabalho"} title="Mostre o que você criou">
        Publique o resultado — e, se quiser, o caminho até ele.
      </SectionTitle>
      <div className="mt-10">
        <PublishForm initialKind={initial === "discussion" && !community ? "work" : initial} community={community} viewerId={viewer.id} />
      </div>
    </Container>
  );
}
