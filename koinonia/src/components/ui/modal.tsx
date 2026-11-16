"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button, type ButtonProps } from "./button";

/** Modal acessível com o elemento nativo <dialog>: foco preso, Esc fecha, fundo inerte. */
export function Modal({ trigger, title, children, closeLabel, triggerVariant = "outline" }: {
  trigger: ReactNode; title: string; children: ReactNode; closeLabel: string; triggerVariant?: ButtonProps["variant"];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <>
      <Button variant={triggerVariant} onClick={() => setOpen(true)} aria-haspopup="dialog">{trigger}</Button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => { if (e.target === ref.current) setOpen(false); }}
        className="m-auto w-[min(92vw,32rem)] rounded-xl border border-gold-400/30 bg-night-800 p-0 text-ink shadow-lifted backdrop:bg-night-950/70 backdrop:backdrop-blur-sm open:animate-rise"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <h2 id={titleId} className="font-display text-2xl">{title}</h2>
          <button type="button" onClick={() => setOpen(false)} className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-white/5 hover:text-white">
            <X aria-hidden className="size-5" /><span className="sr-only">{closeLabel}</span>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </dialog>
    </>
  );
}
