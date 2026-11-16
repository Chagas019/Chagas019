"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Menu suspenso acessível (botão + lista), fecha com Esc e clique fora; abertura suave. */
export function Dropdown({ label, buttonContent, children, align = "right" }: { label: string; buttonContent: ReactNode; children: ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={root} className="relative">
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-2 pr-3 text-sm text-ink transition-colors hover:border-gold-400/60"
      >
        {buttonContent}
        <ChevronDown aria-hidden className={cn("size-4 text-ink-muted transition-transform duration-200", open && "rotate-180")} />
      </button>
      <div
        id={id}
        onClick={(e) => { if ((e.target as HTMLElement).closest("a,button[type=submit]")) setOpen(false); }}
        className={cn(
          "glass absolute top-full z-50 mt-2 min-w-52 origin-top rounded-xl p-1.5 shadow-lifted transition duration-200",
          align === "right" ? "right-0" : "left-0",
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1 scale-95 opacity-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export const dropdownItemClass = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-gold-400/10 hover:text-gold-200 focus-visible:bg-gold-400/10";
