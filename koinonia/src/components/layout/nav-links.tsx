"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem { href: string; label: string; badge?: number; badgeLabel?: string }

export function NavLinks({ items, className, onNavigate }: { items: NavItem[]; className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className={className}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex min-h-11 items-center rounded-full px-3.5 text-[0.92rem] font-medium text-ink-muted transition-colors hover:text-ink",
                active && "text-ink after:absolute after:inset-x-3.5 after:bottom-1 after:h-1 after:rounded-full after:bg-gold-400",
              )}
            >
              {item.label}
              {item.badge ? (
                <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-gold-400 px-1.5 text-[0.7rem] font-bold text-night-950">
                  {item.badge}<span className="sr-only"> {item.badgeLabel}</span>
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
