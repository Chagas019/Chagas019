"use client";

import { useCallback, useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";
import { mediaUrl } from "@/lib/utils";

/** Comparação antes/depois com controle deslizante: arrastar, clicar ou usar as setas do teclado. */
export function BeforeAfter({ beforeId, afterId, alt, ratio }: { beforeId: string; afterId: string; alt: string; ratio: number }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback((x: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos(Math.min(100, Math.max(0, ((x - rect.left) / rect.width) * 100)));
  }, []);

  return (
    <figure className="space-y-2">
      <div
        ref={ref}
        className="relative mx-auto touch-none select-none overflow-hidden rounded-[var(--radius-md)] bg-ink-850"
        style={{ aspectRatio: String(ratio), width: `min(100%, calc(78vh * ${ratio}))` }}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setFromClientX(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && setFromClientX(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(afterId)} alt={`${alt} — depois da edição`} className="absolute inset-0 size-full object-contain" draggable={false} />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(beforeId)} alt={`${alt} — antes da edição`} className="absolute inset-0 size-full object-contain" draggable={false} />
        </div>
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-paper backdrop-blur">Antes</span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-paper backdrop-blur">Depois</span>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-paper/90 shadow-[0_0_12px_rgb(0_0_0/0.6)]" style={{ left: `${pos}%` }} />
        <div
          role="slider"
          tabIndex={0}
          aria-label="Comparar antes e depois"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          aria-valuetext={`${Math.round(pos)}% mostrando o antes`}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 10 : 2;
            if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - step));
            else if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + step));
            else if (e.key === "Home") setPos(0);
            else if (e.key === "End") setPos(100);
            else return;
            e.preventDefault();
          }}
          className="absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full bg-volt-500 text-ink-950 shadow-[var(--shadow-pop)]"
          style={{ left: `${pos}%` }}
        >
          <MoveHorizontal className="size-5" aria-hidden />
        </div>
      </div>
      <figcaption className="text-center text-xs text-fog-500">Arraste ou use as setas do teclado para comparar</figcaption>
    </figure>
  );
}
