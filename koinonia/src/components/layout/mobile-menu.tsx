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
        className="inline-flex size-12 items-center justify-center rounded-full bg-navy-600 text-white shadow-soft hover:bg-navy-500"
      >
        {open ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
        <span className="sr-only">{open ? closeLabel : openLabel}</span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-border bg-surface px-4 pb-6 pt-2 shadow-lifted animate-rise"
      >
        <NavLinks items={items} className="flex flex-col" onNavigate={() => setOpen(false)} />
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>{footer}</div>
      </div>
    </div>
  );
}
