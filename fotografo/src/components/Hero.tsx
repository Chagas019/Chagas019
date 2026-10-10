"use client";

import { useRef } from "react";
import { gsap, SplitText, useIsoLayoutEffect } from "@/lib/gsap";
import Arrow from "./Arrow";
import { useLenis } from "./SmoothScroll";

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const lenis = useLenis();

  useIsoLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const title = new SplitText("[data-hero-title]", { type: "lines,chars", mask: "lines" });
      const giant = new SplitText("[data-hero-giant]", { type: "chars", mask: "chars" });
      gsap.set("[data-hero-title], [data-hero-giant]", { autoAlpha: 1 });

      // Contador de frames do visor: corre enquanto nada aparece.
      const frame = { n: 0 };
      const frameEl = root.current?.querySelector("[data-frame]");
      const setFrame = () => {
        if (frameEl) frameEl.textContent = String(Math.round(frame.n)).padStart(4, "0");
      };

      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      // 1. Tensão: tela preta, visor e linha de exposição antes de qualquer palavra.
      tl.from("[data-hud]", { autoAlpha: 0, duration: 0.8, ease: "power3.out", stagger: 0.2 })
        .to(frame, { n: 24, duration: 1.6, ease: "power3.inOut", onUpdate: setFrame }, "<")
        .fromTo(
          "[data-exposure]",
          { scaleX: 0 },
          { scaleX: 1, duration: 1.2, ease: "expo.inOut" },
          "<0.2",
        )
        // 2. Obturador abre: a linha vira a imagem.
        .fromTo(
          "[data-shutter]",
          { clipPath: "inset(49.8% 0% 49.8% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut" },
        )
        .to("[data-exposure]", { autoAlpha: 0, duration: 0.6, ease: "power3.out" }, "<0.4")
        .fromTo("[data-video]", { scale: 1.35 }, { scale: 1, duration: 2.4 }, "<-0.4")
        // 3. Só agora a primeira palavra.
        .from(
          title.chars,
          { yPercent: 115, rotate: 6, duration: 1.2, stagger: 0.025 },
          "-=1.4",
        )
        .from(
          giant.chars,
          { yPercent: 105, duration: 1.6, ease: "expo.out", stagger: 0.08 },
          "<0.3",
        )
        .from(
          "[data-hero-fade]",
          { y: 30, autoAlpha: 0, duration: 1, ease: "power3.out", stagger: 0.2 },
          "<0.4",
        )
        .from("[data-scroll-indicator]", { autoAlpha: 0, y: 20, duration: 0.8, ease: "power3.out" }, "-=0.6");

      // Indicador de scroll: ponto viajando pela linha.
      gsap.fromTo(
        "[data-scroll-dot]",
        { yPercent: -100 },
        { yPercent: 400, duration: 1.8, ease: "power3.inOut", repeat: -1, delay: 4 },
      );

      // Some ao descer.
      gsap.to("[data-scroll-indicator]", {
        autoAlpha: 0,
        y: 30,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "+=220", scrub: true },
      });

      // Câmera recuando ao sair do hero.
      const out = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });
      out.to("[data-video-wrap]", { scale: 1.12, ease: "none" }, 0)
        .to("[data-giant-wrap]", { yPercent: 35, ease: "none" }, 0)
        .to("[data-hero-copy]", { yPercent: -30, autoAlpha: 0.2, ease: "none" }, 0);

      return () => {
        title.revert();
        giant.revert();
      };
    }, root);

    return () => ctx.revert();
  }, []);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!lenis) return;
    e.preventDefault();
    lenis.scrollTo(href, { duration: 2 });
  };

  return (
    <section
      id="inicio"
      ref={root}
      className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-black"
    >
      {/* Obturador: tudo que é imagem vive aqui dentro */}
      <div data-shutter className="absolute inset-0" style={{ clipPath: "inset(49.8% 0% 49.8% 0%)" }}>
        <div data-video-wrap className="absolute inset-0">
          <video
            data-video
            className="absolute inset-0 h-full w-full object-cover"
            poster="/media/hero-poster.webp"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden
          >
            <source src="/media/hero.webm" type="video/webm" />
            <source src="/media/hero.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(255,77,10,0.55),transparent_55%)] mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/40" />
        <div className="scanlines pointer-events-none absolute inset-0" />
      </div>

      {/* Linha de exposição */}
      <div
        data-exposure
        className="pointer-events-none absolute inset-x-0 top-1/2 h-px origin-center bg-accent shadow-[0_0_24px_4px_rgba(255,77,10,0.7)]"
        style={{ transform: "scaleX(0)" }}
      />

      {/* HUD do visor */}
      <div className="pointer-events-none absolute inset-4 font-mono text-[10px] uppercase tracking-[0.2em] text-fg/70 sm:inset-8 lg:inset-12">
        <div data-hud className="js-hide viewfinder absolute inset-0 opacity-40" />
        <div data-hud className="js-hide absolute bottom-3 left-3 flex items-center gap-2 sm:left-4">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_2px_rgba(255,77,10,0.8)]" />
          REC <span data-frame>0000</span>
        </div>
        <div data-hud className="js-hide absolute bottom-3 right-3 hidden sm:right-4 sm:block">
          ISO 100 · f/1.8 · 1/250
        </div>
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 flex h-full flex-col px-4 pb-6 pt-24 sm:px-8 lg:px-12 lg:pt-28">
        <div className="grid flex-1 grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div data-hero-copy>
            <p data-hero-fade className="js-hide mb-4 text-[11px] text-fg/70">
              Fotógrafo · São Paulo
            </p>
            <h1
              data-hero-title
              className="js-hide max-w-[12ch] text-[clamp(2.6rem,4.8vw,4.6rem)] font-normal leading-[0.98] tracking-[-0.02em]"
            >
              Luz primeiro. Depois a história.
            </h1>
            <p data-hero-fade className="js-hide mt-5 max-w-[30ch] text-[12px] leading-relaxed text-fg/75 sm:ml-14">
              Retrato, editorial e campanha construídos a partir de uma única fonte de luz.
            </p>
            <div data-hero-fade className="js-hide mt-8 flex flex-wrap gap-2">
              <a
                href="#contato"
                onClick={(e) => go(e, "#contato")}
                className="btn-pill group flex items-center gap-6 rounded-full bg-fg py-1.5 pl-6 pr-1.5 text-[13px] text-black hover:bg-accent"
              >
                Agendar ensaio
                <span className="btn-arrow grid h-10 w-10 place-items-center rounded-full bg-black text-fg">
                  <Arrow className="h-3.5 w-3.5" />
                </span>
              </a>
              <a
                href="#arquivo"
                onClick={(e) => go(e, "#arquivo")}
                className="btn-pill rounded-full border border-line bg-black/40 px-6 py-4 text-[13px] backdrop-blur-sm hover:bg-fg hover:text-black"
              >
                Ver o arquivo
              </a>
            </div>
          </div>

          <div className="hidden justify-end lg:flex">
            <div className="flex w-full max-w-[340px] flex-col gap-10">
              <div data-hero-fade className="js-hide flex gap-4 rounded-sm">
                <div className="relative h-32 w-32 shrink-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/media/retrato-01.webp" alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[13px] font-medium">Série Eclipse</p>
                  <p className="mt-2 text-[11px] leading-snug text-fg/65">
                    Retratos em contraluz onde a sombra é o assunto.
                  </p>
                  <span className="mt-4 h-px w-12 bg-accent" />
                </div>
              </div>
              <div data-hero-fade className="js-hide grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[clamp(2.6rem,4vw,3.6rem)] font-light leading-none tracking-tight">12</p>
                  <p className="mt-3 text-[11px] leading-snug text-fg/65">Anos medindo luz em estúdio e rua.</p>
                </div>
                <div>
                  <p className="text-[clamp(2.6rem,4vw,3.6rem)] font-light leading-none tracking-tight">480</p>
                  <p className="mt-3 text-[11px] leading-snug text-fg/65">Ensaios entregues, nenhum com luz por acaso.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nome gigante */}
        <div data-giant-wrap className="pointer-events-none relative mb-10 sm:mb-14">
          <p
            data-hero-giant
            aria-hidden
            className="js-hide whitespace-nowrap text-center text-[min(20.4vw,34svh)] font-medium leading-[0.78] tracking-[-0.04em]"
          >
            VALENTE
          </p>
        </div>
      </div>

      {/* Indicador de scroll */}
      <div
        data-scroll-indicator
        className="absolute bottom-[38vw] left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-fg/70 lg:bottom-auto lg:left-auto lg:right-12 lg:top-[52%] lg:translate-x-0"
        style={{ visibility: "hidden" }}
      >
        <span className="relative block h-12 w-px overflow-hidden bg-fg/20">
          <span data-scroll-dot className="absolute left-0 top-0 block h-3 w-px bg-accent" />
        </span>
        Role
      </div>
    </section>
  );
}
