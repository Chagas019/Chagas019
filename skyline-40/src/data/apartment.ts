/**
 * Planta conceitual do apartamento tipo (unidade B, frente-direita).
 * Coordenadas locais em metros: X de 0 (parede divisória com a unidade A) a 15 (fachada lateral)
 * e Z de 0 (divisa com a unidade D) a 11 (fachada frontal). A região X < 6, Z < 2,5 é núcleo/hall.
 * As outras unidades são espelhamentos desta. Áreas são EXEMPLOS EDITÁVEIS, não áreas oficiais.
 */

export type UnitId = 'A' | 'B' | 'C' | 'D';

export interface UnitDef {
  id: UnitId;
  /** Espelhamento em X e Z aplicado à planta local. */
  sx: 1 | -1;
  sz: 1 | -1;
  position: string;
  view: string;
}

export const UNITS: UnitDef[] = [
  { id: 'A', sx: -1, sz: 1, position: 'Frente · esquerda', view: 'Mar e parque' },
  { id: 'B', sx: 1, sz: 1, position: 'Frente · direita', view: 'Mar e orla' },
  { id: 'C', sx: -1, sz: -1, position: 'Fundos · esquerda', view: 'Skyline da cidade' },
  { id: 'D', sx: 1, sz: -1, position: 'Fundos · direita', view: 'Montanhas e cidade' },
];

export function getUnit(id: UnitId): UnitDef {
  return UNITS.find((u) => u.id === id)!;
}

/** Converte um ponto local (X, Z) da planta para coordenadas do pavimento. */
export function unitToFloor(unit: UnitDef, X: number, Z: number): [number, number] {
  return [X * unit.sx, Z * unit.sz];
}

/** Descobre a unidade a partir de um ponto no pavimento. */
export function unitAt(x: number, z: number): UnitId {
  if (z >= 0) return x < 0 ? 'A' : 'B';
  return x < 0 ? 'C' : 'D';
}

export interface Room {
  id: string;
  name: string;
  x: [number, number];
  z: [number, number];
  /** Ponto de vista da câmera dentro do ambiente (local) e direção do olhar. */
  eye?: { at: [number, number]; look: [number, number] };
}

export const ROOMS: Room[] = [
  { id: 'living', name: 'Living e jantar', x: [0, 9.5], z: [6, 11], eye: { at: [9.0, 6.35], look: [2.6, 11] } },
  { id: 'cozinha', name: 'Cozinha', x: [0, 4], z: [2.5, 6], eye: { at: [5.2, 7.4], look: [1.4, 3.6] } },
  { id: 'hall', name: 'Hall de entrada', x: [4, 7.5], z: [2.5, 6] },
  { id: 'lavabo', name: 'Lavabo', x: [6, 7.5], z: [2.5, 4.2] },
  { id: 'circulacao', name: 'Circulação', x: [7.5, 9.5], z: [2.5, 6] },
  { id: 'suite2', name: 'Suíte 2', x: [9.5, 15], z: [0, 4], eye: { at: [10.2, 3.4], look: [13.5, 0.8] } },
  { id: 'banho2', name: 'Banho suíte 2', x: [6, 9.5], z: [0, 2.5] },
  { id: 'closet', name: 'Closet', x: [9.5, 12], z: [4, 6] },
  { id: 'banhoMaster', name: 'Banho master', x: [12, 15], z: [4, 6] },
  { id: 'master', name: 'Suíte master', x: [9.5, 15], z: [6, 11], eye: { at: [10.3, 10.4], look: [13.5, 6.8] } },
  { id: 'varanda', name: 'Varanda gourmet', x: [1, 15], z: [11, 13], eye: { at: [2.2, 11.9], look: [12, 12.6] } },
];

export function roomArea(r: Room): number {
  return (r.x[1] - r.x[0]) * (r.z[1] - r.z[0]);
}

/** Ambientes que não se sobrepõem (o lavabo fica dentro do hall). */
export function privateArea(): number {
  return ROOMS.filter((r) => r.id !== 'lavabo').reduce((s, r) => s + roomArea(r), 0);
}

/** Paredes internas: segmentos [x1, z1, x2, z2] no sistema local; espessura em metros. */
export interface Wall {
  a: [number, number];
  b: [number, number];
  t: number;
}

const W = (x1: number, z1: number, x2: number, z2: number, t = 0.14): Wall => ({ a: [x1, z1], b: [x2, z2], t });

export const WALLS: Wall[] = [
  // divisas (mais espessas)
  W(0, 2.5, 0, 11, 0.24),
  W(6, 0, 15, 0, 0.24),
  // hall de elevadores ↔ unidade (porta de entrada entre X 4,4 e 5,4)
  W(4, 2.5, 4.4, 2.5),
  W(5.4, 2.5, 6, 2.5),
  W(6, 0, 6, 2.5),
  // banho 2 ↔ lavabo/circulação
  W(6, 2.5, 9.5, 2.5),
  // lavabo (porta voltada ao hall)
  W(6, 2.5, 6, 3.0),
  W(6, 3.8, 6, 4.2),
  W(6, 4.2, 7.5, 4.2),
  W(7.5, 2.5, 7.5, 4.2),
  // eixo X = 9,5 (portas: banho 2, suíte 2, closet)
  W(9.5, 0, 9.5, 0.6),
  W(9.5, 1.4, 9.5, 2.8),
  W(9.5, 3.7, 9.5, 4.4),
  W(9.5, 5.4, 9.5, 11),
  // suíte 2 ↔ closet/banho master
  W(9.5, 4, 15, 4),
  // closet ↔ banho master (porta)
  W(12, 4, 12, 4.5),
  W(12, 5.3, 12, 6),
  // closet ↔ suíte master (vão aberto entre 10 e 11,5) e banho master ↔ suíte
  W(9.5, 6, 10, 6),
  W(11.5, 6, 15, 6),
];

export interface Door {
  /** Centro do vão, largura, eixo da parede ('x' = parede ao longo de X). */
  at: [number, number];
  width: number;
  axis: 'x' | 'z';
  /** Lado para o qual a folha abre (+1/-1 no eixo perpendicular). */
  swing: 1 | -1;
  entry?: boolean;
}

export const DOORS: Door[] = [
  { at: [4.9, 2.5], width: 1.0, axis: 'x', swing: 1, entry: true },
  { at: [6, 3.4], width: 0.8, axis: 'z', swing: 1 },
  { at: [9.5, 1.0], width: 0.8, axis: 'z', swing: 1 },
  { at: [9.5, 3.25], width: 0.9, axis: 'z', swing: 1 },
  { at: [9.5, 4.9], width: 1.0, axis: 'z', swing: 1 },
  { at: [12, 4.9], width: 0.8, axis: 'z', swing: 1 },
];

export type FurnitureKind =
  | 'sofa' | 'armchair' | 'coffeeTable' | 'rug' | 'tvUnit' | 'diningTable' | 'chair'
  | 'pendant' | 'counter' | 'tallCabinet' | 'island' | 'stool' | 'bed' | 'nightstand'
  | 'wardrobe' | 'desk' | 'vanity' | 'toilet' | 'shower' | 'bathtub' | 'plant'
  | 'outdoorTable' | 'outdoorChair' | 'daybed' | 'bench' | 'console' | 'lamp';

export interface Furniture {
  kind: FurnitureKind;
  /** Centro (local), dimensões em planta (w em X, d em Z) e altura. */
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  /** Rotação em graus em torno do eixo vertical (0 = frente para +Z). */
  rot?: number;
  room: string;
}

const F = (kind: FurnitureKind, room: string, x: number, z: number, w: number, d: number, h: number, rot = 0): Furniture => ({ kind, room, x, z, w, d, h, rot });

export const FURNITURE: Furniture[] = [
  // Living
  F('rug', 'living', 2.8, 9.0, 3.8, 2.8, 0.02),
  F('sofa', 'living', 2.8, 7.6, 3.0, 1.0, 0.78, 0),
  F('coffeeTable', 'living', 2.8, 9.0, 1.3, 0.7, 0.38),
  F('armchair', 'living', 1.0, 10.1, 0.85, 0.85, 0.78, 135),
  F('armchair', 'living', 4.6, 10.1, 0.85, 0.85, 0.78, -135),
  F('tvUnit', 'living', 0.32, 8.9, 0.45, 2.4, 0.5, 90),
  F('lamp', 'living', 4.6, 7.4, 0.4, 0.4, 1.6),
  F('plant', 'living', 0.6, 10.5, 0.6, 0.6, 1.5),
  F('diningTable', 'living', 7.0, 8.7, 2.2, 1.0, 0.75),
  F('chair', 'living', 6.3, 8.0, 0.5, 0.5, 0.85, 0),
  F('chair', 'living', 7.0, 8.0, 0.5, 0.5, 0.85, 0),
  F('chair', 'living', 7.7, 8.0, 0.5, 0.5, 0.85, 0),
  F('chair', 'living', 6.3, 9.4, 0.5, 0.5, 0.85, 180),
  F('chair', 'living', 7.0, 9.4, 0.5, 0.5, 0.85, 180),
  F('chair', 'living', 7.7, 9.4, 0.5, 0.5, 0.85, 180),
  F('pendant', 'living', 7.0, 8.7, 1.6, 0.25, 0.25),
  F('plant', 'living', 9.0, 10.5, 0.55, 0.55, 1.3),
  // Cozinha
  F('counter', 'cozinha', 0.32, 4.25, 0.64, 3.3, 0.92),
  F('tallCabinet', 'cozinha', 2.0, 2.85, 3.2, 0.62, 2.3),
  F('island', 'cozinha', 2.4, 5.35, 2.2, 0.95, 0.92),
  F('stool', 'cozinha', 1.8, 6.05, 0.4, 0.4, 0.75),
  F('stool', 'cozinha', 2.4, 6.05, 0.4, 0.4, 0.75),
  F('stool', 'cozinha', 3.0, 6.05, 0.4, 0.4, 0.75),
  // Hall e lavabo
  F('console', 'hall', 5.0, 5.7, 1.2, 0.35, 0.8, 180),
  F('vanity', 'lavabo', 6.75, 2.85, 0.8, 0.45, 0.85),
  F('toilet', 'lavabo', 7.1, 3.8, 0.4, 0.6, 0.45, 180),
  // Suíte master
  F('bed', 'master', 12.3, 7.2, 2.0, 2.15, 0.55),
  F('nightstand', 'master', 10.9, 6.4, 0.5, 0.45, 0.5),
  F('nightstand', 'master', 13.7, 6.4, 0.5, 0.45, 0.5),
  F('bench', 'master', 12.3, 8.65, 1.6, 0.45, 0.45),
  F('armchair', 'master', 14.2, 10.1, 0.85, 0.85, 0.78, -135),
  F('rug', 'master', 12.3, 8.0, 3.0, 2.6, 0.02),
  // Closet e banho master
  F('wardrobe', 'closet', 10.75, 4.33, 2.3, 0.6, 2.3),
  F('vanity', 'banhoMaster', 13.4, 5.7, 1.6, 0.55, 0.85, 180),
  F('toilet', 'banhoMaster', 14.6, 4.45, 0.4, 0.6, 0.45, -90),
  F('shower', 'banhoMaster', 13.35, 4.55, 1.0, 1.0, 2.1),
  // Suíte 2 e banho 2
  F('bed', 'suite2', 12.3, 1.15, 1.6, 2.05, 0.5),
  F('nightstand', 'suite2', 11.2, 0.35, 0.45, 0.4, 0.5),
  F('desk', 'suite2', 14.6, 3.0, 0.6, 1.4, 0.75, -90),
  F('chair', 'suite2', 14.0, 3.0, 0.5, 0.5, 0.85, 90),
  F('wardrobe', 'suite2', 10.4, 2.0, 1.6, 0.6, 2.3, 90),
  F('vanity', 'banho2', 7.0, 0.32, 1.2, 0.5, 0.85),
  F('toilet', 'banho2', 8.3, 0.35, 0.4, 0.6, 0.45),
  F('shower', 'banho2', 8.95, 1.9, 1.0, 1.0, 2.1),
  // Varanda
  F('outdoorTable', 'varanda', 5.2, 12.0, 1.4, 0.9, 0.74),
  F('outdoorChair', 'varanda', 4.5, 12.0, 0.55, 0.55, 0.8, 90),
  F('outdoorChair', 'varanda', 5.9, 12.0, 0.55, 0.55, 0.8, -90),
  F('daybed', 'varanda', 11.5, 12.25, 2.4, 0.9, 0.42),
  F('plant', 'varanda', 1.6, 12.4, 0.7, 0.7, 1.4),
  F('plant', 'varanda', 14.4, 12.4, 0.7, 0.7, 1.2),
];

/** Informações conceituais da unidade — valores explicitamente marcados como exemplo. */
export function unitSummary(floor: number) {
  const upper = floor >= 31;
  return {
    bedrooms: '2 suítes (exemplo)',
    rooms: ROOMS.length,
    area: `≈ ${Math.round(privateArea())} m² privativos (exemplo editável)`,
    highlights: upper
      ? ['Varanda gourmet contornando a quina', 'Pé-direito ampliado (exemplo)', 'Automação e piso aquecido nos banhos', 'Vista desimpedida acima do entorno']
      : ['Varanda gourmet integrada ao living', 'Cozinha aberta com ilha', 'Closet na suíte master', 'Lavabo social'],
  };
}
