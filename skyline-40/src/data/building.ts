/**
 * SKYLINE 40 — dados construtivos CONCEITUAIS.
 * Todas as medidas abaixo são exemplos editáveis para a maquete digital e precisam ser
 * definidas e validadas por profissionais habilitados (arquitetura, estrutura, instalações).
 * Unidade da cena: 1 = 1 metro. O eixo +Z é a fachada frontal (voltada para o mar).
 */

export const FLOOR_COUNT = 40;

export const BUILDING = {
  /** Meia largura (X) e meia profundidade (Z) da laje típica. */
  halfX: 15,
  halfZ: 11,
  /** Profundidade das varandas além da fachada frontal/traseira. */
  balconyDepth: 2,
  /** Pé-direito (piso a piso) do térreo e dos demais pavimentos. */
  lobbyHeight: 5.6,
  typicalHeight: 3.4,
  slabThickness: 0.3,
  /** Núcleo de circulação vertical (elevadores + escadas). */
  core: { halfX: 4, halfZ: 2.5 },
  /** Hall de elevadores de cada lado do núcleo. */
  lobbyHalfX: 6,
} as const;

export type FloorVariant = 'lobby' | 'podium' | 'typical' | 'upper' | 'crown';
export type SectorId = 'acesso' | 'tipico' | 'superior' | 'cobertura';

export interface Sector {
  id: SectorId;
  name: string;
  range: [number, number];
  summary: string;
  color: string;
}

export const SECTORS: Sector[] = [
  { id: 'acesso', name: 'Acesso e áreas comuns', range: [1, 5], summary: 'Recepção, lazer coberto e os primeiros pavimentos residenciais.', color: '#9fb4cc' },
  { id: 'tipico', name: 'Residencial típico', range: [6, 30], summary: 'Pavimentos tipo com 4 unidades e varandas gourmet.', color: '#6f8fb8' },
  { id: 'superior', name: 'Residencial superior', range: [31, 39], summary: 'Unidades superiores com varandas que contornam as quinas.', color: '#4f74b3' },
  { id: 'cobertura', name: 'Cobertura', range: [40, 40], summary: 'Sky lounge, espaço gourmet e acesso à piscina panorâmica.', color: '#c9a86a' },
];

export function floorVariant(n: number): FloorVariant {
  if (n === 1) return 'lobby';
  if (n <= 3) return 'podium';
  if (n <= 30) return 'typical';
  if (n <= 39) return 'upper';
  return 'crown';
}

export function floorSector(n: number): Sector {
  return SECTORS.find((s) => n >= s.range[0] && n <= s.range[1]) ?? SECTORS[1];
}

/** Altura piso a piso do pavimento n. */
export function floorHeight(n: number): number {
  return n === 1 ? BUILDING.lobbyHeight : BUILDING.typicalHeight;
}

/** Cota do piso do pavimento n (o térreo, pavimento 01, está em y = 0). */
export function floorBaseY(n: number): number {
  if (n <= 1) return 0;
  return BUILDING.lobbyHeight + (n - 2) * BUILDING.typicalHeight;
}

/** Cota da laje de cobertura (topo do pavimento 40). */
export const ROOF_Y = floorBaseY(FLOOR_COUNT) + floorHeight(FLOOR_COUNT);

export const FLOORS: number[] = Array.from({ length: FLOOR_COUNT }, (_, i) => i + 1);

export function isResidential(n: number): boolean {
  return n >= 4 && n <= 39;
}

export function floorLabel(n: number): string {
  return String(n).padStart(2, '0');
}

export interface FloorInfo {
  number: number;
  label: string;
  title: string;
  sector: Sector;
  variant: FloorVariant;
  uses: string[];
  units: number;
  description: string;
}

const AMENITIES: Record<number, { title: string; uses: string[]; description: string }> = {
  1: {
    title: 'Térreo · Recepção',
    uses: ['Lobby com pé-direito duplo', 'Recepção e concierge', 'Lounge de espera', 'Marquise de acesso'],
    description: 'Acesso principal sob marquise em balanço, lobby envidraçado e jardim de chegada.',
  },
  2: {
    title: 'Bem-estar',
    uses: ['Academia', 'Spa e sauna', 'Sala de massagem', 'Vestiários'],
    description: 'Pavimento de bem-estar com vista para o jardim e fachada de brises verticais.',
  },
  3: {
    title: 'Convivência',
    uses: ['Salão de festas', 'Coworking', 'Brinquedoteca', 'Cinema privativo'],
    description: 'Ambientes de convivência integrados, com cozinha de apoio e terraço técnico.',
  },
  40: {
    title: 'Sky Lounge',
    uses: ['Lounge panorâmico', 'Espaço gourmet', 'Adega', 'Acesso à piscina da cobertura'],
    description: 'Nível superior integrado à cobertura: lounge envidraçado com acesso direto à piscina panorâmica.',
  },
};

export function getFloorInfo(n: number): FloorInfo {
  const sector = floorSector(n);
  const amenity = AMENITIES[n];
  if (amenity) {
    return { number: n, label: floorLabel(n), title: amenity.title, sector, variant: floorVariant(n), uses: amenity.uses, units: 0, description: amenity.description };
  }
  const upper = n >= 31;
  return {
    number: n,
    label: floorLabel(n),
    title: upper ? 'Residencial superior' : n <= 5 ? 'Primeiros residenciais' : 'Residencial típico',
    sector,
    variant: floorVariant(n),
    uses: upper
      ? ['4 unidades (exemplo)', 'Varandas contornando as quinas', 'Hall social privativo', 'Acabamento superior']
      : ['4 unidades (exemplo)', 'Varandas gourmet', 'Hall social', 'Núcleo com 4 elevadores'],
    units: 4,
    description: upper
      ? 'Unidades superiores com vistas desimpedidas e varandas que abraçam as quinas do edifício.'
      : 'Pavimento tipo com quatro unidades de duas suítes, organizadas ao redor do núcleo central.',
  };
}

/** Ficha técnica conceitual — todos os valores são exemplos editáveis. */
export const TECH_SHEET: { label: string; value: string }[] = [
  { label: 'Pavimentos acima do solo', value: '40' },
  { label: 'Subsolos de garagem', value: '2 (G1 e G2) — parametrizável' },
  { label: 'Altura estimada', value: `≈ ${Math.round(ROOF_Y)} m até a laje de cobertura (exemplo)` },
  { label: 'Pé-direito piso a piso', value: `${BUILDING.typicalHeight.toFixed(2).replace('.', ',')} m tipo · ${BUILDING.lobbyHeight.toFixed(1).replace('.', ',')} m térreo (exemplo)` },
  { label: 'Laje típica', value: `${BUILDING.halfX * 2} × ${BUILDING.halfZ * 2} m (exemplo)` },
  { label: 'Unidades por pavimento', value: '4 (pavimentos 04 a 39, exemplo)' },
  { label: 'Elevadores', value: '4 no núcleo central (conceitual)' },
  { label: 'Sistema estrutural', value: 'Concreto armado com núcleo rígido (a definir)' },
  { label: 'Fachada', value: 'Pele de vidro, brises de alumínio e lajes aparentes' },
  { label: 'Cobertura', value: 'Piscina panorâmica, deck, lounge e espaço gourmet' },
];
