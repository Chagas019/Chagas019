import type { PreviewKind } from "@/lib/creative/examples";
import { cn } from "@/lib/utils";

/** Ilustração abstrata de cada exemplo (CSS puro), para não usar imagens de terceiros. */
export function ExamplePreview({ kind, colors, className }: { kind: PreviewKind; colors: [string, string, string]; className?: string }) {
  const [a, b, c] = colors;
  const base = cn("relative overflow-hidden", className);
  switch (kind) {
    case "portrait":
      return (
        <div className={base} style={{ background: a }} aria-hidden>
          <div className="absolute inset-0" style={{ background: `radial-gradient(60% 70% at 30% 45%, ${b}cc, transparent 60%)` }} />
          <div className="absolute bottom-0 left-[22%] h-[70%] w-[38%] rounded-t-full" style={{ background: `linear-gradient(90deg, ${b}, ${a} 85%)` }} />
          <div className="absolute left-[29%] top-[18%] size-[24%] rounded-full" style={{ background: `linear-gradient(90deg, ${b}, ${a} 90%)` }} />
          <div className="absolute inset-x-0 top-0 h-[12%] bg-black" />
          <div className="absolute inset-x-0 bottom-0 h-[12%] bg-black" />
          <div className="absolute right-[10%] top-[30%] h-[40%] w-px" style={{ background: c, boxShadow: `0 0 18px 2px ${c}` }} />
        </div>
      );
    case "split":
      return (
        <div className={base} aria-hidden>
          <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${b} 0%, ${b}99 40%, ${a} 75%)` }} />
          <div className="absolute left-1/2 top-1/2 size-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: `linear-gradient(90deg, ${b}, ${a})`, boxShadow: `inset -18px 0 30px ${a}` }} />
          <div className="absolute bottom-[10%] right-[10%] h-2 w-1/4 rounded-full" style={{ background: c }} />
        </div>
      );
    case "frames":
      return (
        <div className={cn(base, "flex items-center gap-[4%] px-[6%]")} style={{ background: a }} aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="relative h-[62%] flex-1 overflow-hidden rounded-md" style={{ background: `linear-gradient(${120 + i * 40}deg, ${b}, ${c})`, opacity: 1 - i * 0.18, transform: `skewX(${-6 + i * 6}deg)` }}>
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-black/35" />
            </div>
          ))}
        </div>
      );
    case "poster":
      return (
        <div className={base} style={{ background: a }} aria-hidden>
          <div className="absolute -left-[4%] top-[8%] font-display text-[clamp(3rem,9vw,6rem)] leading-[0.8]" style={{ color: b }}>
            IDEIA
            <br />
            <span style={{ WebkitTextStroke: `2px ${b}`, color: "transparent" }}>IDEIA</span>
          </div>
          <div className="absolute bottom-[10%] right-[8%] size-[22%] rounded-full" style={{ background: c }} />
          <div className="absolute bottom-[12%] left-[8%] h-1.5 w-1/3" style={{ background: b }} />
        </div>
      );
    case "grid":
      return (
        <div className={cn(base, "grid grid-cols-3 gap-[3%] p-[6%]")} style={{ background: a }} aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-md" style={{ background: i % 3 === 0 ? b : i % 3 === 1 ? c : `${b}55` }} />
          ))}
        </div>
      );
    case "beforeAfter":
      return (
        <div className={base} aria-hidden>
          <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${a}, #444)` , filter: "saturate(.3)" }} />
          <div className="absolute inset-y-0 right-0 w-1/2" style={{ background: `linear-gradient(160deg, ${b}, ${c})` }} />
          <div className="absolute left-[18%] top-[30%] size-[34%] rounded-full" style={{ background: `${b}88` }} />
          <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white" />
          <div className="absolute left-1/2 top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-xs font-bold text-ink-950">⇆</div>
        </div>
      );
    case "minimal":
    default:
      return (
        <div className={base} style={{ background: a }} aria-hidden>
          <div className="absolute inset-x-0 top-[62%] h-px" style={{ background: `${b}55` }} />
          <div className="absolute left-[64%] top-[50%] h-[12%] w-[3%] rounded-sm" style={{ background: b }} />
          <div className="absolute left-[63%] top-[45%] size-[5%] rounded-full" style={{ background: c }} />
        </div>
      );
  }
}
