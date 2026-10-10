"use client";

import Lenis from "lenis";
import { createContext, useContext, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const LenisContext = createContext<Lenis | null>(null);
export const useLenis = () => useContext(LenisContext);

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const instance = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo.out
      smoothWheel: true,
      // No toque o scroll continua nativo: é o que impede o pin de pular no mobile.
      syncTouch: false,
    });

    instance.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    setLenis(instance);

    // Recalcula os pins depois que fontes e mídia mudam o layout.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    document.fonts?.ready.then(refresh);

    return () => {
      window.removeEventListener("load", refresh);
      gsap.ticker.remove(raf);
      instance.destroy();
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
