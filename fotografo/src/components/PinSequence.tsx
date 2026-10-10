"use client";

import { useRef } from "react";
import { gsap, SplitText, useIsoLayoutEffect } from "@/lib/gsap";

const principles = [
  { k: "01", t: "Medir", d: "Antes do primeiro clique, a luz é lida, medida e desenhada." },
  { k: "02", t: "Esperar", d: "O momento certo é quando a sombra começa a contar a história." },
  { k: "03", t: "Revelar", d: "Tratamento de cor que preserva grão, contraste e intenção." },
];

export default function PinSequence() {
  const root = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const lines = new SplitText("[data-pin-title]", { type: "lines", mask: "lines" });
      gsap.set("[data-pin-title]", { autoAlpha: 1 });

      const mm = gsap.matchMedia();

      mm.add(
        { desktop: "(min-width: 1024px)", mobile: "(max-width: 1023px)" },
        (c) => {
          const { desktop } = c.conditions as { desktop: boolean };

          const tl = gsap.timeline({
            defaults: { ease: "power3.out", duration: 0.8 },
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: desktop ? "+=280%" : "+=160%",
              scrub: desktop ? 1.2 : 0.6,
              pin: "[data-pin-stage]",
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          // Câmera: lente fecha o foco e faz o dolly-in durante toda a sequência.
          tl.fromTo(
            "[data-cam]",
            { scale: 1.45, ...(desktop ? { filter: "blur(14px)" } : {}) },
            { scale: 1, ...(desktop ? { filter: "blur(0px)" } : {}), duration: 3.2, ease: "none" },
            0,
          ).fromTo(
            "[data-aperture]",
            { clipPath: "inset(42% 38% 42% 38%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut" },
            0,
          );

          // Sequência: um elemento a cada 0.2s, sempre power3.out.
          const seq = [
            "[data-pin-label]",
            ...lines.lines,
            "[data-pin-text]",
            ...gsap.utils.toArray<HTMLElement>("[data-principle]"),
            "[data-pin-hud]",
          ];
          seq.forEach((el, i) => {
            tl.from(el, { yPercent: 110, autoAlpha: 0 }, 0.4 + i * 0.2);
          });

          tl.from("[data-pin-rule]", { scaleX: 0, duration: 1.2, ease: "expo.inOut" }, 0.6);

          // Respiro final antes de soltar o pin.
          tl.to({}, { duration: 0.6 });
        },
      );

      return () => lines.revert();
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section id="olhar" ref={root} className="relative bg-black">
      <div
        data-pin-stage
        className="relative flex h-[100svh] min-h-[640px] flex-col justify-center overflow-hidden px-4 pb-8 pt-20 sm:px-8 lg:h-auto lg:min-h-[100svh] lg:px-12 lg:py-24"
      >
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
          <div>
            <p data-pin-label className="mb-5 lg:mb-8 font-mono text-[11px] uppercase tracking-[0.25em] text-accent">
              [ Olhar ]
            </p>
            <h2
              data-pin-title
              className="js-hide text-[clamp(1.9rem,5.2vw,4.8rem)] font-normal uppercase leading-[0.98] tracking-[-0.01em]"
            >
              Enquadro a luz antes do{" "}
              <span
                aria-hidden
                className="inline-block h-[0.66em] w-[1.25em] border-[0.07em] border-current align-baseline"
                style={{ borderRadius: "0 0.33em 0.33em 0" }}
              />{" "}
              momento.
            </h2>
            <p data-pin-text className="mt-5 max-w-[44ch] text-[12px] lg:mt-8 lg:text-[13px] leading-relaxed text-fg/70">
              Cada ensaio começa no escuro. A luz entra uma de cada vez, até que o rosto, o produto ou o
              lugar tenha a forma exata que a história pede.
            </p>

            <div data-pin-rule className="mt-6 h-px lg:mt-12 origin-left bg-line" />
            <ul className="mt-5 grid grid-cols-3 gap-4 lg:mt-8 lg:gap-8">
              {principles.map((p) => (
                <li key={p.k} data-principle>
                  <p className="font-mono text-[11px] text-fg/50">[{p.k}]</p>
                  <p className="mt-2 text-[13px] font-medium uppercase tracking-wide lg:mt-3 lg:text-[15px]">{p.t}</p>
                  <p className="mt-2 hidden text-[12px] leading-relaxed text-fg/60 sm:block">{p.d}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto aspect-[16/10] max-h-[30svh] w-full max-w-[520px] lg:aspect-[4/5] lg:max-h-none">
            <div data-aperture className="absolute inset-0 overflow-hidden" style={{ clipPath: "inset(42% 38% 42% 38%)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                data-cam
                src="/media/retrato-02.jpg"
                alt="Retrato em contraluz da série Eclipse"
                className="h-full w-full object-cover will-change-transform"
              />
              <div className="scanlines pointer-events-none absolute inset-0" />
            </div>
            <div
              data-pin-hud
              className="viewfinder pointer-events-none absolute -inset-3 font-mono text-[10px] uppercase tracking-[0.2em] text-fg/70"
            >
              <span className="absolute left-4 top-3">AF · Lock</span>
              <span className="absolute right-4 top-3">85mm</span>
              <span className="absolute bottom-3 left-4">Série Eclipse</span>
              <span className="absolute bottom-3 right-4 text-accent">● 01/12</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
