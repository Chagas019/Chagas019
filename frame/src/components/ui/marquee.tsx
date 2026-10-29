import { Sparkle } from "./sparkle";
import { cn } from "@/lib/utils";

/** Faixa limão com palavras rolando, separadas por ✦. Conteúdo duplicado para o laço contínuo. */
export function Marquee({ items, className, tone = "lime" }: { items: string[]; className?: string; tone?: "lime" | "blue" }) {
  const row = (hidden?: boolean) => (
    <div className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <span key={`${t}-${i}`} className="flex items-center gap-8">
          <span className="font-display text-3xl sm:text-5xl">{t}</span>
          <Sparkle className="size-6 sm:size-8" />
        </span>
      ))}
    </div>
  );
  return (
    <div className={cn("overflow-hidden py-3 sm:py-4", tone === "lime" ? "bg-volt-500 text-ink-950" : "bg-cobalt-500 text-paper", className)}>
      <p className="sr-only">{items.join(", ")}</p>
      <div className="marquee-track flex w-max">
        {row(true)}
        {row(true)}
      </div>
    </div>
  );
}
