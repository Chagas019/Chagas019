import { FLOOR_COUNT, floorBaseY } from '../../data/building';

/**
 * Estado de animação dos 40 pavimentos, compartilhado entre os componentes instanciados.
 * Fica fora do React de propósito: é atualizado a cada quadro pelo FloorAnimator e lido
 * pelos InstancedMesh, que só recalculam matrizes quando `version` muda.
 */
export type Category = 'structure' | 'glass' | 'facadeMetal' | 'railing' | 'interior' | 'finish' | 'glow';

export const CATEGORIES: Category[] = ['structure', 'glass', 'facadeMetal', 'railing', 'interior', 'finish', 'glow'];

const N = FLOOR_COUNT + 1;

function table(fill = 0) {
  return Object.fromEntries(CATEGORIES.map((c) => [c, new Float32Array(N).fill(fill)])) as Record<Category, Float32Array>;
}

export const floorRuntime = {
  version: 1,
  /** Cota animada de cada pavimento (índice = número do pavimento). */
  y: Float32Array.from({ length: N }, (_, n) => floorBaseY(n)),
  /** Fator de "decolagem" dos pavimentos acima do corte (0 = no lugar, 1 = removido). */
  lift: new Float32Array(N),
  /** Revelação inicial (0..1). */
  reveal: new Float32Array(N),
  /** Fator de visibilidade por categoria (0..1). */
  cur: table(1),
  tgt: table(1),
  explode: 0,
  selected: -1,
  hovered: -1,
  night: 0,
  /** Progresso da onda de iluminação noturna (0..1.4). */
  nightWave: 0,
};

floorRuntime.cur.glow.fill(0);
floorRuntime.tgt.glow.fill(0);

export type FloorRuntime = typeof floorRuntime;

export function bump() {
  floorRuntime.version++;
}

/** Fator final de escala vertical de uma categoria num pavimento. */
export function visibility(cat: Category, n: number): number {
  const rt = floorRuntime;
  return rt.reveal[n] * rt.cur[cat][n] * (1 - rt.lift[n]);
}
