"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Botão 3D do Creative Studio: hover com profundidade e luz, clique com compressão
 * e retorno elástico, tooltip acessível (também no foco do teclado).
 */
export function StudioButton({
  href,
  label,
  desc,
  Icon,
  selected,
  compact,
  tone,
}: {
  href: string;
  label: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
  selected?: boolean;
  compact?: boolean;
  tone?: "light";
}) {
  const reduce = useReducedMotion();
  const tipId = useId();
  return (
    <motion.div whileTap={reduce ? undefined : { scale: 0.93 }} transition={{ type: "spring", stiffness: 520, damping: 18 }} className="relative">
      <Link
        href={href}
        aria-current={selected ? "page" : undefined}
        aria-describedby={tipId}
        className="group flex flex-col items-center gap-2 rounded-[28px] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-volt-500"
      >
        <span
          data-selected={selected ? "true" : undefined}
          data-tone={tone}
          className={cn("btn-3d grid place-items-center", compact ? "size-14 rounded-[20px]" : "size-20 sm:size-24")}
        >
          <Icon className={compact ? "size-8" : "size-11 sm:size-12"} />
        </span>
        <span className={cn("font-semibold text-paper", compact ? "text-[11px]" : "text-xs uppercase tracking-[0.12em]")}>{label}</span>
      </Link>
      <span
        id={tipId}
        role="tooltip"
        className="max-sm:sr-only pointer-events-none absolute -top-2 left-1/2 z-30 w-max max-w-[200px] -translate-x-1/2 -translate-y-full rounded-[var(--radius-xs)] bg-ink-800 px-2.5 py-1.5 text-center text-xs text-fog-200 opacity-0 shadow-[var(--shadow-pop)] transition-opacity duration-200 [.relative:has(a:hover)>&]:opacity-100 [.relative:has(a:focus-visible)>&]:opacity-100"
      >
        {desc}
      </span>
    </motion.div>
  );
}
