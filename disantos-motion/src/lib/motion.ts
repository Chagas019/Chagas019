import { interpolate, Easing } from "remotion";

// Curvas de movimento reutilizadas pelas cenas.
export const easeOutExpo = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeCinematic = Easing.bezier(0.22, 0.61, 0.36, 1);

// Entrada suave de 0 a 1 entre `start` e `start + duration` (em frames locais).
export const rise = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOutExpo,
  });

// Saída suave de 1 a 0 entre `start` e `start + duration`.
export const fall = (frame: number, start: number, duration: number) =>
  1 - rise(frame, start, duration);
