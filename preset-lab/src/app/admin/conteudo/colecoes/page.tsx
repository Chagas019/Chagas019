import Link from "next/link";
import { Plus } from "lucide-react";
import { deleteCollectionAction } from "@/app/actions/admin";
import { ContentTabs } from "@/components/admin/content-tabs";
import { InlineAction } from "@/components/admin/inline-action";
import { AdminPageHead, Empty, Notice } from "@/components/admin/page-head";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coleções" };

export default async function AdminCollections({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const collections = [...(await repo().listCollections({ includeUnpublished: true }))].sort((a, b) => a.sort_order - b.sort_order);
  return (
    <div className="grid grid-cols-1 gap-8">
      <AdminPageHead
        kicker="Nº 03.1 — Conteúdo"
        title="Coleções"
        actions={
          <Button asChild>
            <Link href="/admin/conteudo/colecoes/novo">
              <Plus /> Nova coleção
            </Link>
          </Button>
        }
      />
      <ContentTabs active="colecoes" />
      {sp.excluido === "1" && <Notice>Coleção excluída.</Notice>}
      {collections.length === 0 ? (
        <Empty>Nenhuma coleção.</Empty>
      ) : (
        <ul className="border-t hairline">
          {collections.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b hairline py-4">
              <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-graphite-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.cover_image && <img src={c.cover_image} alt="" className="size-full object-cover" loading="lazy" />}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/conteudo/colecoes/${c.id}`} className="block truncate font-medium hover:text-signal">
                  {c.title}
                </Link>
                <p className="lab-label text-smoke">
                  {c.product_ids.length} produtos · {c.price_cents ? formatBRL(c.price_cents) : "sem preço de pacote"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={c.status === "published" ? "ok" : "neutral"}>{c.status === "published" ? "Publicada" : "Rascunho"}</Badge>
                {c.is_premium && <Badge tone="club">Club</Badge>}
                {c.featured && <Badge tone="warn">Destaque</Badge>}
              </div>
              <div className="flex gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/conteudo/colecoes/${c.id}`}>Editar</Link>
                </Button>
                <InlineAction action={deleteCollectionAction} fields={{ id: c.id }} variant="ghost" confirm="Confirmar exclusão">
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
