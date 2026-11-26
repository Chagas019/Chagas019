import { ChevronDown } from "lucide-react";
import { deleteBannerAction } from "@/app/actions/admin";
import { BannerForm } from "@/components/admin/content-forms";
import { ContentTabs } from "@/components/admin/content-tabs";
import { InlineAction } from "@/components/admin/inline-action";
import { AdminPageHead, Empty } from "@/components/admin/page-head";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Banners" };

export default async function AdminBanners() {
  await requireAdmin();
  const banners = [...(await repo().listBanners({ includeInactive: true }))].sort((a, b) => a.position - b.position);
  return (
    <div className="grid grid-cols-1 gap-8">
      <AdminPageHead kicker="Nº 03.3 — Conteúdo" title="Banners" description="O primeiro banner ativo vira o destaque do topo da home." />
      <ContentTabs active="banners" />
      {banners.length === 0 ? (
        <Empty>Nenhum banner.</Empty>
      ) : (
        <ul className="border-t hairline">
          {banners.map((b) => (
            <li key={b.id} className="border-b hairline">
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 py-4 [&::-webkit-details-marker]:hidden">
                  <span className="lab-label w-8 text-smoke">{String(b.position).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{b.title}</span>
                    <span className="block truncate font-mono text-xs text-smoke">
                      {b.link_label} → {b.link_url}
                    </span>
                  </span>
                  <Badge tone={b.active ? "ok" : "neutral"}>{b.active ? "Ativo" : "Inativo"}</Badge>
                  <span className="lab-label inline-flex items-center gap-1 text-smoke group-open:text-signal">
                    Editar <ChevronDown className="size-3.5 transition group-open:rotate-180" aria-hidden />
                  </span>
                </summary>
                <div className="grid grid-cols-1 gap-6 pb-8 pt-2">
                  <BannerForm banner={b} />
                  <div className="border-t hairline pt-4">
                    <InlineAction action={deleteBannerAction} fields={{ id: b.id }} variant="ghost" confirm="Confirmar exclusão">
                      Excluir banner
                    </InlineAction>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      <section aria-labelledby="novo-banner" className="rounded-2xl border hairline p-5 md:p-8">
        <h2 id="novo-banner" className="display mb-6 text-3xl">
          Novo banner
        </h2>
        <BannerForm />
      </section>
    </div>
  );
}
