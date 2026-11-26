import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { BuyForm } from "@/components/product/buy-form";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { getEntitlements } from "@/lib/services/entitlements";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await repo().getCollectionBySlug((await params).slug);
  return c ? { title: c.title, description: c.description } : { title: "Coleção não encontrada" };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const r = repo();
  const c = await r.getCollectionBySlug(slug);
  if (!c) notFound();
  const user = await getCurrentUser();
  const [products, categories, ent] = await Promise.all([r.listProducts({ ids: c.product_ids }), r.listCategories(), getEntitlements(user)]);
  const ordered = c.product_ids.map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  const sum = ordered.reduce((s, p) => s + p.price_cents, 0);
  const ownsAll = ordered.length > 0 && ordered.every((p) => ent.ownedIds.has(p.id) || p.product_type === "free");

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">{c.cover_image && <Image src={c.cover_image} alt="" fill priority sizes="100vw" className="object-cover opacity-55" />}</div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/20" />
        <div className="container-lab relative pb-14 pt-24 md:pb-20 md:pt-40">
          <Link href="/colecoes" className="lab-label text-ash hover:text-bone">
            ← Coleções
          </Link>
          <h1 className="display mt-5 text-[clamp(3.4rem,12vw,10rem)]">{c.title}</h1>
          <p className="mt-4 max-w-xl text-lg text-ash">{c.description}</p>
          <div className="mt-8 flex max-w-md flex-col gap-3">
            {c.is_premium &&
              (ent.subscription ? (
                <p className="flex items-center gap-2 text-ok">
                  <Check className="size-4" /> Liberada pela sua assinatura Premium Club
                </p>
              ) : (
                <Button asChild size="lg">
                  <Link href="/premium">
                    <Lock /> Coleção exclusiva do Premium Club
                  </Link>
                </Button>
              ))}
            {c.price_cents &&
              (ownsAll ? (
                <p className="flex items-center gap-2 text-ok">
                  <Check className="size-4" /> Você já tem todos os presets desta coleção
                </p>
              ) : user ? (
                <>
                  <BuyForm type="collection" id={c.id} back={`/colecoes/${c.slug}`} label={`Comprar pacote por ${formatBRL(c.price_cents)}`} testId="buy-collection" />
                  {sum > c.price_cents && <p className="text-sm text-ash">Separados sairiam por {formatBRL(sum)}.</p>}
                </>
              ) : (
                <Button asChild size="lg">
                  <Link href={`/entrar?next=/colecoes/${c.slug}`}>Entrar para comprar o pacote · {formatBRL(c.price_cents)}</Link>
                </Button>
              ))}
          </div>
        </div>
      </section>
      <div className="container-lab mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
        {ordered.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} categoryName={categories.find((x) => x.id === p.category_id)?.name} favorite={ent.favoriteIds.has(p.id)} owned={ent.ownedIds.has(p.id)} loggedIn={!!user} />
        ))}
      </div>
    </>
  );
}
