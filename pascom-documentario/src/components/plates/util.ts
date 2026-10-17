import { random } from "remotion";

export type PlateProps = {
  /** 0 → 1 ao longo do plano. */
  progress: number;
  /** Quadro local do plano. */
  frame: number;
  width: number;
  height: number;
  props: Record<string, unknown>;
};

/** Ruído suave e determinístico (value noise 1D com interpolação cossenoidal). */
export const smoothNoise = (seed: string | number, t: number) => {
  const i = Math.floor(t);
  const f = t - i;
  const a = random(`${seed}-${i}`);
  const b = random(`${seed}-${i + 1}`);
  const k = (1 - Math.cos(f * Math.PI)) / 2;
  return a * (1 - k) + b * k;
};

/** Lista determinística de valores aleatórios para posicionar elementos. */
export const seeded = (seed: string, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    i,
    a: random(`${seed}-a-${i}`),
    b: random(`${seed}-b-${i}`),
    c: random(`${seed}-c-${i}`),
    d: random(`${seed}-d-${i}`),
  }));

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** Silhueta de uma pessoa (cabeça + ombros) desenhada a partir da base. */
export const personPath = (x: number, baseY: number, s: number) => {
  const headR = 0.19 * s;
  const headY = baseY - 0.95 * s;
  const sh = 0.5 * s;
  return [
    `M ${x - sh} ${baseY}`,
    `C ${x - sh} ${baseY - 0.45 * s}, ${x - 0.36 * s} ${baseY - 0.62 * s}, ${x - 0.12 * s} ${baseY - 0.66 * s}`,
    `L ${x - 0.1 * s} ${headY + headR * 0.8}`,
    `A ${headR} ${headR * 1.15} 0 1 1 ${x + 0.1 * s} ${headY + headR * 0.8}`,
    `L ${x + 0.12 * s} ${baseY - 0.66 * s}`,
    `C ${x + 0.36 * s} ${baseY - 0.62 * s}, ${x + sh} ${baseY - 0.45 * s}, ${x + sh} ${baseY}`,
    "Z",
  ].join(" ");
};
