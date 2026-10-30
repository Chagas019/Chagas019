"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { StudioButton } from "./studio-button";
import { STUDIO_TOOLS } from "./tools";
import { cn } from "@/lib/utils";

function isSelected(href: string, pathname: string, area: string | null) {
  const [path, query] = href.split("?");
  if (path === "/") return pathname === "/";
  if (path === "/laboratorio") return pathname.startsWith("/laboratorio") && (query ? query === `area=${area}` : area !== "edicao");
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Barra com os seis atalhos 3D. `compact` é a versão para o celular / topo do feed. */
export function StudioBar({ compact, className }: { compact?: boolean; className?: string }) {
  const pathname = usePathname();
  const area = useSearchParams().get("area");
  const reduce = useReducedMotion();
  return (
    <nav aria-label="Creative Studio" className={cn(compact ? "scrollbar-none -mx-4 overflow-x-auto px-4" : "", className)}>
      <ul className={cn("flex", compact ? "w-max gap-4 py-3" : "flex-wrap justify-center gap-5 sm:gap-8")}>
        {STUDIO_TOOLS.map((t, i) => (
          <motion.li
            key={t.key}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <StudioButton href={t.href} label={t.label} desc={t.desc} Icon={t.Icon} compact={compact} selected={isSelected(t.href, pathname, area)} />
          </motion.li>
        ))}
      </ul>
    </nav>
  );
}
