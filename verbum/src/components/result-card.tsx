"use client";
import Link from "next/link";
import { BookOpen, Music2, Mic2, Sparkles, ScrollText, BookMarked, Tag, CirclePlay } from "lucide-react";
import type { SearchResult, Category } from "@/lib/search";
import { CATEGORY_LABEL } from "@/lib/search";
import type { SavedKind } from "@/lib/store/types";
import { themeLabel } from "@/data/themes";
import { SaveButton } from "./ui/save-button";
import { ExtLink, VerifiedBadge } from "./ui/primitives";

const ICONS: Record<Category, React.ComponentType<{ className?: string }>> = {
  biblia: BookOpen, musica: Music2, pregacao: Mic2, santo: Sparkles, documento: ScrollText, catecismo: BookMarked, tema: Tag,
};
const KIND: Record<Category, SavedKind> = {
  biblia: "bible", musica: "song", pregacao: "preacher", santo: "saint", documento: "source", catecismo: "catechism", tema: "link",
};

export function ResultCard({ r }: { r: SearchResult }) {
  const Icon = ICONS[r.category];
  const internal = r.url?.startsWith("/");
  return (
    <article className="group flex flex-col gap-3 rounded-2xl border border-ivory-300/70 bg-white/85 p-5 shadow-card transition hover:border-gold-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-700">
          <Icon className="h-4 w-4" /> {CATEGORY_LABEL[r.category]}
        </div>
        <SaveButton compact item={{ kind: KIND[r.category], ref_id: r.id, title: r.title, subtitle: r.source, url: r.url, payload: { description: r.description, category: r.category, meta: r.meta ?? {} } }} />
      </div>
      <div>
        <h3 className="font-serif text-lg leading-snug text-royal-900">{r.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{r.description}</p>
      </div>
      <p className="text-xs text-ink-mute">Fonte: {r.source}</p>
      {r.themes.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {r.themes.slice(0, 4).map((t) => <li key={t} className="rounded-full bg-ivory-200 px-2 py-0.5 text-[11px] text-ink-soft">{themeLabel(t)}</li>)}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <VerifiedBadge verified={r.verified} />
        {r.url && (internal ? (
          <Link href={r.url} className="text-sm font-medium text-royal-700 hover:underline">{r.urlLabel ?? "Abrir"}</Link>
        ) : (
          <ExtLink href={r.url}>{r.urlLabel ?? "Abrir fonte"}</ExtLink>
        ))}
        {r.meta?.youtube && <ExtLink href={r.meta.youtube}><CirclePlay className="h-3.5 w-3.5" /> YouTube</ExtLink>}
        {r.meta?.official && <ExtLink href={r.meta.official}>Site oficial</ExtLink>}
        {r.category === "biblia" && !r.url && <span className="text-xs text-ink-mute">Leia na sua Bíblia</span>}
      </div>
    </article>
  );
}
