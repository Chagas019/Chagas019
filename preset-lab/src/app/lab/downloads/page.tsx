import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, LabSectionTitle } from "@/components/lab/lab-ui";
import { requireUser } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Downloads" };

export default async function DownloadsPage() {
  const user = await requireUser("/lab/downloads");
  const r = repo();
  const downloads = await r.listDownloads(user.id);
  if (downloads.length === 0) {
    return <EmptyState number="↓" title={<>Nenhum <span className="serif-accent text-signal">download</span></>} text="Quando você baixar um preset, ele aparece aqui com data e arquivo — útil para reinstalar num aparelho novo." href="/presets?acesso=free" cta="Baixar um preset gratuito" />;
  }
  const productIds = [...new Set(downloads.map((d) => d.product_id))];
  const fileIds = [...new Set(downloads.map((d) => d.file_id).filter((x): x is string => !!x))];
  const [products, files] = await Promise.all([r.listProducts({ ids: productIds, includeUnpublished: true }), Promise.all(fileIds.map((id) => r.getProductFile(id)))]);
  const productById = new Map(products.map((p) => [p.id, p]));
  const fileById = new Map(files.filter((f) => !!f).map((f) => [f!.id, f!]));

  return (
    <section>
      <LabSectionTitle kicker={`${downloads.length} ${downloads.length === 1 ? "registro" : "registros"}`} title="Downloads" />
      <ol className="mt-8 border-t hairline">
        {downloads.map((d) => {
          const p = productById.get(d.product_id);
          const f = d.file_id ? fileById.get(d.file_id) : undefined;
          return (
            <li key={d.id} className="grid gap-1 border-b hairline py-4 sm:grid-cols-12 sm:items-center sm:gap-6" data-testid="download-row">
              <time dateTime={d.created_at} className="lab-label text-smoke sm:col-span-3">
                {formatDateTime(d.created_at)}
              </time>
              <p className="min-w-0 truncate text-[17px] font-medium tracking-tight sm:col-span-5">
                {p && p.status === "published" ? (
                  <Link href={`/presets/${p.slug}`} className="link-underline">
                    {p.name}
                  </Link>
                ) : (
                  (p?.name ?? "Preset removido do catálogo")
                )}
              </p>
              <p className="min-w-0 truncate font-mono text-xs text-ash sm:col-span-4 sm:text-right">{f ? f.file_name : d.file_id ? "Arquivo substituído" : "—"}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
