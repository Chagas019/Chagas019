import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { getPostDetail } from "@/server/services/posts";
import { EditPostForm } from "@/components/post/edit-form";
import { Container, SectionTitle } from "@/components/ui/misc";

export const metadata = { title: "Editar publicação", robots: { index: false } };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/entrar?next=/p/${id}/editar`);
  const detail = await getPostDetail(viewer, id);
  if (!detail || detail.post.authorId !== viewer.id || detail.post.status === "removed") notFound();
  const p = detail.post;
  return (
    <Container className="max-w-3xl space-y-8 py-10">
      <SectionTitle eyebrow={p.status === "draft" ? "Rascunho" : "Editar"} title={p.title} />
      <EditPostForm
        post={{
          id: p.id,
          title: p.title,
          body: p.body,
          categories: p.categories,
          tools: p.tools,
          visibility: p.visibility,
          isCollaborative: p.isCollaborative,
          credits: p.credits,
          commentsEnabled: p.commentsEnabled,
          isDraft: p.status === "draft",
          alts: detail.media.map((m) => ({ id: m.id, alt: m.alt, isImage: m.kind === "image" })),
        }}
      />
    </Container>
  );
}
