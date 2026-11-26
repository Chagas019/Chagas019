/**
 * Curvas nomeadas — docs/01-direcao-criativa.md §4.1.
 * Uso: interpolate(frame, [a, b], [0, 1], { easing: EXPO_OUT, ...CLAMP })
 */
import { Easing } from 'remotion';

export type EasingFn = (t: number) => number;

/** Entradas padrão (rápido e assenta suave). */
export const EXPO_OUT: EasingFn = Easing.bezier(0.16, 1, 0.3, 1);
/** Saídas padrão (acelera para fora). */
export const EXPO_IN: EasingFn = Easing.bezier(0.7, 0, 0.84, 0);
/** Movimentos de câmera, wipes, troca de estado. */
export const SNAP: EasingFn = Easing.bezier(0.85, 0, 0.15, 1);
/** Whip-pans e transições de chicote. */
export const WHIP: EasingFn = Easing.bezier(0.9, 0, 0.1, 1);
/** Antecipação (recuo antes do movimento) — passa abaixo de 0. */
export const BACK_IN: EasingFn = Easing.bezier(0.36, 0, 0.66, -0.56);
/** Overshoot de pouso — passa acima de 1. */
export const BACK_OUT: EasingFn = Easing.bezier(0.34, 1.56, 0.64, 1);
/** Fluxos líquidos, drift, anel girando, fita ociosa. */
export const FLUID: EasingFn = Easing.bezier(0.37, 0, 0.63, 1);
/** Só para rotação contínua (único lugar onde linear é permitido). */
export const LINEAR: EasingFn = (t) => t;

export const EASINGS = { EXPO_OUT, EXPO_IN, SNAP, WHIP, BACK_IN, BACK_OUT, FLUID, LINEAR } as const;
export type EasingName = keyof typeof EASINGS;

/** Opções de clamp para interpolate(). */
export const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
