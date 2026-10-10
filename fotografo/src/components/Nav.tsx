"use client";

import { useRef } from "react";
import { gsap, useIsoLayoutEffect } from "@/lib/gsap";
import { useLenis } from "./SmoothScroll";

const left = [
  { label: "Início", href: "#inicio" },
  { label: "Olhar", href: "#olhar" },
  { label: "Serviços", href: "#servicos" },
];
const right = [
  { label: "Arquivo", href: "#arquivo" },
  { label: "Contato", href: "#contato" },
];

export default function Nav() {
  const ref = useRef<HTMLElement>(null);
  const lenis = useLenis();

  useIsoLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from("[data-nav-item]", {
        yPercent: -120,
        autoAlpha: 0,
        duration: 1.2,
        ease: "expo.out",
        stagger: 0.08,
        delay: 3.4,
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!lenis) return;
    e.preventDefault();
    lenis.scrollTo(href, { duration: 2, easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)) });
  };

  const item = (l: { label: string; href: string }, extra = "") => (
    <li key={l.href} data-nav-item className={`js-hide ${extra}`}>
      <a href={l.href} onClick={(e) => go(e, l.href)} className="link-line pb-0.5">
        {l.label}
      </a>
    </li>
  );

  return (
    <header
      ref={ref}
      className="fixed inset-x-0 top-0 z-50 mix-blend-difference px-4 py-5 text-[11px] font-medium uppercase tracking-[0.14em] text-white sm:px-8 lg:px-12"
    >
      <nav className="grid grid-cols-[1fr_auto_1fr] items-center">
        <ul className="hidden gap-8 md:flex">{left.map((l) => item(l))}</ul>
        <span className="md:hidden" />
        <a
          href="#inicio"
          onClick={(e) => go(e, "#inicio")}
          data-nav-item
          aria-label="Theo Valente"
          className="js-hide text-center text-[13px] font-semibold leading-[1.05] tracking-[0.08em]"
        >
          THEO
          <br />
          VAL<span aria-hidden className="inline-block w-[1.6em] translate-y-[-0.1em] border border-current align-middle" style={{ height: "0.62em", borderRadius: "0 0.4em 0.4em 0" }} />NTE
        </a>
        <ul className="flex justify-end gap-8">
          {right.map((l, i) => item(l, i === 0 ? "hidden md:list-item" : ""))}
        </ul>
      </nav>
    </header>
  );
}
