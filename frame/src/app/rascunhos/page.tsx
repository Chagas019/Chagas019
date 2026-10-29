import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePen } from "lucide-react";
import { getViewer } from "@/server/session";
import { listDrafts } from "@/server/services/posts";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, SectionTitle } from "@/components/ui/misc";
import { mediaUrl, timeAgo } from "@/lib/utils";

export const metadata = { title: "Rascunhos", robots: { index: false } };

export default async function DraftsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?next=/rascunhos");
  const drafts = await listDrafts(viewer.id);
  return (
    <Container className="max-w-4xl space-y-8 py-10">
      <SectionTitle eyebrow="Só você vê" title="Rascunhos" />
      {drafts.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drafts.map((d) => (
            <li key={d.id}>
              <Link href={`/p/${d.id}/editar`} className="group block overflow-hidden rounded-[var(--radius-md)] bg-ink-850 ring-1 ring-inset ring-white/[0.06] hover:ring-volt-500/60">
                <div className="relative aspect-[4/3] bg-ink-800">
                  {d.coverId && d.coverKind === "image" ? <Image src={mediaUrl(d.coverId, "thumb")} alt="" fill unoptimized className="object-cover" /> : <FilePen className="absolute inset-0 m-auto size-8 text-fog-500" aria-hidden />}
                </div>
                <div className="p-3">
                  <p className="truncate font-medium">{d.title}</p>
                  <p className="text-xs text-fog-500">Editado {timeAgo(d.updatedAt)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<FilePen className="size-6" />} title="Nenhum rascunho" action={<ButtonLink href="/publicar">Criar publicação</ButtonLink>}>
          Use “Salvar rascunho” ao publicar para terminar depois.
        </EmptyState>
      )}
    </Container>
  );
}
