"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { FEED_FILTERS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

const MAIN = ["para-voce", "seguindo"];

/** Abas "Para você / Seguindo" + seletor de áreas em carrossel (a ativa fica grande e centralizada). */
export function FeedFilters({ active, signedIn }: { active: string; signedIn: boolean }) {
  const tabs = FEED_FILTERS.filter((f) => MAIN.includes(f.slug));
  const chips = [{ slug: "todas", label: "Tudo" }, ...FEED_FILTERS.filter((f) => !MAIN.includes(f.slug))];
  const href = (slug: string) => (slug === "para-voce" || slug === "todas" ? "/" : `/?f=${slug}`);
  const current = MAIN.includes(active) ? "todas" : active;
  const dial = useRef<HTMLDivElement>(null);

  // Centraliza a área ativa no carrossel (sem rolar a página).
  useEffect(() => {
    const el = dial.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const box = dial.current;
    if (el && box) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [current]);

  return (
    <div className="space-y-2">
      <nav aria-label="Feed" className="flex items-center gap-1">
        {tabs.map((f) => {
          const isActive = f.slug === active || (f.slug === "para-voce" && !MAIN.includes(active));
          const target = f.slug === "seguindo" && !signedIn ? "/entrar?next=/?f=seguindo" : href(f.slug);
          return (
            <Link
              key={f.slug}
              href={target}
              aria-current={f.slug === active ? "page" : undefined}
              scroll={false}
              className={cn("rounded-full px-3.5 py-1.5 font-mono text-xs uppercase tracking-[0.16em] transition-colors", isActive ? "bg-paper text-ink-950" : "text-fog-400 hover:text-paper")}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>
      <div className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-ink-950 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-ink-950 to-transparent" />
        <div ref={dial} className="scrollbar-none overflow-x-auto">
          <nav aria-label="Filtrar por área" className="flex w-max items-baseline gap-6 px-10 py-2">
            {chips.map((f) => {
              const isActive = f.slug === current;
              return (
                <Link
                  key={f.slug}
                  href={href(f.slug)}
                  aria-current={isActive ? "page" : undefined}
                  scroll={false}
                  className={cn("shrink-0 whitespace-nowrap transition-all duration-300 ease-[var(--ease-out-expo)]", isActive ? "text-2xl font-medium text-paper sm:text-3xl" : "text-base text-fog-500 hover:text-fog-300")}
                >
                  {f.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
