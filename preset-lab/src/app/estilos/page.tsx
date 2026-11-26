import type { Metadata } from "next";
import { StyleExplorer, type ExplorerStyle } from "@/components/explorer/style-explorer";
import { priceLabel } from "@/components/product/product-card";
import { PageHero } from "@/components/site/page-hero";
import { repo } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Style Explorer", description: "Explore estilos de edição: referências, paletas, coleções e presets relacionados." };

export default async function StylesPage({ searchParams }: { searchParams: Promise<{ estilo?: string }> }) {
  const r = repo();
  const [categories, products, inspiration, collections] = await Promise.all([r.listCategories(), r.listProducts({ sort: "popular" }), r.listInspiration(), r.listCollections()]);
  const styles: ExplorerStyle[] = categories.map((c) => {
    const ps = products.filter((p) => p.category_id === c.id || p.tags.includes(c.slug));
    const ids = new Set(ps.map((p) => p.id));
    return {
      slug: c.slug,
      name: c.name,
      kind: c.kind,
      description: c.description,
      cover: c.cover_image,
      palette: [...new Set(ps.flatMap((p) => p.palette))],
      products: ps.slice(0, 8).map((p) => ({ slug: p.slug, name: p.name, cover: p.cover_image, price: priceLabel(p) })),
      references: inspiration.filter((i) => i.product_ids.some((id) => ids.has(id))).slice(0, 4).map((i) => ({ slug: i.slug, title: i.title, image: i.image_url })),
      collections: collections.filter((col) => col.product_ids.some((id) => ids.has(id))).map((col) => ({ slug: col.slug, title: col.title })),
    };
  });
  const { estilo } = await searchParams;
  const initial = styles.some((s) => s.slug === estilo) ? estilo! : (styles[0]?.slug ?? "");
  return (
    <>
      <PageHero kicker="Style Explorer" title={<>Ache o seu <span className="serif-accent text-signal">clima</span></>}>
        <p>Cada estilo reúne referências fotográficas, a paleta que ele produz, coleções e os presets que chegam lá.</p>
      </PageHero>
      <div className="container-lab">{styles.length ? <StyleExplorer styles={styles} initial={initial} /> : <p className="text-ash">Nenhum estilo cadastrado ainda.</p>}</div>
    </>
  );
}
