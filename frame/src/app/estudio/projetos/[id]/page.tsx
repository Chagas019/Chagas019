import { notFound } from "next/navigation";
import { requireViewerPage } from "@/server/session";
import { getProject } from "@/server/services/studio";
import { ProjectEditor } from "@/components/studio/project-editor";
import { Container } from "@/components/ui/misc";
import { Sparkle } from "@/components/ui/sparkle";

export const metadata = { title: "Projeto", robots: { index: false } };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewerPage(`/estudio/projetos/${id}`);
  const p = await getProject(viewer.id, id);
  if (!p) notFound();
  return (
    <Container className="max-w-6xl space-y-6 py-8">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-fog-300">
        <Sparkle className="size-3.5 text-volt-500" /> Meu estúdio · projeto privado
      </p>
      <ProjectEditor project={{ id: p.id, title: p.title, description: p.description, status: p.status, tasks: p.tasks, links: p.links, publishedPostId: p.publishedPostId }} />
    </Container>
  );
}
