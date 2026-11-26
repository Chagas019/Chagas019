import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, FileArchive } from "lucide-react";
import { deleteProductAction, deleteProductFileAction } from "@/app/actions/admin";
import { InlineAction } from "@/components/admin/inline-action";
import { AdminPageHead, Empty, Notice } from "@/components/admin/page-head";
import { ProductForm } from "@/components/admin/product-form";
import { ProductStatusBadge } from "@/components/admin/status";
import { ProductFileUploader } from "@/components/admin/upload-field";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { uuidSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar produto" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!uuidSchema.safeParse(id).success) notFound();
  const r = repo();
  const [product, categories, files] = await Promise.all([r.getProductById(id, { includeUnpublished: true }), r.listCategories(), r.listProductFiles(id)]);
  if (!product) notFound();

  return (
    <div className="grid grid-cols-1 gap-2">
      <Link href="/admin/produtos" className="lab-label inline-flex items-center gap-2 text-smoke hover:text-bone">
        <ArrowLeft className="size-3.5" /> Produtos
      </Link>
      <AdminPageHead
        kicker={`Nº 01 — Produto · ${product.downloads_count} downloads`}
        title={product.name}
        actions={
          <>
            <ProductStatusBadge status={product.status} />
            {product.status === "published" && (
              <Link href={`/presets/${product.slug}`} className="lab-label inline-flex items-center gap-1 text-smoke hover:text-bone" target="_blank">
                Ver na loja <ArrowUpRight className="size-3" />
              </Link>
            )}
          </>
        }
      />
      {sp.criado === "1" && <Notice>Produto criado. Agora envie os arquivos do preset abaixo.</Notice>}

      <section aria-labelledby="arquivos" className="grid grid-cols-1 gap-6 border-t hairline py-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
        <div>
          <h2 id="arquivos" className="lab-label text-bone">
            Arquivos do preset
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-smoke">Entregues só para quem tem acesso, por link assinado de curta duração.</p>
        </div>
        <div className="grid grid-cols-1 min-w-0 gap-5">
          {files.length === 0 ? (
            <Empty>Nenhum arquivo enviado. Clientes não conseguirão baixar este produto.</Empty>
          ) : (
            <ul className="border-t hairline">
              {files.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b hairline py-3">
                  <FileArchive className="size-4 shrink-0 text-smoke" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{f.file_name}</p>
                    <p className="lab-label text-smoke">
                      {f.format} · {formatBytes(f.size_bytes)} · {formatDateTime(f.created_at)}
                    </p>
                  </div>
                  <InlineAction action={deleteProductFileAction} fields={{ id: f.id }} variant="ghost" confirm="Confirmar exclusão" confirmText="Remover do storage?">
                    Excluir
                  </InlineAction>
                </li>
              ))}
            </ul>
          )}
          <ProductFileUploader productId={product.id} />
        </div>
      </section>

      <ProductForm product={product} categories={categories} />

      <section aria-labelledby="zona-perigo" className="mt-10 grid gap-4 rounded-2xl border border-danger/30 p-5 md:flex md:items-center md:justify-between">
        <div>
          <h2 id="zona-perigo" className="lab-label text-danger">
            Excluir produto
          </h2>
          <p className="mt-1 text-sm text-smoke">Remove o produto, os arquivos do storage, favoritos e o histórico de downloads. Para tirar do ar sem perder dados, prefira arquivar.</p>
        </div>
        <InlineAction action={deleteProductAction} fields={{ id: product.id, redirect: "1" }} variant="danger" confirm="Confirmar exclusão" size="md">
          Excluir produto
        </InlineAction>
      </section>
    </div>
  );
}
