"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect, useLayoutEffect } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ duration: 1.2, ease: "power3.out" });
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export { gsap, ScrollTrigger, SplitText };
