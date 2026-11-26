"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface InspirationItem {
  slug: string;
  title: string;
  style: string;
  image: string;
  palette: string[];
  description: string;
  products: { slug: string; name: string }[];
}

/** Galeria de referências com filtro por estilo (client-side; poucos itens por página). */
export function InspirationGallery({ items }: { items: InspirationItem[] }) {
  const styles = [...new Set(items.flatMap((i) => i.style.split("/").map((s) => s.trim())))];
  const [filter, setFilter] = useState<string | null>(null);
  const visible = filter ? items.filter((i) => i.style.includes(filter)) : items;
  return (
    <>
      <div className="-mx-4 mb-10 flex gap-2 overflow-x-auto px-4 scrollbar-none md:mx-0 md:flex-wrap md:px-0" aria-label="Filtrar por estilo">
        {[null, ...styles].map((s) => (
          <button key={s ?? "todos"} onClick={() => setFilter(s)} aria-pressed={filter === s} className={cn("lab-label h-10 shrink-0 rounded-full border px-4 transition", filter === s ? "border-signal bg-signal text-signal-ink" : "border-bone/15 text-ash hover:text-bone")}>
            {s ?? "Todos"}
          </button>
        ))}
      </div>
      <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 [&>*]:mb-10">
        {visible.map((post, i) => (
          <article key={post.slug} id={post.slug} className="scroll-mt-28 break-inside-avoid">
            <div className="relative overflow-hidden rounded-[22px]">
              <Image src={post.image} alt={post.title} width={1200} height={1500} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className={cn("w-full object-cover", i % 3 === 1 ? "aspect-[3/4]" : "aspect-[4/5]")} />
              <span className="lab-label absolute left-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 backdrop-blur">{post.style}</span>
            </div>
            <div className="mt-4 flex items-start justify-between gap-4">
              <h2 className="font-serif text-3xl italic leading-none">{post.title}</h2>
              <div className="flex shrink-0 gap-1 pt-1" aria-label="Paleta de cores">
                {post.palette.map((c) => (
                  <span key={c} title={c} className="size-4 rounded-full ring-1 ring-bone/15" style={{ background: c }} />
                ))}
              </div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ash">{post.description}</p>
            {post.products.length > 0 && (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="lab-label text-smoke">Presets:</span>
                {post.products.map((p) => (
                  <Link key={p.slug} href={`/presets/${p.slug}`} className="rounded-full bg-bone/8 px-3 py-1 hover:bg-signal hover:text-signal-ink">
                    {p.name}
                  </Link>
                ))}
              </p>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
