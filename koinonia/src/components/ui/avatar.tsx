import { cn, initials } from "@/lib/utils";

export function Avatar({ name, src, size = "md", className }: { name: string; src?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = { sm: "size-9 text-xs", md: "size-12 text-sm", lg: "size-20 text-xl" }[size];
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-night-700 font-semibold text-neon-300 ring-1 ring-neon-400/60", dims, className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatares vêm do Storage com tamanho pequeno
        <img src={src} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}
