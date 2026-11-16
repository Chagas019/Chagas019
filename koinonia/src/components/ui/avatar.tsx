import { cn, initials } from "@/lib/utils";

export function Avatar({ name, src, size = "md", className }: { name: string; src?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = { sm: "size-9 text-xs", md: "size-12 text-sm", lg: "size-20 text-xl" }[size];
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-900 font-semibold text-gold-500 ring-2 ring-gold-300/60", dims, className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatares vêm do Storage com tamanho pequeno
        <img src={src} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}
