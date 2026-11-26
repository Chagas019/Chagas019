import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilterBar } from "@/components/marketplace/filter-bar";
import { ProductCard } from "@/components/product/product-card";
import { PageHero } from "@/components/site/page-hero";
import { getCurrentUser } from "@/lib/auth";
import { parseCatalogParams } from "@/lib/catalog";
import { repo } from "@/lib/repo";
import { getEntitlements } from "@/lib/services/entitlements";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Presets", description: "Catálogo de presets para Lightroom: gratuitos e premium, por estilo e por tema." };

export default async function PresetsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseCatalogParams(await searchParams);
  const user = await getCurrentUser();
  const r = repo();
  const [products, categories, ent] = await Promise.all([r.listProducts(query), r.listCategories(), getEntitlements(user)]);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const current = categories.find((c) => c.slug === query.category);

  return (
    <>
      <PageHero kicker="Marketplace" title={current ? current.name : <>Todos os <span className="text-signal">presets</span></>}>
        <p>{current?.description ?? "Filtre por clima, assunto ou tipo de acesso. Os gratuitos baixam com uma conta; os premium são seus para sempre depois da compra."}</p>
      </PageHero>
      <div className="container-lab">
        <Suspense>
          <FilterBar categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} total={products.length} />
        </Suspense>
        {products.length ? (
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4" data-testid="product-grid">
            {products.map((p, i) => (
              <div key={p.id} className={i % 7 === 3 ? "md:translate-y-10" : undefined}>
                <ProductCard product={p} index={i} categoryName={catName.get(p.category_id ?? "")} favorite={ent.favoriteIds.has(p.id)} owned={ent.ownedIds.has(p.id)} loggedIn={!!user} priority={i < 4} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-16 rounded-[28px] border border-dashed border-bone/15 px-6 py-20 text-center" data-testid="empty-state">
            <p className="display text-5xl">Nada por aqui.</p>
            <p className="mx-auto mt-4 max-w-md text-ash">Nenhum preset combina com esses filtros. Tente outra palavra ou outro estilo.</p>
            <Link href="/presets" className="mt-8 inline-flex h-12 items-center rounded-full bg-bone px-6 text-sm font-medium text-ink">
              Ver todos os presets
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
