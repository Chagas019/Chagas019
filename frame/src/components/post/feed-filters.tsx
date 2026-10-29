import Link from "next/link";
import { FEED_FILTERS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

const MAIN = ["para-voce", "seguindo"];

/** Abas "Para você / Seguindo" + filtros por área. */
export function FeedFilters({ active, signedIn }: { active: string; signedIn: boolean }) {
  const tabs = FEED_FILTERS.filter((f) => MAIN.includes(f.slug));
  const chips = FEED_FILTERS.filter((f) => !MAIN.includes(f.slug));
  const href = (slug: string) => (slug === "para-voce" ? "/" : `/?f=${slug}`);
  return (
    <div className="space-y-3">
      <nav aria-label="Feed" className="flex items-end gap-6 border-b border-white/[0.08]">
        {tabs.map((f) => {
          const isActive = f.slug === active;
          const target = f.slug === "seguindo" && !signedIn ? "/entrar?next=/?f=seguindo" : href(f.slug);
          return (
            <Link
              key={f.slug}
              href={target}
              aria-current={isActive ? "page" : undefined}
              scroll={false}
              className={cn(
                "-mb-px border-b-2 pb-2.5 font-display text-2xl transition-colors sm:text-3xl",
                isActive ? "border-volt-500 text-paper" : "border-transparent text-fog-500 hover:text-paper",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>
      <nav aria-label="Filtrar por área" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {chips.map((f) => {
          const isActive = f.slug === active;
          return (
            <Link
              key={f.slug}
              href={isActive ? "/" : href(f.slug)}
              aria-current={isActive ? "page" : undefined}
              scroll={false}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-all",
                isActive ? "bg-volt-500 text-ink-950" : "bg-ink-850 text-fog-400 hover:bg-ink-800 hover:text-paper",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
