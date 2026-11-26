import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="PRESET LAB — início" className={cn("group flex items-center gap-2", className)}>
      <span className="display text-[26px] leading-none tracking-tight md:text-[30px]">Preset</span>
      <span aria-hidden className="relative grid size-6 place-items-center rounded-full bg-signal transition-transform duration-500 ease-[var(--ease-lab)] group-hover:rotate-90 md:size-7">
        <span className="size-2 rounded-full bg-ink" />
      </span>
      <span className="display text-[26px] leading-none tracking-tight md:text-[30px]">Lab</span>
    </Link>
  );
}
