import type { Metadata } from "next";
import { InspirationGallery } from "@/components/inspiration/gallery";
import { PageHero } from "@/components/site/page-hero";
import { repo } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inspiration", description: "Galeria de referências visuais com estilo, paleta e presets relacionados." };

export default async function InspirationPage() {
  const r = repo();
  const [posts, products] = await Promise.all([r.listInspiration(), r.listProducts()]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    style: p.style_name,
    image: p.image_url,
    palette: p.palette,
    description: p.description,
    products: p.product_ids.map((id) => byId.get(id)).filter((x): x is NonNullable<typeof x> => !!x).map((x) => ({ slug: x.slug, name: x.name })),
  }));
  return (
    <>
      <PageHero kicker="Inspiration" title={<>Referên<span className="serif-accent text-signal">cias</span></>}>
        <p>Um mural de imagens, climas e paletas. Cada referência aponta os presets que chegam naquele resultado.</p>
        <p className="mt-3 text-xs text-smoke">Imagens de demonstração produzidas pelo próprio PRESET LAB.</p>
      </PageHero>
      <div className="container-lab">{items.length ? <InspirationGallery items={items} /> : <p className="text-ash">Nenhuma referência publicada ainda.</p>}</div>
    </>
  );
}
