import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "colecoes", href: "/admin/conteudo/colecoes", label: "Coleções" },
  { key: "inspiracoes", href: "/admin/conteudo/inspiracoes", label: "Inspirações" },
  { key: "banners", href: "/admin/conteudo/banners", label: "Banners da home" },
];

export function ContentTabs({ active }: { active?: string }) {
  return (
    <nav aria-label="Seções de conteúdo" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      {TABS.map((t) => (
        <Link key={t.key} href={t.href} aria-current={active === t.key ? "page" : undefined} className={cn("shrink-0 rounded-full border px-4 py-2 text-sm transition", active === t.key ? "border-bone bg-bone text-ink" : "hairline text-ash hover:text-bone")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function productOptions(products: { id: string; name: string; status: string }[]) {
  return products.map((p) => ({ value: p.id, label: p.name, meta: p.status === "published" ? undefined : p.status === "draft" ? "rascunho" : "arquivado" }));
}
