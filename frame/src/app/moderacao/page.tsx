import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { isModerator, requireViewerPage } from "@/server/session";
import { listReports } from "@/server/services/moderation";
import { ReportActions, RestoreButton } from "@/components/moderation/report-actions";
import { Badge, Container, EmptyState, SectionTitle } from "@/components/ui/misc";
import { REPORT_REASONS, labelOf } from "@/lib/taxonomy";
import { cn, timeAgo } from "@/lib/utils";

export const metadata = { title: "Moderação", robots: { index: false } };

const TARGET = { post: "Publicação", comment: "Comentário", user: "Perfil", community: "Comunidade", collab: "Oportunidade (Collab)" } as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const viewer = await requireViewerPage("/moderacao");
  if (!isModerator(viewer)) notFound();
  const { status: s } = await searchParams;
  const status = s === "resolved" || s === "dismissed" ? s : "open";
  const reports = await listReports(viewer, status);
  return (
    <Container className="max-w-4xl space-y-8 py-10">
      <SectionTitle eyebrow="Confiança e segurança" title="Fila de moderação">
        Denúncias de direitos autorais, assédio e ódio aparecem primeiro. Decisões ficam registradas no log de moderação.
      </SectionTitle>
      <nav className="flex gap-2">
        {(["open", "resolved", "dismissed"] as const).map((x) => (
          <Link key={x} href={x === "open" ? "/moderacao" : `/moderacao?status=${x}`} className={cn("rounded-full px-4 py-2 text-sm", status === x ? "bg-paper text-ink-950" : "bg-ink-850 text-fog-400")}>
            {x === "open" ? "Abertas" : x === "resolved" ? "Resolvidas" : "Arquivadas"}
          </Link>
        ))}
      </nav>
      {reports.length ? (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="space-y-3 rounded-[var(--radius-md)] bg-ink-850 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.reason === "copyright" ? "ember" : r.reason === "harassment" || r.reason === "hate" ? "danger" : "neutral"}>{labelOf(REPORT_REASONS, r.reason)}</Badge>
                <Badge>{TARGET[r.targetType]}</Badge>
                {r.sameTarget > 1 ? <Badge tone="danger">{r.sameTarget} denúncias</Badge> : null}
                {r.preview.status === "removed" ? <Badge tone="danger">Removido</Badge> : null}
                <span className="ml-auto text-xs text-fog-500">{timeAgo(r.createdAt)} · por {r.reporterHandle ? `@${r.reporterHandle}` : "conta excluída"}</span>
              </div>
              <p className="text-sm">
                {r.preview.href ? (
                  <Link href={r.preview.href} className="text-paper underline underline-offset-4" target="_blank">
                    {r.preview.label}
                  </Link>
                ) : (
                  <span className="text-fog-500">{r.preview.label}</span>
                )}
              </p>
              {r.details ? <p className="whitespace-pre-line rounded-[var(--radius-sm)] bg-ink-900 p-3 text-sm text-fog-300">{r.details}</p> : null}
              {status === "open" ? <ReportActions reportId={r.id} /> : r.preview.status === "removed" && (r.targetType === "post" || r.targetType === "comment") ? <RestoreButton targetType={r.targetType} targetId={r.targetId} /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<ShieldCheck className="size-6" />} title="Nada na fila">Nenhuma denúncia {status === "open" ? "aberta" : "nesta lista"}.</EmptyState>
      )}
    </Container>
  );
}
