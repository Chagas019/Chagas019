/**
 * Utilitários de movimento (funções puras, determinísticas).
 * Os nomes "use*" são por conveniência: nenhum usa estado React, podem ser chamados em loops.
 */
import { interpolate, random } from 'remotion';
import { noise2D } from '@remotion/noise';
import { BACK_IN, BACK_OUT, EXPO_OUT, FLUID, type EasingFn } from './easings';

/**
 * "On twos": quantiza o frame para animar a `targetFps` (default 15 sobre 30 → passos de 2 frames).
 * Use para respingos, speed lines, partículas, grão e boil (assinatura do filme).
 */
export const useOnTwos = (frame: number, targetFps = 15, fps = 30): number => {
  const step = Math.max(1, Math.round(fps / targetFps));
  return Math.floor(frame / step) * step;
};
export const onTwos = useOnTwos;

/** Progresso 0..1 entre start e end, com clamp e easing opcional. */
export const prog = (frame: number, start: number, end: number, easing?: EasingFn): number => {
  if (end <= start) return frame >= end ? 1 : 0;
  const t = Math.min(1, Math.max(0, (frame - start) / (end - start)));
  return easing ? easing(t) : t;
};

/** interpolate com clamp e easing (atalho). */
export const lerpFrames = (
  frame: number,
  input: number[],
  output: number[],
  easing?: EasingFn,
): number =>
  interpolate(frame, input, output, { easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Movimento com ANTECIPAÇÃO (§4.3): recua `amount` (fração da distância) no sentido oposto durante
 * `anticFrames` frames (BACK_IN-like) e então arranca até `to` chegando em `end` (easing de chegada).
 *   anticipate(frame, 84, 6, 120, 0, -2400)  // recua para +, dispara para −
 */
export const anticipate = (
  frame: number,
  start: number,
  anticFrames: number,
  end: number,
  from: number,
  to: number,
  amount = 0.08,
  easing: EasingFn = EXPO_OUT,
): number => {
  const back = from - (to - from) * amount;
  const mid = start + anticFrames;
  if (frame <= start) return from;
  if (frame < mid) return mix(from, back, FLUID(prog(frame, start, mid)));
  return mix(back, to, prog(frame, mid, end, easing));
};

/** Pouso com overshoot via BACK_OUT (sem spring): chega em `to` no frame `end`, passando um pouco. */
export const overshoot = (frame: number, start: number, end: number, from: number, to: number): number =>
  mix(from, to, prog(frame, start, end, BACK_OUT));

/** Recuo puro via BACK_IN (para saídas com "puxada"). */
export const backIn = (frame: number, start: number, end: number, from: number, to: number): number =>
  mix(from, to, prog(frame, start, end, BACK_IN));

/**
 * Movimento cujo PICO (chegada) cai exatamente em `peakFrame` — a antecipação/viagem começa antes.
 * Útil para sincronizar com cues ★.
 */
export const arriveAt = (
  frame: number,
  peakFrame: number,
  travelFrames: number,
  from: number,
  to: number,
  easing: EasingFn = EXPO_OUT,
): number => mix(from, to, prog(frame, peakFrame - travelFrames, peakFrame, easing));

/**
 * Wiggle determinístico (noise contínuo) — valor em [-amp, amp].
 * freq em ciclos por frame (~0.05 = lento, 0.3 = nervoso). `twos` quantiza o tempo para 15 fps.
 */
export const wiggle = (seed: string, frame: number, amp = 1, freq = 0.08, twos = false): number => {
  const f = twos ? useOnTwos(frame) : frame;
  return noise2D(seed, f * freq, 0) * amp;
};
/** Wiggle 2D: {x, y}. */
export const wiggle2D = (seed: string, frame: number, amp = 1, freq = 0.08, twos = false) => ({
  x: wiggle(seed + '-x', frame, amp, freq, twos),
  y: wiggle(seed + '-y', frame, amp, freq, twos),
});

/** Aleatório determinístico em [min, max). */
export const rand = (seed: string | number, min = 0, max = 1): number => min + random(seed) * (max - min);

/**
 * Shake de câmera após impacto (§4.3): `dur` frames, ±amp px, decaindo. Quantizado on twos para textura.
 */
export const shake = (frame: number, impactFrame: number, dur = 3, amp = 8, seed = 'shake') => {
  const d = frame - impactFrame;
  if (d < 0 || d >= dur) return { x: 0, y: 0, rot: 0 };
  const k = 1 - d / dur;
  return {
    x: (random(`${seed}-x-${impactFrame}-${d}`) * 2 - 1) * amp * k,
    y: (random(`${seed}-y-${impactFrame}-${d}`) * 2 - 1) * amp * k,
    rot: (random(`${seed}-r-${impactFrame}-${d}`) * 2 - 1) * 0.4 * k,
  };
};

/** Soma de shakes de vários impactos (passe a lista de frames). */
export const shakeMany = (frame: number, impacts: number[], dur = 3, amp = 8) =>
  impacts.reduce(
    (acc, f) => {
      const s = shake(frame, f, dur, amp);
      return { x: acc.x + s.x, y: acc.y + s.y, rot: acc.rot + s.rot };
    },
    { x: 0, y: 0, rot: 0 },
  );

/** Flash de impacto: 1 nos `dur` frames a partir do impacto (2 por padrão), senão 0. */
export const flash = (frame: number, impactFrame: number, dur = 2): number =>
  frame >= impactFrame && frame < impactFrame + dur ? 1 : 0;

/** Drift de "câmera viva": vai de a→b ao longo de [start,end] com FLUID. */
export const drift = (frame: number, start: number, end: number, a = 1, b = 1.04): number =>
  mix(a, b, prog(frame, start, end, FLUID));

/** Respiração senoidal (período em frames). Retorna em [-1, 1]. */
export const breathe = (frame: number, period = 60, phase = 0): number =>
  Math.sin(((frame + phase) / period) * Math.PI * 2);

/** Velocidade normalizada (derivada numérica) de uma função de progresso — para motion blur simulado. */
export const velocity = (fn: (f: number) => number, frame: number): number => fn(frame + 0.5) - fn(frame - 0.5);
