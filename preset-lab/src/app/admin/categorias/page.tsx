import { ChevronDown } from "lucide-react";
import { deleteCategoryAction } from "@/app/actions/admin";
import { CategoryForm } from "@/components/admin/category-form";
import { InlineAction } from "@/components/admin/inline-action";
import { AdminPageHead, Empty } from "@/components/admin/page-head";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categorias" };

export default async function AdminCategories() {
  await requireAdmin();
  const r = repo();
  const [categories, products] = await Promise.all([r.listCategories(), r.listProducts({ includeUnpublished: true })]);
  const usage = (id: string, slug: string) => products.filter((p) => p.category_id === id || p.tags.includes(slug)).length;
  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  return (
    <div className="grid grid-cols-1 gap-10">
      <AdminPageHead kicker="Nº 02 — Taxonomia" title="Categorias" description="Estilos e assuntos usados como categoria principal e como tags dos presets." />

      <section aria-labelledby="lista-cat">
        <h2 id="lista-cat" className="lab-label border-b hairline pb-3 text-bone">
          {categories.length} categorias
        </h2>
        {sorted.length === 0 ? (
          <Empty>Nenhuma categoria.</Empty>
        ) : (
          <ul>
            {sorted.map((c) => (
              <li key={c.id} className="border-b hairline">
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 py-4 [&::-webkit-details-marker]:hidden">
                    <span className="lab-label w-10 text-smoke">{String(c.sort_order).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="block truncate font-mono text-xs text-smoke">/{c.slug}</span>
                    </span>
                    <Badge tone="neutral">{c.kind === "style" ? "Estilo" : "Assunto"}</Badge>
                    <span className="w-24 text-right text-sm text-ash">{usage(c.id, c.slug)} produtos</span>
                    <span className="lab-label inline-flex items-center gap-1 text-smoke group-open:text-signal">
                      Editar <ChevronDown className="size-3.5 transition group-open:rotate-180" aria-hidden />
                    </span>
                  </summary>
                  <div className="grid grid-cols-1 gap-6 pb-8 pt-2">
                    <CategoryForm category={c} />
                    <div className="border-t hairline pt-4">
                      <InlineAction action={deleteCategoryAction} fields={{ id: c.id }} variant="ghost" confirm="Confirmar exclusão" confirmText="Os produtos ficam sem categoria principal.">
                        Excluir categoria
                      </InlineAction>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="nova-cat" className="rounded-2xl border hairline p-5 md:p-8">
        <h2 id="nova-cat" className="display mb-6 text-3xl">
          Nova categoria
        </h2>
        <CategoryForm />
      </section>
    </div>
  );
}
