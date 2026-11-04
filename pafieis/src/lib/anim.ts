// Utilitários de animação: easings, keyframes e trilhas de performance.

export type Ease = (k: number) => number;

const c1 = 1.70158;
export const E = {
  linear: (k: number) => k,
  in: (k: number) => k * k * k,
  out: (k: number) => 1 - Math.pow(1 - k, 3),
  inOut: (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  back: (k: number) => 1 + (c1 + 1) * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2),
  bigBack: (k: number) => 1 + 3.6 * Math.pow(k - 1, 3) + 2.6 * Math.pow(k - 1, 2),
  elastic: (k: number) =>
    k === 0 ? 0 : k === 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  step: (k: number) => (k < 1 ? 0 : 1),
};

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const bell = (t: number, c: number, w: number) => Math.exp(-Math.pow((t - c) / w, 2));

export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export type Key = { t: number; v: number; e?: Ease };

/** Amostra uma lista de keyframes (o easing de cada key vale para o trecho que CHEGA nela). */
export function sampleKeys(keys: Key[], t: number, def: number): number {
  if (!keys || keys.length === 0) return def;
  if (t <= keys[0].t) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i];
    if (t < b.t) {
      const a = keys[i - 1];
      const k = (t - a.t) / (b.t - a.t);
      return lerp(a.v, b.v, (b.e ?? E.inOut)(k));
    }
  }
  return keys[keys.length - 1].v;
}

/** Trilha discreta (ex.: formato da mão). */
export function sampleSteps<T>(steps: { t: number; v: T }[], t: number, def: T): T {
  let v = def;
  for (const s of steps) if (s.t <= t) v = s.v;
  return v;
}
