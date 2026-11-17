"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { NavLinks, type NavItem } from "./nav-links";

export function MobileMenu({ items, openLabel, closeLabel, footer }: { items: NavItem[]; openLabel: string; closeLabel: string; footer: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-11 items-center justify-center rounded-full border border-neon-400/40 text-neon-300 transition-colors hover:bg-neon-400/10"
      >
        {open ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
        <span className="sr-only">{open ? closeLabel : openLabel}</span>
      </button>
      <div
        id={panelId}
        className={`glass absolute inset-x-0 top-full origin-top border-x-0 px-4 pb-6 pt-2 shadow-lifted transition duration-300 ${open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"}`}
      >
        <NavLinks items={items} className="flex flex-col" onNavigate={() => setOpen(false)} />
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>{footer}</div>
      </div>
    </div>
  );
}
