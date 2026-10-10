"use client";

import { useRef, useState } from "react";
import { gsap, ScrollTrigger, SplitText, useIsoLayoutEffect } from "@/lib/gsap";
import Arrow from "./Arrow";

const services = [
  {
    title: "Retrato",
    side: "Da primeira luz ao retrato final",
    body: [
      "Ensaios individuais construídos em torno de uma única fonte de luz, para que o rosto tenha forma, peso e silêncio.",
      "Direção de pose leve, sem rigidez. Você chega como é e sai com uma imagem que parece sua.",
    ],
  },
  {
    title: "Editorial",
    side: "Moda, revista e lookbook",
    body: [
      "Narrativas visuais para revistas e marcas, com luz pensada junto com o styling e o cenário.",
      "Da pré-produção ao tratamento, a série é entregue com uma linguagem de cor única.",
    ],
  },
  {
    title: "Campanha",
    side: "Imagem para marca e produto",
    body: [
      "Fotografia publicitária com conceito, storyboard de luz e direção de arte integrada.",
      "Arquivos prontos para mídia, OOH e digital, com versões pensadas para cada formato.",
    ],
  },
  {
    title: "Still & Objeto",
    side: "Produto como escultura",
    body: [
      "Objetos fotografados como esculturas: reflexo controlado, contorno nítido e sombra desenhada.",
      "Ideal para joias, perfumes, tecnologia e embalagens.",
    ],
  },
];

export default function Services() {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(1);

  useIsoLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const head = new SplitText("[data-svc-title]", { type: "lines", mask: "lines" });
      gsap.set("[data-svc-title]", { autoAlpha: 1 });

      gsap.from(head.lines, {
        yPercent: 110,
        duration: 1.2,
        ease: "expo.out",
        stagger: 0.2,
        scrollTrigger: { trigger: "[data-svc-title]", start: "top 80%" },
      });
      gsap.from("[data-svc-intro]", {
        autoAlpha: 0,
        y: 30,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: "[data-svc-title]", start: "top 80%" },
      });

      gsap.utils.toArray<HTMLElement>("[data-svc-row]").forEach((row) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: "top 88%" } });
        tl.from(row.querySelector("[data-svc-line]"), { scaleX: 0, duration: 1.4, ease: "expo.inOut" })
          .from(
            row.querySelectorAll("[data-svc-in]"),
            { yPercent: 100, autoAlpha: 0, duration: 1, ease: "power3.out", stagger: 0.2 },
            "<0.3",
          );
      });
    }, root);
    return () => ctx.revert();
  }, []);

  // Acordeão: altura e rotação da seta sempre via GSAP.
  useIsoLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-svc-row]").forEach((row, i) => {
        const panel = row.querySelector<HTMLElement>("[data-svc-panel]");
        const active = i === open;
        gsap.to(panel, { height: active ? "auto" : 0, duration: 1, ease: "expo.inOut" });
        gsap.to(row.querySelector("[data-svc-arrow]"), {
          rotate: active ? 0 : 90,
          backgroundColor: active ? "#f5f1ee" : "rgba(245,241,238,0.06)",
          color: active ? "#000" : "#f5f1ee",
          duration: 0.8,
          ease: "power3.out",
        });
        gsap.to(row.querySelector("[data-svc-name]"), {
          color: active ? "#f5f1ee" : "#8a8580",
          duration: 0.8,
          ease: "power3.out",
        });
      });
      // A altura mudou: os pins abaixo precisam recalcular.
      gsap.delayedCall(1.05, () => ScrollTrigger.refresh());
    }, root);
    return () => ctx.kill();
  }, [open]);

  return (
    <section id="servicos" ref={root} className="relative bg-black px-4 py-28 sm:px-8 lg:px-12 lg:py-40">
      <div className="mb-16 grid gap-8 lg:mb-24 lg:grid-cols-[1fr_auto] lg:items-end">
        <h2
          data-svc-title
          className="js-hide text-[clamp(2.2rem,4.6vw,4.2rem)] font-normal uppercase leading-[0.98]"
        >
          Imagens que
          <br />
          seguram o olhar.
        </h2>
        <p data-svc-intro className="max-w-[34ch] text-[12px] leading-relaxed text-fg/60 lg:mr-28">
          Retrato, editorial, campanha e objeto — quatro formas de trabalhar a mesma obsessão: luz com
          intenção.
        </p>
      </div>

      <ul>
        {services.map((s, i) => (
          <li key={s.title} data-svc-row className="relative">
            <div data-svc-line className="h-px origin-left bg-line" />
            <button
              type="button"
              onClick={() => setOpen(open === i ? -1 : i)}
              aria-expanded={open === i}
              className="grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-4 py-7 text-left sm:grid-cols-[1fr_2fr_auto] lg:py-9"
            >
              <span className="overflow-hidden">
                <span data-svc-in className="block font-light text-[clamp(1rem,1.6vw,1.4rem)] text-fg/80">
                  [{String(i + 1).padStart(2, "0")}]
                </span>
              </span>
              <span className="overflow-hidden">
                <span
                  data-svc-in
                  data-svc-name
                  className="block text-[clamp(1.6rem,3.4vw,3rem)] uppercase leading-none tracking-[-0.01em] text-muted"
                >
                  {s.title}
                </span>
              </span>
              <span
                data-svc-arrow
                className="grid h-11 w-11 place-items-center rounded-full border border-line sm:h-12 sm:w-12"
              >
                <Arrow className="h-3.5 w-3.5" />
              </span>
            </button>
            <div data-svc-panel className="h-0 overflow-hidden">
              <div className="grid gap-8 pb-10 sm:grid-cols-[1fr_2fr_auto] lg:pb-14">
                <p className="self-end text-[11px] text-fg/60">{s.side}</p>
                <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={["/media/retrato-01.webp", "/media/editorial-01.webp", "/media/campanha-01.webp", "/media/luz-02.webp"][i]}
                    alt=""
                    className="aspect-[16/10] w-full object-cover"
                    loading="lazy"
                  />
                  <div className="space-y-4 text-[12px] leading-relaxed text-fg/75">
                    {s.body.map((b) => (
                      <p key={b}>{b}</p>
                    ))}
                  </div>
                </div>
                <span className="hidden w-12 sm:block" />
              </div>
            </div>
          </li>
        ))}
        <li className="h-px bg-line" />
      </ul>
    </section>
  );
}
