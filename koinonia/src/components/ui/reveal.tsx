"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Revela o conteúdo ao entrar na tela. Só "arma" a animação para elementos abaixo da dobra,
 * então nada pisca no carregamento e não há layout shift (só opacity/transform).
 */
export function Reveal({ children, className, index = 0, as: Tag = "div" }: { children: ReactNode; className?: string; index?: number; as?: "div" | "li" | "section" }) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    el.dataset.reveal = "hidden";
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        el.dataset.reveal = "shown";
        io.disconnect();
      }
    }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} className={cn(className)} style={{ ["--i" as string]: index }}>
      {children}
    </Tag>
  );
}
