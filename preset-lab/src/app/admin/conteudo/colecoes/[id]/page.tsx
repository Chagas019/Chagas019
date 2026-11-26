import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { deleteCollectionAction } from "@/app/actions/admin";
import { CollectionForm } from "@/components/admin/content-forms";
import { productOptions } from "@/components/admin/content-tabs";
import { InlineAction } from "@/components/admin/inline-action";
import { AdminPageHead, Notice } from "@/components/admin/page-head";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { uuidSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coleção" };

export default async function CollectionEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "novo";
  if (!isNew && !uuidSchema.safeParse(id).success) notFound();
  const r = repo();
  const [collection, products] = await Promise.all([isNew ? null : r.getCollectionById(id), r.listProducts({ includeUnpublished: true, sort: "name" })]);
  if (!isNew && !collection) notFound();
  return (
    <div className="grid grid-cols-1 gap-2">
      <Link href="/admin/conteudo/colecoes" className="lab-label inline-flex items-center gap-2 text-smoke hover:text-bone">
        <ArrowLeft className="size-3.5" /> Coleções
      </Link>
      <AdminPageHead kicker="Nº 03.1 — Coleção" title={collection?.title ?? "Nova coleção"} />
      {sp.criado === "1" && <Notice>Coleção criada.</Notice>}
      <CollectionForm collection={collection ?? undefined} products={productOptions(products)} />
      {collection && (
        <div className="mt-8 border-t hairline pt-6">
          <InlineAction action={deleteCollectionAction} fields={{ id: collection.id, redirect: "1" }} variant="danger" confirm="Confirmar exclusão" confirmText="Os produtos não são apagados.">
            Excluir coleção
          </InlineAction>
        </div>
      )}
    </div>
  );
}
