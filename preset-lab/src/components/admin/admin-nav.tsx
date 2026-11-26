"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Painel", n: "00" },
  { href: "/admin/produtos", label: "Produtos", n: "01" },
  { href: "/admin/categorias", label: "Categorias", n: "02" },
  { href: "/admin/conteudo", label: "Conteúdo", n: "03" },
  { href: "/admin/vendas", label: "Vendas", n: "04" },
  { href: "/admin/usuarios", label: "Usuários", n: "05" },
];

export function AdminNav() {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));
  return (
    <nav aria-label="Admin Studio" className="min-w-0">
      <ul className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0">
        {ITEMS.map((it) => {
          const on = active(it.href);
          return (
            <li key={it.href} className="shrink-0">
              <Link
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 whitespace-nowrap rounded-full px-4 py-2 text-sm transition lg:rounded-none lg:border-b lg:px-0 lg:py-3.5 hairline",
                  on ? "bg-bone text-ink lg:bg-transparent lg:text-signal" : "text-ash hover:text-bone"
                )}
              >
                <span className={cn("lab-label hidden lg:inline", on ? "text-signal" : "text-smoke")}>{it.n}</span>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
