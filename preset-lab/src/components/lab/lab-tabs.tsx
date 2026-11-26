"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const LAB_TABS = [
  { href: "/lab", label: "Biblioteca" },
  { href: "/lab/favoritos", label: "Favoritos" },
  { href: "/lab/downloads", label: "Downloads" },
  { href: "/lab/compras", label: "Compras" },
  { href: "/lab/assinatura", label: "Assinatura" },
  { href: "/lab/perfil", label: "Perfil" },
];

/** Abas do My Lab: roláveis no mobile, item ativo destacado. */
export function LabTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções do My Lab" className="-mx-4 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
      <ul className="flex w-max gap-1.5 md:w-auto">
        {LAB_TABS.map((t, i) => {
          const active = t.href === "/lab" ? pathname === "/lab" : pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-full px-4 text-sm transition-colors duration-300",
                  active ? "bg-bone text-ink" : "text-bone/75 hover:bg-bone/8 hover:text-bone"
                )}
              >
                <span className={cn("font-mono text-[10px]", active ? "text-signal" : "text-smoke")}>{String(i + 1).padStart(2, "0")}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
