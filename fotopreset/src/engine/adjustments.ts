/**
 * Parâmetros de edição. Todos os valores são números simples para que
 * possam ser salvos, comparados, interpolados e enviados ao Web Worker.
 */
export interface Adjustments {
  /** Exposição em EV (paradas de luz), aplicada em luz linear. */
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  /** Temperatura: negativo esfria (azul), positivo aquece (âmbar). */
  temperature: number;
  /** Matiz: negativo verde, positivo magenta. */
  tint: number;
  vibrance: number;
  saturation: number;
  /** Esmaecer: levanta os pretos (aspecto "matte"). */
  fade: number;
  /** Divisão de tons: matiz em graus (0–360) e saturação (0–100). */
  splitShadowHue: number;
  splitShadowSat: number;
  splitHighlightHue: number;
  splitHighlightSat: number;
  /** Vinheta: negativo escurece as bordas, positivo clareia. */
  vignette: number;
  grain: number;
}

export type AdjustmentKey = keyof Adjustments;

export interface Range {
  min: number;
  max: number;
  step: number;
}

export const RANGES: Record<AdjustmentKey, Range> = {
  exposure: { min: -3, max: 3, step: 0.05 },
  contrast: { min: -100, max: 100, step: 1 },
  highlights: { min: -100, max: 100, step: 1 },
  shadows: { min: -100, max: 100, step: 1 },
  whites: { min: -100, max: 100, step: 1 },
  blacks: { min: -100, max: 100, step: 1 },
  temperature: { min: -100, max: 100, step: 1 },
  tint: { min: -100, max: 100, step: 1 },
  vibrance: { min: -100, max: 100, step: 1 },
  saturation: { min: -100, max: 100, step: 1 },
  fade: { min: 0, max: 100, step: 1 },
  splitShadowHue: { min: 0, max: 360, step: 1 },
  splitShadowSat: { min: 0, max: 100, step: 1 },
  splitHighlightHue: { min: 0, max: 360, step: 1 },
  splitHighlightSat: { min: 0, max: 100, step: 1 },
  vignette: { min: -100, max: 100, step: 1 },
  grain: { min: 0, max: 100, step: 1 },
};

export const ADJUSTMENT_KEYS = Object.keys(RANGES) as AdjustmentKey[];

/** Chaves que são ângulos: não são somadas nem escaladas pela intensidade. */
const HUE_KEYS: ReadonlySet<AdjustmentKey> = new Set(['splitShadowHue', 'splitHighlightHue']);

export const NEUTRAL: Readonly<Adjustments> = Object.freeze({
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  saturation: 0,
  fade: 0,
  splitShadowHue: 0,
  splitShadowSat: 0,
  splitHighlightHue: 0,
  splitHighlightSat: 0,
  vignette: 0,
  grain: 0,
});

export function clampValue(key: AdjustmentKey, value: number): number {
  const { min, max } = RANGES[key];
  if (!Number.isFinite(value)) return NEUTRAL[key];
  if (HUE_KEYS.has(key)) return ((value % 360) + 360) % 360;
  return Math.min(max, Math.max(min, value));
}

export function isNeutral(adj: Adjustments): boolean {
  return ADJUSTMENT_KEYS.every((k) => HUE_KEYS.has(k) || adj[k] === NEUTRAL[k]);
}

/**
 * Valores efetivos = preset escalado pela intensidade (0–1) + ajustes manuais.
 * Interpolar os parâmetros (e não misturar pixels) mantém a intensidade
 * consistente em qualquer resolução e custa zero em memória.
 */
export function combine(
  preset: Partial<Adjustments> | null,
  intensity: number,
  manual: Adjustments,
): Adjustments {
  const t = Math.min(1, Math.max(0, intensity));
  const out = { ...NEUTRAL } as Adjustments;
  for (const key of ADJUSTMENT_KEYS) {
    const p = preset?.[key] ?? NEUTRAL[key];
    if (HUE_KEYS.has(key)) {
      // A matiz vem do preset; sem preset, do ajuste manual.
      out[key] = clampValue(key, preset && preset[key] !== undefined ? p : manual[key]);
    } else {
      out[key] = clampValue(key, p * t + manual[key]);
    }
  }
  return out;
}
