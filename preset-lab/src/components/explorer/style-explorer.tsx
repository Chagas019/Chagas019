"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExplorerStyle {
  slug: string;
  name: string;
  kind: "style" | "subject";
  description: string;
  cover: string | null;
  palette: string[];
  products: { slug: string; name: string; cover: string | null; price: string }[];
  references: { slug: string; title: string; image: string }[];
  collections: { slug: string; title: string }[];
}

/** Explorador de estilos: escolha um clima e veja referências, paleta, coleções e presets. Estado na URL (?estilo=). */
export function StyleExplorer({ styles, initial }: { styles: ExplorerStyle[]; initial: string }) {
  const [active, setActive] = useState(initial);
  const s = styles.find((x) => x.slug === active) ?? styles[0];

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("estilo", active);
    window.history.replaceState(null, "", url);
  }, [active]);

  if (!s) return null;
  const groups = [
    { title: "Estilos de edição", items: styles.filter((x) => x.kind === "style") },
    { title: "Assuntos", items: styles.filter((x) => x.kind === "subject") },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <nav aria-label="Estilos" className="lg:col-span-3">
        {groups.map((g) => (
          <div key={g.title} className="mb-6">
            <p className="lab-label mb-3 text-smoke">{g.title}</p>
            <div role="tablist" aria-orientation="vertical" className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:flex-col lg:gap-0 lg:px-0">
              {g.items.map((x) => (
                <button
                  key={x.slug}
                  role="tab"
                  aria-selected={x.slug === s.slug}
                  aria-controls="painel-estilo"
                  onClick={() => setActive(x.slug)}
                  data-testid={`style-tab-${x.slug}`}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2.5 text-left transition lg:flex lg:items-center lg:justify-between lg:rounded-none lg:border-0 lg:border-b lg:border-bone/10 lg:px-0 lg:py-3",
                    x.slug === s.slug ? "border-signal bg-signal text-signal-ink lg:bg-transparent lg:text-signal" : "border-bone/15 text-ash hover:text-bone"
                  )}
                >
                  <span className="lab-label lg:display lg:text-3xl lg:tracking-normal">{x.name}</span>
                  <span className="lab-label hidden text-smoke lg:inline">{x.products.length}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.section
          key={s.slug}
          id="painel-estilo"
          role="tabpanel"
          aria-label={s.name}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-9"
        >
          <div className="grid gap-6 md:grid-cols-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-graphite md:col-span-3">
              {s.cover && <Image src={s.cover} alt={`Referência do estilo ${s.name}`} fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" priority />}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
              <h2 className="display absolute bottom-5 left-5 right-5 text-[clamp(3rem,9vw,7rem)]">{s.name}</h2>
            </div>
            <div className="flex flex-col gap-6 md:col-span-2">
              <p className="font-serif text-3xl italic leading-snug">{s.description}</p>
              <div>
                <p className="lab-label text-smoke">Paleta de cores</p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {s.palette.slice(0, 8).map((c) => (
                    <div key={c}>
                      <div className="aspect-square rounded-xl ring-1 ring-bone/10" style={{ background: c }} />
                      <p className="mt-1 font-mono text-[10px] text-smoke">{c}</p>
                    </div>
                  ))}
                </div>
              </div>
              {s.collections.length > 0 && (
                <div>
                  <p className="lab-label text-smoke">Coleções temáticas</p>
                  <ul className="mt-2">
                    {s.collections.map((c) => (
                      <li key={c.slug}>
                        <Link href={`/colecoes/${c.slug}`} className="flex items-center justify-between border-b hairline py-3 hover:text-signal">
                          {c.title} <ArrowUpRight className="size-4" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {s.references.length > 0 && (
            <div className="mt-10">
              <p className="lab-label text-smoke">Referências fotográficas</p>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                {s.references.map((ref) => (
                  <Link key={ref.slug} href={`/inspiracao#${ref.slug}`} className="group relative aspect-[3/4] overflow-hidden rounded-[18px]">
                    <Image src={ref.image} alt={ref.title} fill sizes="(min-width:768px) 20vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />
                    <span className="absolute bottom-3 left-3 font-serif text-lg italic">{ref.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10">
            <div className="flex items-end justify-between">
              <p className="lab-label text-smoke">Presets relacionados</p>
              <Link href={`/presets?categoria=${s.slug}`} className="text-sm hover:text-signal">
                Ver todos em {s.name} →
              </Link>
            </div>
            {s.products.length ? (
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                {s.products.map((p) => (
                  <Link key={p.slug} href={`/presets/${p.slug}`} className="group">
                    <div className="relative aspect-square overflow-hidden rounded-[18px] bg-graphite">
                      {p.cover && <Image src={p.cover} alt={p.name} fill sizes="(min-width:768px) 20vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />}
                    </div>
                    <div className="mt-2 flex justify-between gap-2 text-sm">
                      <span className="truncate">{p.name}</span>
                      <span className="font-mono text-signal">{p.price}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-ash">Ainda não há presets publicados neste estilo.</p>
            )}
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
