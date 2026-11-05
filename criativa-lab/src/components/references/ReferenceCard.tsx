"use client";

import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import type { Reference } from "@/lib/types";
import { RefArt } from "@/components/art/RefArt";
import { REFERENCE_KINDS } from "@/lib/content/references";
import { useApp } from "@/lib/store";

const ASPECT = { portrait: "aspect-[4/5.2]", landscape: "aspect-[4/2.9]", square: "aspect-square" } as const;

export function FavoriteButton({ slug, className = "" }: { slug: string; className?: string }) {
  const { isFavorite, toggleFavorite } = useApp();
  const fav = isFavorite(slug);
  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(slug).catch(() => null);
      }}
      aria-pressed={fav}
      aria-label={fav ? "Remover dos favoritos" : "Salvar nos favoritos"}
      className={`grid size-10 place-items-center rounded-full backdrop-blur-md transition-colors ${
        fav ? "bg-lime text-ink" : "bg-black/50 text-paper hover:bg-black/70"
      } ${className}`}
    >
      <motion.span key={String(fav)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
        <Heart className="size-4" fill={fav ? "currentColor" : "none"} />
      </motion.span>
    </motion.button>
  );
}

export function ReferenceCard({ reference, onOpen }: { reference: Reference; onOpen: (r: Reference) => void }) {
  const kind = REFERENCE_KINDS.find((k) => k.id === reference.kind)?.label;
  return (
    <article className="group relative mb-4 break-inside-avoid">
      <div className={`relative overflow-hidden rounded-[var(--radius-card)] border border-line ${ASPECT[reference.ratio]}`}>
        <button
          onClick={() => onOpen(reference)}
          className="absolute inset-0 block h-full w-full text-left"
          aria-label={`Abrir referência: ${reference.title}`}
        >
          <RefArt {...reference} className="h-full w-full transition-transform duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.05]" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 via-35% to-transparent to-60% transition-opacity duration-500" />
          <span className="absolute inset-x-0 bottom-0 translate-y-2 p-4 transition-transform duration-500 group-hover:translate-y-0">
            <span className="label block !text-[10px] !text-paper/70">{kind}</span>
            <span className="mt-1 block font-display text-lg font-semibold leading-tight">{reference.title}</span>
          </span>
        </button>
        <FavoriteButton slug={reference.slug} className="absolute right-3 top-3" />
      </div>
    </article>
  );
}
