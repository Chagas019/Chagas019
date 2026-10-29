import { requireViewerPage } from "@/server/session";
import { getCommunityBySlug } from "@/server/services/communities";
import { communityAccessFor } from "@/server/services/access";
import { PublishForm } from "@/components/post/publish-form";
import { getProject } from "@/server/services/studio";
import { CATEGORIES, type CategorySlug } from "@/lib/taxonomy";
import { Container, SectionTitle } from "@/components/ui/misc";

export const metadata = { title: "Publicar" };

const KINDS = ["work", "showcase", "tutorial", "discussion"] as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ tipo?: string; comunidade?: string; titulo?: string; texto?: string; categoria?: string; projeto?: string }> }) {
  const sp = await searchParams;
  const viewer = await requireViewerPage("/publicar");
  let community: { id: string; name: string } | null = null;
  if (sp.comunidade) {
    const c = await getCommunityBySlug(sp.comunidade);
    const access = c ? await communityAccessFor(c.id, viewer.id) : null;
    if (c && access?.memberStatus === "active") community = { id: c.id, name: c.name };
  }
  // Pré-preenchimento vindo do estúdio, do laboratório ou de um desafio (só texto; o servidor valida tudo ao publicar).
  const project = sp.projeto ? await getProject(viewer.id, sp.projeto) : null;
  const prefill = {
    title: (project?.title ?? sp.titulo ?? "").slice(0, 140),
    body: (sp.texto ?? (project ? project.description.split("\n\n")[0] ?? "" : "")).slice(0, 5000),
    categories: CATEGORIES.some((c) => c.slug === sp.categoria) ? [sp.categoria as CategorySlug] : [],
    projectId: project?.id ?? null,
  };
  const initial = (KINDS as readonly string[]).includes(sp.tipo ?? "") ? (sp.tipo as (typeof KINDS)[number]) : "work";
  return (
    <Container className="max-w-3xl py-10">
      <SectionTitle eyebrow={community ? `Publicando em ${community.name}` : "Novo trabalho"} title="Mostre o que você criou">
        Publique o resultado — e, se quiser, o caminho até ele.
      </SectionTitle>
      <div className="mt-10">
        <PublishForm initialKind={initial === "discussion" && !community ? "work" : initial} community={community} viewerId={viewer.id} prefill={prefill} />
      </div>
    </Container>
  );
}
