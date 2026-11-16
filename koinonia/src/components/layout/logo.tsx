import { cn } from "@/lib/utils";

/** Marca KOINONIA: círculo de comunhão roxo com a cruz em lima. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-9", className)}>
      <circle cx="20" cy="20" r="19" fill="#7B2FF7" />
      <circle cx="20" cy="20" r="13" fill="none" stroke="#C8FF2E" strokeWidth="1.6" strokeDasharray="15 3" />
      <path d="M20 11v18M14 17.5h12" stroke="#C8FF2E" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Logotipo em escrita de pincel, como na referência visual. */
export function Logo({ className }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <span className={cn("inline-flex items-center font-display text-[1.6rem] leading-none tracking-wide text-white", className)}>
      KOINONIA<span className="text-lime-400">.</span>
    </span>
  );
}
