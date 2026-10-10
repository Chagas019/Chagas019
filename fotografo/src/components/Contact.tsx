"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, SplitText, useIsoLayoutEffect } from "@/lib/gsap";
import Arrow from "./Arrow";

function useClock() {
  const [time, setTime] = useState("--:--:--");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export default function Contact() {
  const root = useRef<HTMLElement>(null);
  const time = useClock();

  useIsoLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const big = new SplitText("[data-cta-title]", { type: "lines,chars", mask: "lines" });
      gsap.set("[data-cta-title]", { autoAlpha: 1 });

      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top 65%" } });
      tl.fromTo(
        "[data-cta-glow]",
        { scale: 0.4, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 2.4, ease: "expo.out" },
      )
        .from(big.chars, { yPercent: 115, duration: 1.2, ease: "expo.out", stagger: 0.03 }, 0.2)
        .from(
          "[data-cta-in]",
          { y: 30, autoAlpha: 0, duration: 1, ease: "power3.out", stagger: 0.2 },
          "-=0.8",
        );

      gsap.to("[data-cta-glow]", {
        yPercent: -20,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: true },
      });

      return () => big.revert();
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="contato" ref={root} className="relative overflow-hidden bg-black px-4 pb-8 pt-32 sm:px-8 lg:px-12 lg:pt-48">
      <div
        data-cta-glow
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,77,10,0.55)_0%,rgba(196,26,0,0.25)_35%,transparent_68%)] blur-2xl"
      />

      <div className="relative">
        <p data-cta-in className="mb-8 font-mono text-[11px] uppercase tracking-[0.25em] text-accent">
          [ Contato ]
        </p>
        <h2
          data-cta-title
          className="js-hide text-[clamp(3rem,10.5vw,10rem)] font-medium uppercase leading-[0.9] tracking-[-0.03em]"
        >
          Vamos acender
          <br />
          a sua luz?
        </h2>

        <div className="mt-14 grid gap-10 lg:mt-20 lg:grid-cols-[1fr_auto] lg:items-end">
          <div data-cta-in className="flex flex-wrap items-center gap-3">
            <a
              href="mailto:contato@theovalente.com.br"
              className="btn-pill flex items-center gap-6 rounded-full bg-fg py-1.5 pl-6 pr-1.5 text-[13px] text-black hover:bg-accent"
            >
              Agendar ensaio
              <span className="btn-arrow grid h-10 w-10 place-items-center rounded-full bg-black text-fg">
                <Arrow className="h-3.5 w-3.5" />
              </span>
            </a>
            <a href="mailto:contato@theovalente.com.br" className="link-line text-[13px] text-fg/80">
              contato@theovalente.com.br
            </a>
          </div>
          <p data-cta-in className="max-w-[36ch] text-[12px] leading-relaxed text-fg/60">
            Agenda aberta para retratos, editoriais e campanhas. Respondo em até 24 horas com proposta e
            datas.
          </p>
        </div>
      </div>

      <footer className="relative mt-28 grid gap-6 border-t border-line pt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-fg/50 sm:grid-cols-3">
        <span>© {new Date().getFullYear()} Theo Valente</span>
        <span className="sm:text-center">
          São Paulo · <span className="text-fg/80 tabular-nums">{time}</span>
        </span>
        <span className="flex gap-6 sm:justify-end">
          <a href="https://instagram.com" className="link-line" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a href="https://behance.net" className="link-line" target="_blank" rel="noreferrer">
            Behance
          </a>
        </span>
      </footer>
    </section>
  );
}
