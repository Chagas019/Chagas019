import Link from "next/link";
import { Plus } from "lucide-react";
import { deleteInspirationAction } from "@/app/actions/admin";
import { ContentTabs } from "@/components/admin/content-tabs";
import { InlineAction } from "@/components/admin/inline-action";
import { AdminPageHead, Empty, Notice } from "@/components/admin/page-head";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inspirações" };

export default async function AdminInspiration({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const posts = [...(await repo().listInspiration({ includeUnpublished: true }))].sort((a, b) => a.sort_order - b.sort_order);
  return (
    <div className="grid grid-cols-1 gap-8">
      <AdminPageHead
        kicker="Nº 03.2 — Conteúdo"
        title="Inspirações"
        actions={
          <Button asChild>
            <Link href="/admin/conteudo/inspiracoes/novo">
              <Plus /> Nova inspiração
            </Link>
          </Button>
        }
      />
      <ContentTabs active="inspiracoes" />
      {sp.excluido === "1" && <Notice>Inspiração excluída.</Notice>}
      {posts.length === 0 ? (
        <Empty>Nenhuma inspiração.</Empty>
      ) : (
        <ul className="border-t hairline">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b hairline py-4">
              <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-graphite-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.image_url && <img src={p.image_url} alt="" className="size-full object-cover" loading="lazy" />}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/conteudo/inspiracoes/${p.id}`} className="block truncate font-medium hover:text-signal">
                  {p.title}
                </Link>
                <p className="lab-label flex items-center gap-2 text-smoke">
                  {p.style_name || "—"} · {p.product_ids.length} presets
                  <span className="flex">
                    {p.palette.map((c) => (
                      <span key={c} className="size-3 rounded-full border border-ink" style={{ background: c }} />
                    ))}
                  </span>
                </p>
              </div>
              <Badge tone={p.status === "published" ? "ok" : "neutral"}>{p.status === "published" ? "Publicada" : "Rascunho"}</Badge>
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/conteudo/inspiracoes/${p.id}`}>Editar</Link>
                </Button>
                <InlineAction action={deleteInspirationAction} fields={{ id: p.id }} variant="ghost" confirm="Confirmar exclusão">
                  Excluir
                </InlineAction>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
