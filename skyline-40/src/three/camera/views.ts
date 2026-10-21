import { FLOOR_COUNT, ROOF_Y, floorBaseY, floorHeight } from '../../data/building';
import { getUnit, ROOMS, unitToFloor, type UnitId } from '../../data/apartment';
import { GARAGE_CONFIG, garageLevels } from '../../data/garage';

export type Vec3 = [number, number, number];

export interface CameraShot {
  position: Vec3;
  target: Vec3;
}

export type ViewId = 'overview' | 'top' | 'bottom' | 'front' | 'side' | 'back' | 'exploded';

/** Cota do pavimento n já considerando a separação da vista explodida. */
export function floorOffsetY(n: number, explode: number, gap: number): number {
  return floorBaseY(n) + (n - 1) * gap * explode;
}

export function buildingTop(explode: number, gap: number): number {
  return floorOffsetY(FLOOR_COUNT, explode, gap) + floorHeight(FLOOR_COUNT);
}

export function presetShot(view: ViewId, explode = 0, gap = 6): CameraShot {
  const top = buildingTop(explode, gap);
  const mid = top * 0.48;
  switch (view) {
    case 'overview':
      return { position: [165, mid + 70, 215], target: [0, mid, 0] };
    case 'top':
      return { position: [0.01, top + 230, 0.4], target: [0, top * 0.5, 0] };
    case 'bottom':
      return { position: [26, 1.6, 38], target: [0, top * 0.7, -4] };
    case 'front':
      return { position: [0, mid, 250 + top * 0.35], target: [0, mid, 0] };
    case 'side':
      return { position: [250 + top * 0.35, mid, 0], target: [0, mid, 0] };
    case 'back':
      return { position: [0, mid, -(250 + top * 0.35)], target: [0, mid, 0] };
    case 'exploded': {
      // enquadra a pilha inteira: distância proporcional à altura total
      const t = buildingTop(1, gap);
      const d = t * 1.75 + 40;
      return { position: [d * 0.58, t * 0.5 + d * 0.16, d * 0.8], target: [0, t * 0.46, 0] };
    }
  }
}

/** Aproximação de um pavimento (corte: os andares acima ficam ocultos). */
export function floorShot(n: number, explode: number, gap: number): CameraShot {
  const y = floorOffsetY(n, explode, gap);
  if (explode > 0.5) {
    return { position: [62, y + 16, 70], target: [0, y + 1.5, 0] };
  }
  return { position: [44, y + 34, 52], target: [0, y + 1, 0] };
}

/** Aproximação de uma unidade a partir da fachada (com o corte dos pavimentos acima). */
export function unitShot(floor: number, unitId: UnitId, explode: number, gap: number): CameraShot {
  const unit = getUnit(unitId);
  const y = floorOffsetY(floor, explode, gap);
  const [cx, cz] = unitToFloor(unit, 7.5, 6.5);
  const [px, pz] = unitToFloor(unit, 30, 36);
  return { position: [px, y + (explode > 0.5 ? 9 : 22), pz], target: [cx, y + 1, cz] };
}

export type ApartmentView = 'perspective' | 'plan' | 'interior';

export function apartmentShot(floor: number, unitId: UnitId, view: ApartmentView, roomId = 'living'): CameraShot {
  const unit = getUnit(unitId);
  const y = floorBaseY(floor);
  const [cx, cz] = unitToFloor(unit, 7.5, 6.5);
  if (view === 'plan') return { position: [cx + 0.01, y + 30, cz + 0.4], target: [cx, y, cz] };
  if (view === 'perspective') {
    const [px, pz] = unitToFloor(unit, 22, 22);
    return { position: [px, y + 17, pz], target: [cx, y + 0.5, cz] };
  }
  const room = ROOMS.find((r) => r.id === roomId && r.eye) ?? ROOMS[0];
  const eye = room.eye!;
  const [ex, ez] = unitToFloor(unit, eye.at[0], eye.at[1]);
  const [lx, lz] = unitToFloor(unit, eye.look[0], eye.look[1]);
  // A câmera fica a ~0,6 m do alvo: girar faz o visitante "olhar em volta" dentro do ambiente.
  const dx = lx - ex;
  const dz = lz - ez;
  const len = Math.hypot(dx, dz) || 1;
  const eyeH = y + 1.6;
  return { position: [ex, eyeH + 0.05, ez], target: [ex + (dx / len) * 0.6, eyeH - 0.05, ez + (dz / len) * 0.6] };
}

export type RooftopSpot = 'overview' | 'pool' | 'deck' | 'lounge' | 'gourmet' | 'garden' | 'mirante';

export function rooftopShot(spot: RooftopSpot = 'overview', explode = 0, gap = 6): CameraShot {
  const r = buildingTop(explode, gap);
  switch (spot) {
    case 'overview':
      return { position: [40, r + 24, 46], target: [0, r + 1, 0] };
    case 'pool':
      return { position: [-15.6, r + 2.4, 4.0], target: [4, r + 0.3, 9.6] };
    case 'deck':
      return { position: [9, r + 2.4, 12.5], target: [-6, r + 0.6, 4] };
    case 'lounge':
      return { position: [3.5, r + 2.6, 1], target: [10, r + 0.6, 6.5] };
    case 'gourmet':
      return { position: [4, r + 3, -2], target: [-6, r + 1, -7] };
    case 'garden':
      return { position: [-2, r + 2.2, -4], target: [9, r + 0.8, -8] };
    case 'mirante':
      return { position: [13.2, r + 1.7, 9.8], target: [60, r - 12, 120] };
  }
}

/** Percurso cinematográfico pela cobertura (pontos de câmera e alvos). */
export function rooftopPath(): CameraShot[] {
  const r = ROOF_Y;
  return [
    { position: [46, r + 26, 52], target: [0, r + 1, 0] },
    { position: [-24, r + 9, 26], target: [-4, r + 0.5, 7] },
    { position: [-15, r + 2.6, 13], target: [0, r + 0.5, 7.6] },
    { position: [10, r + 2.4, 13], target: [-6, r + 0.4, 6] },
    { position: [16, r + 3, 2], target: [8, r + 0.6, -6] },
    { position: [6, r + 3.2, -14], target: [-6, r + 1, -6] },
    { position: [-22, r + 8, -18], target: [0, r + 1, 0] },
    { position: [-40, r + 20, 30], target: [0, r, 0] },
  ];
}

export type GarageView = 'perspective' | 'top' | 'street';

export function garageShot(levelIndex: number, view: GarageView): CameraShot {
  const lvl = garageLevels()[levelIndex] ?? garageLevels()[0];
  const y = lvl.y;
  const { halfX, halfZ } = GARAGE_CONFIG;
  switch (view) {
    case 'top':
      return { position: [0.01, y + 95, 1], target: [0, y, 0] };
    case 'perspective':
      return { position: [halfX * 1.55, y + 34, halfZ * 2.1], target: [0, y, 0] };
    case 'street':
      // Altura dos olhos no corredor de circulação, olhando ao longo dele.
      return { position: [-27, y + 1.65, -6], target: [-26.4, y + 1.6, -5.9] };
  }
}

/** Limites de órbita por modo (distâncias e caixa do alvo). */
export interface OrbitLimits {
  minDistance: number;
  maxDistance: number;
  minPolar: number;
  maxPolar: number;
  minY: number;
  targetMin: Vec3;
  targetMax: Vec3;
}

export function orbitLimits(mode: string, opts: { exploded: boolean; gap: number; apartmentView?: ApartmentView; garageView?: GarageView }): OrbitLimits {
  const top = buildingTop(opts.exploded ? 1 : 0, opts.gap);
  const base: OrbitLimits = {
    minDistance: 22,
    maxDistance: Math.max(700, top * 2.2),
    minPolar: 0.001,
    maxPolar: Math.PI * 0.96,
    minY: 0.8,
    targetMin: [-70, -2, -70],
    targetMax: [70, top + 20, 70],
  };
  if (mode === 'apartment') {
    if (opts.apartmentView === 'interior') return { ...base, minDistance: 0.3, maxDistance: 0.9, minY: -1000 };
    return { ...base, minDistance: 6, maxDistance: 90, minY: -1000 };
  }
  if (mode === 'rooftop') return { ...base, minDistance: 3, maxDistance: 240 };
  if (mode === 'floor') return { ...base, minDistance: 10, maxDistance: 400 };
  if (mode === 'garage') {
    const deepest = -GARAGE_CONFIG.levels * GARAGE_CONFIG.levelHeight;
    const garage = { ...base, minY: -1000, targetMin: [-45, deepest - 2, -45] as Vec3, targetMax: [45, 6, 45] as Vec3 };
    if (opts.garageView === 'street') return { ...garage, minDistance: 0.3, maxDistance: 1.2, maxPolar: Math.PI * 0.9 };
    return { ...garage, minDistance: 8, maxDistance: 260 };
  }
  return base;
}
