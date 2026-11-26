/**
 * Springs nomeadas — docs/01-direcao-criativa.md §4.2.
 */
import { spring, type SpringConfig } from 'remotion';

export type SpringCfg = Pick<SpringConfig, 'damping' | 'stiffness' | 'mass'> & { overshootClamping?: boolean };

/** Letras slam, ícones — overshoot visível (~12%). */
export const POP: SpringCfg = { damping: 12, stiffness: 180, mass: 0.8 };
/** Objetos grandes (10ª, selo) — pouso pesado, overshoot ~5%. */
export const PESO: SpringCfg = { damping: 18, stiffness: 120, mass: 1.2 };
/** Blobs e coração — wobble de squash & stretch. */
export const GELATINA: SpringCfg = { damping: 8, stiffness: 140, mass: 0.6 };
/** Sem overshoot — câmera, fades de suporte. */
export const SUAVE: SpringCfg = { damping: 200, stiffness: 100, mass: 1 };

export const SPRINGS = { POP, PESO, GELATINA, SUAVE } as const;
export type SpringName = keyof typeof SPRINGS;

/**
 * Valor da spring (0→1, com overshoot conforme config) começando em `startFrame`.
 * Antes de startFrame devolve 0 (ou `from`).
 */
export const springAt = (
  frame: number,
  fps: number,
  startFrame: number,
  config: SpringCfg = POP,
  opts: { from?: number; to?: number; durationInFrames?: number; delay?: number } = {},
): number => {
  const { from = 0, to = 1, durationInFrames, delay = 0 } = opts;
  const f = frame - startFrame - delay;
  if (f < 0) return from;
  return spring({ frame: f, fps, config, from, to, durationInFrames });
};

/**
 * Squash & stretch de pouso (§4.3): no frame do impacto e no seguinte, scaleY 0.82 / scaleX 1.15;
 * depois volta a 1 por spring POP (com leve overshoot inverso). Antes do impacto: 1/1.
 */
export const squashAt = (
  frame: number,
  fps: number,
  impactFrame: number,
  amount = 1,
  config: SpringCfg = POP,
): { scaleX: number; scaleY: number } => {
  const d = frame - impactFrame;
  if (d < 0) return { scaleX: 1, scaleY: 1 };
  const sy0 = 1 - 0.18 * amount;
  const sx0 = 1 + 0.15 * amount;
  if (d < 2) return { scaleX: sx0, scaleY: sy0 };
  const s = spring({ frame: d - 2, fps, config });
  return { scaleX: sx0 + (1 - sx0) * s, scaleY: sy0 + (1 - sy0) * s };
};
