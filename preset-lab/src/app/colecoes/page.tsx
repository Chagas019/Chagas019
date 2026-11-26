import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/site/page-hero";
import { repo } from "@/lib/repo";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Coleções", description: "Coleções temáticas de presets do PRESET LAB." };

export default async function CollectionsPage() {
  const collections = await repo().listCollections();
  return (
    <>
      <PageHero kicker="Curadoria" title={<>Cole<span className="serif-accent text-signal">ções</span></>}>
        <p>Grupos de presets pensados para um mesmo clima. Alguns são vendidos como pacote com desconto; outros são exclusivos do Premium Club.</p>
      </PageHero>
      <div className="container-lab grid gap-6 md:grid-cols-2">
        {collections.map((c, i) => (
          <Link key={c.id} href={`/colecoes/${c.slug}`} className={`group relative block aspect-[4/5] overflow-hidden rounded-[28px] bg-graphite md:aspect-[5/4] ${i === 0 ? "md:col-span-2 md:aspect-[21/9]" : ""}`}>
            {c.cover_image && <Image src={c.cover_image} alt="" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition duration-[1.4s] ease-[var(--ease-lab)] group-hover:scale-105" />}
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
              <p className="lab-label text-ash">
                {String(i + 1).padStart(2, "0")} · {c.product_ids.length} presets{c.is_premium ? " · Premium Club" : ""}
                {c.price_cents ? ` · Pacote ${formatBRL(c.price_cents)}` : ""}
              </p>
              <h2 className="display mt-3 text-[clamp(3rem,7vw,6rem)]">{c.title}</h2>
              <p className="mt-2 max-w-lg text-ash">{c.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
