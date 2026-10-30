"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/** Diálogo acessível baseado em <dialog> nativo (foco preso, Esc fecha, backdrop). */
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className="m-auto w-[min(92vw,480px)] rounded-[var(--radius-lg)] bg-ink-850 p-0 text-paper shadow-[var(--shadow-pop)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
        <h2 id="dialog-title" className="text-base font-semibold">
          {title}
        </h2>
        <button type="button" onClick={onClose} className="rounded-full p-1.5 text-fog-400 hover:bg-white/5 hover:text-paper" aria-label="Fechar">
          <X className="size-4" />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
