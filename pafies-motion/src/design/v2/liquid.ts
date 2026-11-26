/**
 * Geometria "líquida" compartilhada pelos componentes V2 (puro, sem frame).
 */
export type P = { x: number; y: number };

/** PRNG determinístico (mulberry32). */
export const rng = (seed: number) => {
  let a = (Math.floor(seed * 9973) ^ 0x9e3779b9) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Hash 0..1 de dois inteiros (para jitter "on twos"). */
export const hash01 = (a: number, b = 0) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const f = (v: number) => (Math.round(v * 100) / 100).toString();
export const D2R = Math.PI / 180;

/**
 * Tubo cônico (cápsula) entre dois círculos, com laterais levemente abauladas.
 * bulge > 0 engorda o meio (músculo/gota), < 0 afina.
 */
export const capsulePath = (a: P, ra: number, b: P, rb: number, bulge = 0): string => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.001 || d <= Math.abs(ra - rb)) {
    const r = Math.max(ra, rb);
    const c = ra >= rb ? a : b;
    return `M${f(c.x - r)} ${f(c.y)} a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
  }
  const ang = Math.atan2(dy, dx);
  const phi = Math.acos((ra - rb) / d); // ângulo dos pontos de tangência
  const p = (c: P, r: number, t: number): P => ({ x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) });
  const a1 = p(a, ra, ang + phi);
  const b1 = p(b, rb, ang + phi);
  const b2 = p(b, rb, ang - phi);
  const a2 = p(a, ra, ang - phi);
  const mid = (u: P, v: P, s: number): P => ({
    x: (u.x + v.x) / 2 + Math.cos(ang + s * Math.PI / 2) * bulge * (ra + rb) * 0.5,
    y: (u.y + v.y) / 2 + Math.sin(ang + s * Math.PI / 2) * bulge * (ra + rb) * 0.5,
  });
  const m1 = mid(a1, b1, 1);
  const m2 = mid(b2, a2, -1);
  return [
    `M${f(a1.x)} ${f(a1.y)}`,
    `Q${f(m1.x)} ${f(m1.y)} ${f(b1.x)} ${f(b1.y)}`,
    `A${f(rb)} ${f(rb)} 0 ${2 * phi > Math.PI ? 1 : 0} 0 ${f(b2.x)} ${f(b2.y)}`,
    `Q${f(m2.x)} ${f(m2.y)} ${f(a2.x)} ${f(a2.y)}`,
    `A${f(ra)} ${f(ra)} 0 ${2 * phi < Math.PI ? 1 : 0} 0 ${f(a1.x)} ${f(a1.y)}`,
    "Z",
  ].join(" ");
};

/**
 * Gota alongada: cabeça redonda em `head` (raio r) e cauda pontuda a `len`
 * para trás na direção `angle` (rad) — a gota "viaja" na direção angle.
 */
export const dropPath = (head: P, r: number, angle: number, len: number, curl = 0): string => {
  const L = Math.max(len, r * 1.05);
  const tail: P = { x: head.x - Math.cos(angle) * L, y: head.y - Math.sin(angle) * L };
  const back = angle + Math.PI; // direção da cauda
  const phi = Math.acos(Math.min(0.999, r / L));
  const t1: P = { x: head.x + r * Math.cos(back + phi), y: head.y + r * Math.sin(back + phi) };
  const t2: P = { x: head.x + r * Math.cos(back - phi), y: head.y + r * Math.sin(back - phi) };
  // controle das laterais: côncavas (cauda fina) + curl lateral
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const c1: P = {
    x: (t1.x + tail.x) / 2 - Math.cos(angle) * 0 + nx * (r * 0.15 + curl * L * 0.25),
    y: (t1.y + tail.y) / 2 + ny * (r * 0.15 + curl * L * 0.25),
  };
  const c2: P = {
    x: (t2.x + tail.x) / 2 - nx * (r * 0.15 - curl * L * 0.25),
    y: (t2.y + tail.y) / 2 - ny * (r * 0.15 - curl * L * 0.25),
  };
  return [
    `M${f(tail.x)} ${f(tail.y)}`,
    `Q${f(c1.x)} ${f(c1.y)} ${f(t1.x)} ${f(t1.y)}`,
    `A${f(r)} ${f(r)} 0 1 1 ${f(t2.x)} ${f(t2.y)}`,
    `Q${f(c2.x)} ${f(c2.y)} ${f(tail.x)} ${f(tail.y)}`,
    "Z",
  ].join(" ");
};

/** Blob fechado com borda ondulada (n pontos, amplitude relativa amp). */
export const blobPath = (c: P, rx: number, ry: number, rot: number, seed: number, amp = 0.18, n = 9): string => {
  const r = rng(seed);
  const pts: P[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 2 * amp;
    const x = Math.cos(t) * rx * k;
    const y = Math.sin(t) * ry * k;
    pts.push({
      x: c.x + x * Math.cos(rot) - y * Math.sin(rot),
      y: c.y + x * Math.sin(rot) + y * Math.cos(rot),
    });
  }
  return closedSmooth(pts);
};

/** Catmull-Rom fechado → Bézier. */
export const closedSmooth = (pts: P[], tension = 1): string => {
  const n = pts.length;
  if (n < 3) return "";
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += ` C${f(p1.x + ((p2.x - p0.x) / 6) * tension)} ${f(p1.y + ((p2.y - p0.y) / 6) * tension)} ${f(
      p2.x - ((p3.x - p1.x) / 6) * tension,
    )} ${f(p2.y - ((p3.y - p1.y) / 6) * tension)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d + "Z";
};

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInCubic = (t: number) => Math.pow(clamp(t), 3);
