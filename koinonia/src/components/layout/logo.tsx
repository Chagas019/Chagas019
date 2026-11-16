import { cn } from "@/lib/utils";

/** Marca KOINONIA: círculo de comunhão (anel dourado) com a cruz ao centro, formada por quatro "pessoas" unidas. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-9", className)}>
      <rect width="40" height="40" rx="11" fill="#101C35" />
      <circle cx="20" cy="20" r="12.5" fill="none" stroke="#D6AE62" strokeWidth="1.6" strokeDasharray="17.6 2" transform="rotate(-50 20 20)" />
      <path d="M20 11.5v17M13.5 18h13" stroke="#D6AE62" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="20" cy="7.6" r="1.5" fill="#E2C385" />
      <circle cx="32.4" cy="20" r="1.5" fill="#E2C385" />
      <circle cx="20" cy="32.4" r="1.5" fill="#E2C385" />
      <circle cx="7.6" cy="20" r="1.5" fill="#E2C385" />
    </svg>
  );
}

export function Logo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("font-display text-[1.2rem] font-semibold tracking-[0.14em]", tone === "dark" ? "text-navy-900" : "text-white")}>
        KOINONIA
      </span>
    </span>
  );
}
