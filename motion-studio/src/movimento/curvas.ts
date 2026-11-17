// Biblioteca de curvas e springs. Dono: agente MOVIMENTO. Tudo determinístico.
import {Easing, interpolate, spring, type SpringConfig} from 'remotion';

export const curvas = {
  suave: Easing.bezier(0.45, 0, 0.55, 1), // easeInOutSine
  entrada: Easing.bezier(0.16, 1, 0.3, 1), // easeOutExpo: chega rápido, assenta suave
  saida: Easing.bezier(0.7, 0, 0.84, 0), // easeInExpo
  antecipacao: Easing.bezier(0.68, -0.6, 0.32, 1.6), // backInOut
  whip: Easing.bezier(0.83, 0, 0.17, 1), // easeInOutQuint: lento-RÁPIDO-lento
  linear: Easing.linear,
} as const;

export const springs: Record<string, Partial<SpringConfig>> = {
  suave: {damping: 200},
  natural: {damping: 18, stiffness: 140, mass: 1},
  elastico: {damping: 10, stiffness: 170, mass: 0.8},
  rapido: {damping: 22, stiffness: 320, mass: 0.6},
};

/** interpolate com clamp e easing padrão. */
export const anim = (
  frame: number,
  [de, ate]: [number, number],
  [a, b]: [number, number],
  easing: (t: number) => number = curvas.entrada,
) => interpolate(frame, [de, ate], [a, b], {easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** Spring começando em `inicio`. */
export const mola = (frame: number, fps: number, inicio = 0, config: Partial<SpringConfig> = springs.natural, durationInFrames?: number) =>
  spring({frame: frame - inicio, fps, config, durationInFrames});
