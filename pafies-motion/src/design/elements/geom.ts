import { useId } from "react";
import type { GradientStop } from "../tokens";

export type Pt = { x: number; y: number };

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/** ID seguro para url(#id) em SVG (useId do React tem ":"). */
export const useSvgId = (prefix: string) =>
  `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

/** Path fechado suave (Catmull-Rom -> Bézier cúbica) passando por todos os pontos. */
export const smoothClosedPath = (pts: Pt[], tension = 1): string => {
  const n = pts.length;
  if (n < 3) return "";
  const f = (v: number) => v.toFixed(2);
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension;
    d += ` C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d + " Z";
};

/** Path aberto suave por pontos. */
export const smoothOpenPath = (pts: Pt[]): string => {
  const n = pts.length;
  if (n < 2) return "";
  const f = (v: number) => v.toFixed(2);
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    d += ` C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(
      p2.x - (p3.x - p1.x) / 6,
    )} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
};

const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
};

/** Mistura duas cores hex. */
export const mixHex = (a: string, b: string, t: number): string => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(lerp(v, B[i], clamp01(t))));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

/** Cor em t (0..1) ao longo de uma lista de stops. */
export const colorAt = (stops: readonly GradientStop[], t: number): string => {
  const x = clamp01(t);
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (x <= b.offset) {
      return mixHex(a.color, b.color, (x - a.offset) / Math.max(1e-6, b.offset - a.offset));
    }
  }
  return stops[stops.length - 1].color;
};
