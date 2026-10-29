"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, Plus, Swords, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDictionary } from "@/i18n";

const t = getDictionary();

const LINKS = [
  { href: "/", label: t.nav.inspiration },
  { href: "/descobrir", label: t.nav.discover },
  { href: "/lab", label: t.nav.lab },
  { href: "/desafios", label: t.nav.challenges },
  { href: "/comunidades", label: t.nav.communities },
  { href: "/collab", label: t.nav.collab },
];

const AI_LINK = { href: "/ai", label: t.nav.ai };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavLinks({ aiEnabled }: { aiEnabled: boolean }) {
  const pathname = usePathname();
  const links = aiEnabled ? [...LINKS, AI_LINK] : LINKS;
  return (
    <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(pathname, l.href) ? "page" : undefined}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors",
            isActive(pathname, l.href) ? "text-volt-500" : "text-fog-300 hover:text-paper",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNav({ handle }: { handle: string | null }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Início", icon: Home },
    { href: "/descobrir", label: t.nav.discover, icon: Compass },
    { href: handle ? "/publicar" : "/cadastro", label: t.nav.publish, icon: Plus, primary: true },
    { href: "/desafios", label: t.nav.challenges, icon: Swords },
    handle ? { href: `/u/${handle}`, label: t.nav.profile, icon: User } : { href: "/entrar", label: "Entrar", icon: User },
  ];
  return (
    <nav aria-label="Navegação rápida" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.06] bg-ink-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const Icon = it.icon;
          const active = isActive(pathname, it.href);
          return (
            <li key={it.label}>
              <Link href={it.href} aria-current={active ? "page" : undefined} className="flex flex-col items-center gap-1 py-2.5 text-[11px]">
                {"primary" in it && it.primary ? (
                  <span className="grid size-9 place-items-center rounded-full bg-volt-500 text-ink-950">
                    <Icon className="size-5" aria-hidden />
                  </span>
                ) : (
                  <Icon className={cn("size-5", active ? "text-paper" : "text-fog-500")} aria-hidden />
                )}
                <span className={cn("primary" in it && it.primary ? "sr-only" : "", active ? "text-paper" : "text-fog-500")}>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

