import { cn } from "@/lib/utils";

/** Marca KOINONIA: cruz dourada dentro do círculo de comunhão. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-8", className)}>
      <circle cx="20" cy="20" r="18" fill="none" stroke="#8CFF5A" strokeWidth="1.4" />
      <circle cx="20" cy="20" r="13.5" fill="none" stroke="#8CFF5A" strokeWidth="0.8" strokeDasharray="2 2.6" />
      <path d="M20 9v22M13.5 16.5h13" stroke="#8CFF5A" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[1.45rem] leading-none font-bold tracking-[0.16em] text-white">KOINONIA</span>
    </span>
  );
}
