"use client";

import { useRef } from "react";
import { gsap, SplitText, useIsoLayoutEffect } from "@/lib/gsap";

const frames = [
  { src: "/media/luz-01.webp", title: "Feixe", meta: "Estudo de luz · 2025", w: "lg:w-[46vw]", ratio: "aspect-[3/2]" },
  { src: "/media/retrato-01.webp", title: "Eclipse I", meta: "Retrato · 2025", w: "lg:w-[26vw]", ratio: "aspect-[4/5]" },
  { src: "/media/editorial-01.webp", title: "Colunas", meta: "Editorial · 2024", w: "lg:w-[40vw]", ratio: "aspect-[3/2]" },
  { src: "/media/luz-02.webp", title: "Prisma", meta: "Estudo de luz · 2024", w: "lg:w-[24vw]", ratio: "aspect-[3/4]" },
  { src: "/media/campanha-01.webp", title: "Horizonte", meta: "Campanha · 2025", w: "lg:w-[44vw]", ratio: "aspect-[3/2]" },
  { src: "/media/editorial-02.webp", title: "Ritmo", meta: "Editorial · 2023", w: "lg:w-[26vw]", ratio: "aspect-[3/4]" },
  { src: "/media/luz-03.webp", title: "Ruído", meta: "Estudo de luz · 2023", w: "lg:w-[42vw]", ratio: "aspect-[3/2]" },
];

export default function Gallery() {
  const root = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const head = new SplitText("[data-gal-title]", { type: "chars", mask: "chars" });
      gsap.set("[data-gal-title]", { autoAlpha: 1 });
      gsap.from(head.chars, {
        yPercent: 110,
        duration: 1.2,
        ease: "expo.out",
        stagger: 0.04,
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });

      const mm = gsap.matchMedia();

      // Desktop: trilho horizontal com pin, cada quadro abre como um obturador digital.
      mm.add("(min-width: 1024px)", () => {
        const track = root.current!.querySelector<HTMLElement>("[data-gal-track]")!;
        const distance = () => track.scrollWidth - window.innerWidth;

        const move = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: "[data-gal-stage]",
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        gsap.to("[data-gal-progress]", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-gal-stage]",
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: true,
          },
        });

        gsap.utils.toArray<HTMLElement>("[data-frame-item]").forEach((item) => {
          const st = { trigger: item, containerAnimation: move, start: "left 95%", end: "left 35%", scrub: true };
          gsap.fromTo(
            item.querySelector("[data-frame-clip]"),
            { clipPath: "polygon(12% 0%, 12% 0%, 0% 100%, 0% 100%)" },
            { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", ease: "power3.out", scrollTrigger: st },
          );
          gsap.fromTo(
            item.querySelector("img"),
            { scale: 1.3, xPercent: -8 },
            { scale: 1, xPercent: 0, ease: "power3.out", scrollTrigger: st },
          );
          gsap.from(item.querySelectorAll("[data-frame-meta]"), {
            yPercent: 100,
            autoAlpha: 0,
            ease: "power3.out",
            stagger: 0.2,
            scrollTrigger: { ...st, start: "left 75%", end: "left 45%" },
          });
        });
      });

      // Mobile: coluna simples, mesma linguagem de abertura, sem pin.
      mm.add("(max-width: 1023px)", () => {
        gsap.utils.toArray<HTMLElement>("[data-frame-item]").forEach((item) => {
          const tl = gsap.timeline({ scrollTrigger: { trigger: item, start: "top 85%" } });
          tl.fromTo(
            item.querySelector("[data-frame-clip]"),
            { clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 12%)" },
            { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", duration: 1.4, ease: "expo.out" },
          )
            .fromTo(item.querySelector("img"), { scale: 1.25 }, { scale: 1, duration: 1.6, ease: "expo.out" }, 0)
            .from(
              item.querySelectorAll("[data-frame-meta]"),
              { yPercent: 100, autoAlpha: 0, duration: 0.8, ease: "power3.out", stagger: 0.2 },
              0.4,
            );
        });
      });

      return () => head.revert();
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="arquivo" ref={root} className="relative bg-black">
      <div data-gal-stage className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden py-24 lg:py-0">
        <div className="mb-10 flex items-end justify-between px-4 sm:px-8 lg:absolute lg:inset-x-0 lg:top-24 lg:mb-0 lg:px-12">
          <h2
            data-gal-title
            className="js-hide text-[clamp(2.2rem,5vw,4.6rem)] font-normal uppercase leading-none"
          >
            Arquivo de luz
          </h2>
          <p className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-fg/50 sm:block">
            {String(frames.length).padStart(2, "0")} frames
          </p>
        </div>

        <div
          data-gal-track
          className="flex flex-col gap-16 px-4 sm:px-8 lg:mt-24 lg:w-max lg:flex-row lg:items-center lg:gap-[6vw] lg:pl-12 lg:pr-[12vw]"
        >
          {frames.map((f, i) => (
            <figure key={f.src} data-frame-item className={`w-full shrink-0 ${f.w}`}>
              <div data-frame-clip className={`relative overflow-hidden ${f.ratio} lg:max-h-[58svh]`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.src} alt={`${f.title} — ${f.meta}`} className="h-full w-full object-cover" loading="lazy" />
                <div className="scanlines pointer-events-none absolute inset-0" />
                <span className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-[0.2em] text-fg/70">
                  {String(i + 1).padStart(2, "0")}/{String(frames.length).padStart(2, "0")}
                </span>
              </div>
              <figcaption className="mt-4 flex items-baseline justify-between gap-4 overflow-hidden">
                <span data-frame-meta className="block text-[15px] uppercase tracking-wide">
                  {f.title}
                </span>
                <span data-frame-meta className="block font-mono text-[10px] uppercase tracking-[0.2em] text-fg/50">
                  {f.meta}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="absolute inset-x-12 bottom-12 hidden h-px bg-line lg:block">
          <div data-gal-progress className="h-full origin-left scale-x-0 bg-accent" />
        </div>
      </div>
    </section>
  );
}
