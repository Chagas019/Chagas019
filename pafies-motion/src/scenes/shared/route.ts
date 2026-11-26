/**
 * route.ts — percursos da fita (cometa) com tempo controlado por keyframes.
 *
 * makeRoute(pontos) → path suave (Catmull-Rom→Bézier) + comprimento acumulado em cada ponto ("knots").
 * headLength(frame, route, keys) → comprimento percorrido pela cabeça, interpolado por spline
 * monotônica (velocidade contínua, sem paradas em cada key, sem easing linear).
 */
import { getLength, getPointAtLength } from '@remotion/paths';
import type { Pt } from '../../design/elements';

export type Route = { d: string; total: number; knots: number[] };

const f = (v: number) => v.toFixed(2);

export const makeRoute = (pts: Pt[]): Route => {
  const n = pts.length;
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  const knots = [0];
  let acc = 0;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const seg = ` C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(
      p2.y - (p3.y - p1.y) / 6,
    )} ${f(p2.x)} ${f(p2.y)}`;
    d += seg;
    acc += getLength(`M${f(p1.x)} ${f(p1.y)}${seg}`);
    knots.push(acc);
  }
  return { d, total: acc, knots };
};

/** Comprimento no knot k (aceita fração: 2.5 = meio do trecho 2→3). */
export const knotLength = (r: Route, k: number): number => {
  const i = Math.max(0, Math.min(r.knots.length - 1, Math.floor(k)));
  const j = Math.min(r.knots.length - 1, i + 1);
  return r.knots[i] + (r.knots[j] - r.knots[i]) * (k - i);
};

/** Keyframe: [frame, knot]. */
export type RouteKey = readonly [number, number];

/** Interpolação monotônica (Fritsch–Carlson) — suave e sem overshoot entre keys. */
export const monotone = (x: number, xs: readonly number[], ys: readonly number[]): number => {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(xs[i + 1] - xs[i]);
    m.push((ys[i + 1] - ys[i]) / dx[i]);
  }
  const t: number[] = [0]; // começa parado (ease-in)
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (2 * m[i - 1] * m[i]) / (m[i - 1] + m[i]));
  t.push(0); // termina parado (ease-out)
  let i = 0;
  while (x > xs[i + 1]) i++;
  const h = dx[i];
  const s = (x - xs[i]) / h;
  const h00 = 2 * s ** 3 - 3 * s ** 2 + 1;
  const h10 = s ** 3 - 2 * s ** 2 + s;
  const h01 = -2 * s ** 3 + 3 * s ** 2;
  const h11 = s ** 3 - s ** 2;
  return h00 * ys[i] + h10 * h * t[i] + h01 * ys[i + 1] + h11 * h * t[i + 1];
};

/** Comprimento da cabeça no frame. */
export const headLength = (frame: number, r: Route, keys: readonly RouteKey[]): number =>
  monotone(
    frame,
    keys.map((k) => k[0]),
    keys.map((k) => knotLength(r, k[1])),
  );

/** Trim (start/end em 0..1) de um cometa de comprimento `comet` px cuja cabeça está em `head` px. */
export const cometTrim = (r: Route, head: number, comet: number) => ({
  start: Math.max(0, head - comet) / r.total,
  end: Math.max(0, Math.min(r.total, head)) / r.total,
});

export const pointAt = (r: Route, len: number): Pt => {
  const p = getPointAtLength(r.d, Math.max(0, Math.min(r.total, len)));
  return { x: p.x, y: p.y };
};

/** Escala uma lista de pontos (útil para recompor rotas entre layouts). */
export const scalePts = (pts: Pt[], sx: number, sy = sx, ox = 0, oy = 0): Pt[] =>
  pts.map((p) => ({ x: ox + p.x * sx, y: oy + p.y * sy }));
