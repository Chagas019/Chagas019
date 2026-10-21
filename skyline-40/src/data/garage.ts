/**
 * Garagem subterrânea — configuração PARAMÉTRICA e conceitual.
 * Profundidade, número de níveis, vagas e rampas são exemplos editáveis; não representam
 * um projeto aprovado. Altere GARAGE_CONFIG e todo o modelo 3D e a planta se recalculam.
 */

export interface GarageConfig {
  levels: number;
  levelHeight: number;
  halfX: number;
  halfZ: number;
  spotWidth: number;
  spotDepth: number;
  aisleWidth: number;
  /** Faixa central (núcleo, áreas técnicas e rampa entre níveis). */
  spineHalf: number;
  /** Corredor transversal em cada extremidade (X). */
  crossAisle: number;
  occupancy: number;
  seed: number;
}

export const GARAGE_CONFIG: GarageConfig = {
  levels: 2,
  levelHeight: 3.6,
  halfX: 30,
  halfZ: 25,
  spotWidth: 2.5,
  spotDepth: 5,
  aisleWidth: 6,
  spineHalf: 3,
  crossAisle: 6,
  occupancy: 0.62,
  seed: 40,
};

export interface GarageLevel {
  id: string;
  index: number;
  /** Cota do piso acabado. */
  y: number;
}

export function garageLevels(cfg: GarageConfig = GARAGE_CONFIG): GarageLevel[] {
  return Array.from({ length: cfg.levels }, (_, i) => ({ id: `G${i + 1}`, index: i, y: -(i + 1) * cfg.levelHeight }));
}

export interface Spot {
  id: string;
  x: number;
  z: number;
  /** Direção do nariz do carro estacionado (+1 olha para +Z). */
  facing: 1 | -1;
  occupied: boolean;
  carColor: number;
}

export interface Band {
  kind: 'spots' | 'aisle';
  z0: number;
  z1: number;
  /** Para fileiras de vagas: de que lado fica a circulação. */
  aisleSide?: 1 | -1;
}

/** Faixas em Z, de fora para dentro em cada metade: vagas | circulação | vagas | circulação | faixa central. */
export function garageBands(cfg: GarageConfig = GARAGE_CONFIG): Band[] {
  const bands: Band[] = [];
  for (const sign of [-1, 1] as const) {
    let edge = cfg.halfZ;
    const push = (kind: Band['kind'], depth: number, aisleSide?: 1 | -1) => {
      const a = sign * edge;
      const b = sign * (edge - depth);
      bands.push({ kind, z0: Math.min(a, b), z1: Math.max(a, b), aisleSide });
      edge -= depth;
    };
    push('spots', cfg.spotDepth, (-sign) as 1 | -1);
    push('aisle', cfg.aisleWidth);
    push('spots', cfg.spotDepth, sign as 1 | -1);
    const remaining = edge - cfg.spineHalf;
    if (remaining > 0.5) push('aisle', remaining);
  }
  return bands.sort((a, b) => a.z0 - b.z0);
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CAR_COLORS = [0x1c1f24, 0xe8e8e6, 0x8d939b, 0x203a63, 0x3b3f45, 0x6b1f24, 0xc9ccd1];

export function garageSpots(level: number, cfg: GarageConfig = GARAGE_CONFIG): Spot[] {
  const rand = rng(cfg.seed + level * 101);
  const usable = cfg.halfX - cfg.crossAisle;
  const count = Math.floor((usable * 2) / cfg.spotWidth);
  const startX = -(count * cfg.spotWidth) / 2 + cfg.spotWidth / 2;
  const spots: Spot[] = [];
  garageBands(cfg)
    .filter((b) => b.kind === 'spots')
    .forEach((band, row) => {
      const zc = (band.z0 + band.z1) / 2;
      for (let i = 0; i < count; i++) {
        const occupied = rand() < cfg.occupancy;
        spots.push({
          id: `G${level + 1}-${String.fromCharCode(65 + row)}${String(i + 1).padStart(2, '0')}`,
          x: startX + i * cfg.spotWidth,
          z: zc,
          facing: band.aisleSide === 1 ? -1 : 1,
          occupied,
          carColor: CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)],
        });
      }
    });
  return spots;
}

/** Rampa interna entre níveis (na faixa central) e rampa de acesso pela rua dos fundos. */
export function garageRamps(cfg: GarageConfig = GARAGE_CONFIG) {
  const innerLength = 17.5;
  const accessLength = 18;
  return {
    inner: { x0: cfg.halfX - cfg.crossAisle - innerLength, x1: cfg.halfX - cfg.crossAisle, halfWidth: cfg.spineHalf - 0.5, length: innerLength, slope: cfg.levelHeight / innerLength },
    access: { x0: cfg.halfX - cfg.crossAisle, x1: cfg.halfX, z0: -cfg.halfZ - accessLength, z1: -cfg.halfZ, length: accessLength, slope: cfg.levelHeight / accessLength },
  };
}

/** Pilares a cada 3 vagas, nas linhas entre fileiras e circulação. */
export function garageColumns(cfg: GarageConfig = GARAGE_CONFIG): [number, number][] {
  const usable = cfg.halfX - cfg.crossAisle;
  const count = Math.floor((usable * 2) / cfg.spotWidth);
  const startX = -(count * cfg.spotWidth) / 2;
  const xs: number[] = [];
  for (let i = 0; i <= count; i += 3) xs.push(startX + i * cfg.spotWidth);
  const zs = new Set<number>();
  for (const b of garageBands(cfg)) {
    if (b.kind !== 'spots') continue;
    // pilar na borda da vaga voltada para a circulação
    zs.add(b.aisleSide === 1 ? b.z1 - 0.3 : b.z0 + 0.3);
  }
  const cols: [number, number][] = [];
  xs.forEach((x) => zs.forEach((z) => cols.push([x, z])));
  return cols;
}

export const TECH_ROOMS = [
  { id: 'bombas', name: 'Casa de bombas', x: [-23, -14] as [number, number], level: 0 },
  { id: 'subestacao', name: 'Subestação / gerador', x: [-13, -5.5] as [number, number], level: 0 },
  { id: 'reservatorio', name: 'Reservatório inferior', x: [-23, -14] as [number, number], level: 1 },
  { id: 'lixo', name: 'Central de resíduos', x: [-13, -5.5] as [number, number], level: 1 },
];

export function garageStats(cfg: GarageConfig = GARAGE_CONFIG) {
  const perLevel = garageSpots(0, cfg).length;
  return { levels: cfg.levels, perLevel, total: perLevel * cfg.levels, depth: cfg.levels * cfg.levelHeight };
}
