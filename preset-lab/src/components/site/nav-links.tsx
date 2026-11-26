"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <ul className="flex items-center gap-1">
      {items.map((i) => {
        const active = path === i.href || path.startsWith(`${i.href}/`);
        return (
          <li key={i.href}>
            <Link href={i.href} aria-current={active ? "page" : undefined} className={cn("relative rounded-full px-4 py-2 text-sm transition-colors", active ? "text-bone" : "text-bone/60 hover:text-bone")}>
              {i.label}
              {active && <span aria-hidden className="absolute inset-x-4 -bottom-[1px] h-px bg-signal" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
