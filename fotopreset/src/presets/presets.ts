import { ADJUSTMENT_KEYS, RANGES, type Adjustments } from '../engine/adjustments';

export type PresetCategory =
  | 'quente'
  | 'suave'
  | 'cinematografico'
  | 'religioso'
  | 'retrato'
  | 'dramatico'
  | 'editorial';

export const CATEGORY_LABELS: Record<PresetCategory, string> = {
  quente: 'Quentes',
  suave: 'Suaves',
  cinematografico: 'Cinematográficos',
  religioso: 'Religiosos',
  retrato: 'Retrato',
  dramatico: 'Dramáticos',
  editorial: 'Editorial',
};

/**
 * Preset autoral. `adjustments` guarda só os parâmetros que diferem do
 * neutro; o motor escala esses valores pela intensidade escolhida.
 * `version` permite migrar presets salvos no futuro.
 */
export interface Preset {
  id: string;
  version: 1;
  name: string;
  description: string;
  author: string;
  categories: PresetCategory[];
  adjustments: Partial<Adjustments>;
}

const AUTHOR = 'Chagas Color';

export const PRESETS: readonly Preset[] = [
  {
    id: 'emaus',
    version: 1,
    name: 'Emaús',
    description: 'Quente, acolhedor e cinematográfico.',
    author: AUTHOR,
    categories: ['quente', 'cinematografico'],
    adjustments: {
      exposure: 0.1,
      contrast: 18,
      highlights: -30,
      shadows: 20,
      whites: -5,
      blacks: -10,
      temperature: 28,
      tint: 6,
      vibrance: 10,
      saturation: -8,
      fade: 8,
      splitShadowHue: 200,
      splitShadowSat: 18,
      splitHighlightHue: 35,
      splitHighlightSat: 30,
      vignette: -18,
      grain: 10,
    },
  },
  {
    id: 'la-creme',
    version: 1,
    name: 'La Crème',
    description: 'Tons suaves, cremosos e elegantes.',
    author: AUTHOR,
    categories: ['suave', 'retrato'],
    adjustments: {
      exposure: 0.25,
      contrast: -18,
      highlights: -25,
      shadows: 25,
      whites: -10,
      blacks: 15,
      temperature: 10,
      tint: 4,
      vibrance: -5,
      saturation: -18,
      fade: 20,
      splitShadowHue: 30,
      splitShadowSat: 8,
      splitHighlightHue: 40,
      splitHighlightSat: 15,
      vignette: -5,
    },
  },
  {
    id: 'cinema',
    version: 1,
    name: 'Cinema',
    description: 'Contraste cinematográfico, sombras frias e realces âmbar.',
    author: AUTHOR,
    categories: ['cinematografico', 'dramatico'],
    adjustments: {
      contrast: 35,
      highlights: -35,
      shadows: 10,
      whites: 8,
      blacks: -25,
      temperature: -5,
      vibrance: 12,
      saturation: -10,
      fade: 5,
      splitShadowHue: 190,
      splitShadowSat: 35,
      splitHighlightHue: 32,
      splitHighlightSat: 30,
      vignette: -25,
      grain: 12,
    },
  },
  {
    id: 'luz-sagrada',
    version: 1,
    name: 'Luz Sagrada',
    description: 'Dourado luminoso para fotografias religiosas.',
    author: AUTHOR,
    categories: ['religioso', 'quente'],
    adjustments: {
      exposure: 0.2,
      contrast: 12,
      highlights: -20,
      shadows: 18,
      whites: 10,
      blacks: -8,
      temperature: 35,
      tint: 8,
      vibrance: 15,
      fade: 6,
      splitShadowHue: 25,
      splitShadowSat: 12,
      splitHighlightHue: 42,
      splitHighlightSat: 40,
      vignette: -22,
      grain: 4,
    },
  },
  {
    id: 'retrato',
    version: 1,
    name: 'Retrato',
    description: 'Tons de pele naturais e luz delicada.',
    author: AUTHOR,
    categories: ['retrato'],
    adjustments: {
      exposure: 0.1,
      contrast: 6,
      highlights: -20,
      shadows: 15,
      temperature: 6,
      tint: 3,
      vibrance: 8,
      saturation: -6,
      fade: 4,
      splitHighlightHue: 30,
      splitHighlightSat: 8,
      vignette: -8,
    },
  },
  {
    id: 'moody',
    version: 1,
    name: 'Moody',
    description: 'Sombras profundas e cores contidas.',
    author: AUTHOR,
    categories: ['dramatico'],
    adjustments: {
      exposure: -0.25,
      contrast: 25,
      highlights: -40,
      shadows: -15,
      whites: -10,
      blacks: -20,
      temperature: -8,
      tint: -4,
      vibrance: 6,
      saturation: -28,
      fade: 10,
      splitShadowHue: 210,
      splitShadowSat: 25,
      splitHighlightHue: 38,
      splitHighlightSat: 15,
      vignette: -35,
      grain: 14,
    },
  },
  {
    id: 'editorial',
    version: 1,
    name: 'Editorial',
    description: 'Aparência sofisticada de revista.',
    author: AUTHOR,
    categories: ['editorial'],
    adjustments: {
      contrast: 22,
      highlights: -15,
      shadows: 8,
      whites: 12,
      blacks: -15,
      temperature: -3,
      vibrance: -5,
      saturation: -15,
      fade: 3,
      splitShadowHue: 220,
      splitShadowSat: 10,
      splitHighlightHue: 45,
      splitHighlightSat: 8,
      vignette: -10,
      grain: 6,
    },
  },
];

export function findPreset(id: string | null): Preset | null {
  if (!id) return null;
  return PRESETS.find((p) => p.id === id) ?? null;
}

/** Lista de problemas de um preset (vazia = válido). Útil para presets importados. */
export function validatePreset(p: Preset): string[] {
  const errors: string[] = [];
  if (!/^[a-z0-9-]+$/.test(p.id)) errors.push(`id inválido: ${p.id}`);
  if (!p.name.trim()) errors.push('nome vazio');
  if (p.categories.length === 0) errors.push('sem categoria');
  for (const [key, value] of Object.entries(p.adjustments)) {
    if (!(ADJUSTMENT_KEYS as string[]).includes(key)) {
      errors.push(`parâmetro desconhecido: ${key}`);
      continue;
    }
    const range = RANGES[key as keyof Adjustments];
    if (typeof value !== 'number' || value < range.min || value > range.max) {
      errors.push(`${key} fora do intervalo: ${String(value)}`);
    }
  }
  return errors;
}
