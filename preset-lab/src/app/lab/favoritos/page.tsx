import type { Metadata } from "next";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState, LabSectionTitle } from "@/components/lab/lab-ui";
import { requireUser } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { getEntitlements } from "@/lib/services/entitlements";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Favoritos" };

export default async function FavoritesPage() {
  const user = await requireUser("/lab/favoritos");
  const r = repo();
  const ent = await getEntitlements(user);
  const ids = [...ent.favoriteIds];
  const [products, categories] = await Promise.all([ids.length ? r.listProducts({ ids }) : Promise.resolve([]), r.listCategories()]);
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  if (products.length === 0) {
    return <EmptyState number="♡" title={<>Nenhum <span className="serif-accent text-signal">favorito</span></>} text="Toque no coração de qualquer preset para guardá-lo aqui e comparar depois com calma." href="/presets" cta="Explorar o catálogo" />;
  }
  return (
    <section>
      <LabSectionTitle kicker={`${products.length} ${products.length === 1 ? "preset salvo" : "presets salvos"}`} title="Favoritos" />
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} categoryName={catName.get(p.category_id ?? "")} favorite owned={ent.ownedIds.has(p.id)} loggedIn />
        ))}
      </div>
    </section>
  );
}
