"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mediaUrl } from "@/lib/utils";

type M = { id: string; kind: "image" | "video"; width: number | null; height: number | null; alt: string; mimeType: string };

export function MediaViewer({ media, title }: { media: M[]; title: string }) {
  const [i, setI] = useState(0);
  const current = media[i];
  if (!current) return null;
  const ratio = current.width && current.height ? current.width / current.height : 16 / 10;
  return (
    <div className="space-y-3" aria-roledescription="carrossel" aria-label={title}>
      <div className="relative mx-auto overflow-hidden rounded-[var(--radius-md)] bg-black" style={{ aspectRatio: String(Math.min(Math.max(ratio, 0.6), 2)), width: `min(100%, calc(78vh * ${Math.min(Math.max(ratio, 0.6), 2)}))` }}>
        {current.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={current.id} src={mediaUrl(current.id)} alt={current.alt || title} className="absolute inset-0 size-full animate-rise object-contain" />
        ) : (
          <video key={current.id} controls playsInline preload="metadata" className="absolute inset-0 size-full" aria-label={current.alt || title}>
            <source src={mediaUrl(current.id)} type={current.mimeType} />
          </video>
        )}
        {media.length > 1 ? (
          <>
            <button onClick={() => setI((x) => (x - 1 + media.length) % media.length)} className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-paper backdrop-blur hover:bg-black/75" aria-label="Anterior">
              <ChevronLeft className="size-5" />
            </button>
            <button onClick={() => setI((x) => (x + 1) % media.length)} className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-paper backdrop-blur hover:bg-black/75" aria-label="Próxima">
              <ChevronRight className="size-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs text-paper" aria-live="polite">
              {i + 1} / {media.length}
            </span>
          </>
        ) : null}
      </div>
      {media.length > 1 ? (
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          {media.map((m, idx) => (
            <button key={m.id} onClick={() => setI(idx)} aria-label={`Ver item ${idx + 1}`} aria-current={idx === i} className={`relative size-16 shrink-0 overflow-hidden rounded-[var(--radius-xs)] ring-2 transition ${idx === i ? "ring-volt-400" : "ring-transparent opacity-60 hover:opacity-100"}`}>
              {m.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(m.id, "thumb")} alt="" className="size-full object-cover" />
              ) : (
                <span className="grid size-full place-items-center bg-ink-800 text-[10px] text-fog-300">vídeo</span>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
