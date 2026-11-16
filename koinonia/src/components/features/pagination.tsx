import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/i18n/format";
import type { Messages } from "@/i18n/types";
import { cn } from "@/lib/utils";

/** Paginação por links (funciona sem JavaScript e preserva filtros). */
export function Pagination({ page, pages, basePath, params, m }: { page: number; pages: number; basePath: string; params: Record<string, string | undefined>; m: Messages }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    if (p > 1) qs.set("pagina", String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <nav aria-label={t(m.common.page, { page })} className="mt-10 flex items-center justify-center gap-3">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ChevronLeft aria-hidden />{m.common.previous}
        </Link>
      ) : null}
      <span className="text-sm text-ink-muted" aria-current="page">{page} / {pages}</span>
      {page < pages ? (
        <Link href={href(page + 1)} rel="next" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          {m.common.next}<ChevronRight aria-hidden />
        </Link>
      ) : null}
    </nav>
  );
}
