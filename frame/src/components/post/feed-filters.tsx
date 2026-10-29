import Link from "next/link";
import { FEED_FILTERS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

export function FeedFilters({ active, signedIn }: { active: string; signedIn: boolean }) {
  const filters = signedIn ? FEED_FILTERS : FEED_FILTERS.filter((f) => f.slug !== "seguindo");
  return (
    <nav aria-label="Filtros do feed" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {filters.map((f) => {
        const isActive = f.slug === active;
        return (
          <Link
            key={f.slug}
            href={f.slug === "para-voce" ? "/" : `/?f=${f.slug}`}
            aria-current={isActive ? "page" : undefined}
            scroll={false}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm transition-all",
              isActive ? "bg-volt-500 text-ink-950" : "bg-ink-850 text-fog-400 hover:bg-ink-800 hover:text-paper",
            )}
          >
            {f.label}
          </Link>
        );
      })}
    </nav>
  );
}
