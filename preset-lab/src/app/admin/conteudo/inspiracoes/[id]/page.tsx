import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { deleteInspirationAction } from "@/app/actions/admin";
import { InspirationForm } from "@/components/admin/content-forms";
import { productOptions } from "@/components/admin/content-tabs";
import { InlineAction } from "@/components/admin/inline-action";
import { AdminPageHead, Notice } from "@/components/admin/page-head";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { uuidSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inspiração" };

export default async function InspirationEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "novo";
  if (!isNew && !uuidSchema.safeParse(id).success) notFound();
  const r = repo();
  const [posts, products] = await Promise.all([isNew ? [] : r.listInspiration({ includeUnpublished: true }), r.listProducts({ includeUnpublished: true, sort: "name" })]);
  const post = isNew ? null : posts.find((p) => p.id === id) ?? null;
  if (!isNew && !post) notFound();
  return (
    <div className="grid grid-cols-1 gap-2">
      <Link href="/admin/conteudo/inspiracoes" className="lab-label inline-flex items-center gap-2 text-smoke hover:text-bone">
        <ArrowLeft className="size-3.5" /> Inspirações
      </Link>
      <AdminPageHead kicker="Nº 03.2 — Inspiração" title={post?.title ?? "Nova inspiração"} />
      {sp.criado === "1" && <Notice>Inspiração criada.</Notice>}
      <InspirationForm post={post ?? undefined} products={productOptions(products)} />
      {post && (
        <div className="mt-8 border-t hairline pt-6">
          <InlineAction action={deleteInspirationAction} fields={{ id: post.id, redirect: "1" }} variant="danger" confirm="Confirmar exclusão">
            Excluir inspiração
          </InlineAction>
        </div>
      )}
    </div>
  );
}
