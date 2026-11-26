"use client";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Comparador antes/depois. Funciona com mouse, toque (pointer events) e teclado (setas, Home/End).
 * O controle é um slider acessível (role="slider").
 */
export function BeforeAfter({ before, after, alt, className, priority, sizes = "(min-width: 1024px) 60vw, 100vw" }: { before: string; after: string; alt: string; className?: string; priority?: boolean; sizes?: string }) {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const fromClientX = useCallback((x: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)));
  }, []);

  return (
    <div
      ref={box}
      className={cn("relative aspect-[4/5] touch-pan-y select-none overflow-hidden bg-graphite", className)}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        fromClientX(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && fromClientX(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <Image src={after} alt={`${alt} — depois`} fill priority={priority} sizes={sizes} className="object-cover" draggable={false} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image src={before} alt={`${alt} — antes`} fill priority={priority} sizes={sizes} className="object-cover" draggable={false} />
      </div>
      <span className="lab-label pointer-events-none absolute left-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 backdrop-blur">Antes</span>
      <span className="lab-label pointer-events-none absolute right-3 top-3 rounded-full bg-signal px-2.5 py-1 text-signal-ink">Depois</span>
      <div className="pointer-events-none absolute inset-y-0 w-px bg-bone" style={{ left: `${pos}%` }} />
      <div
        role="slider"
        tabIndex={0}
        aria-label="Comparar antes e depois"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% antes`}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 2;
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") setPos((p) => Math.max(0, p - step));
          else if (e.key === "ArrowRight" || e.key === "ArrowUp") setPos((p) => Math.min(100, p + step));
          else if (e.key === "Home") setPos(0);
          else if (e.key === "End") setPos(100);
          else return;
          e.preventDefault();
        }}
        className="absolute top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full border border-bone/40 bg-ink/70 text-bone shadow-[0_0_0_6px_rgba(10,10,10,0.25)] backdrop-blur"
        style={{ left: `${pos}%` }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m9 6-6 6 6 6M15 6l6 6-6 6" />
        </svg>
      </div>
    </div>
  );
}
