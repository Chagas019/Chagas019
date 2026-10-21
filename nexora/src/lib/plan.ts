/**
 * Geometria da planta baixa. Funções puras usadas pela planta 2D (SVG), pelo gerador do modelo 3D
 * e pelos testes. A planta guarda só os ambientes (polígonos ortogonais em metros); paredes,
 * aberturas e mobiliário ilustrativo são derivados daqui, então 2D e 3D nunca divergem.
 */
import type { FurnitureKind, PlanFurniture, PlanLevel, PlanRoom, Point, RoomKind, Side } from '@/types/property';

/** Ambientes descobertos: não geram paredes */
export const OUTDOOR_KINDS: RoomKind[] = ['piscina', 'jardim', 'gourmet', 'varanda', 'lote'];
/** Ambientes que recebem cobertura (laje) mesmo sendo abertos */
export const COVERED_OPEN_KINDS: RoomKind[] = ['gourmet', 'varanda'];
const GLAZED: RoomKind[] = ['sala', 'suite', 'quarto', 'escritorio', 'loja', 'cozinha'];
const OPEN_PAIRS: [RoomKind, RoomKind][] = [['sala', 'cozinha'], ['sala', 'circulacao'], ['loja', 'circulacao']];

export const isIndoor = (r: PlanRoom) => !OUTDOOR_KINDS.includes(r.kind);

export function polygonArea(poly: Point[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

export function polygonCentroid(poly: Point[]): Point {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    const f = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
    a += f;
  }
  if (Math.abs(a) < 1e-9) return poly[0];
  return [cx / (3 * a), cy / (3 * a)];
}

export function bounds(poly: Point[]) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

export function pointInPolygon([x, y]: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Área do ambiente: a declarada ou a calculada pelo polígono, com uma casa decimal */
export const roomArea = (r: PlanRoom) => Math.round((r.area ?? polygonArea(r.polygon)) * 10) / 10;

/** Ponto de rótulo: centroide, ou o centro do maior retângulo quando o centroide cai fora (formas em L) */
export function labelPoint(r: PlanRoom): Point {
  const c = polygonCentroid(r.polygon);
  if (pointInPolygon(c, r.polygon)) return c;
  const b = bounds(r.polygon);
  let best: Point = [b.cx, b.cy];
  let bestScore = -1;
  for (let i = 1; i < 8; i++)
    for (let j = 1; j < 8; j++) {
      const p: Point = [b.minX + (b.w * i) / 8, b.minY + (b.h * j) / 8];
      if (!pointInPolygon(p, r.polygon)) continue;
      const score = Math.min(...r.polygon.map((q, k) => distToSegment(p, q, r.polygon[(k + 1) % r.polygon.length])));
      if (score > bestScore) { bestScore = score; best = p; }
    }
  return best;
}

function distToSegment([px, py]: Point, [ax, ay]: Point, [bx, by]: Point) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/* ---------------- Paredes ---------------- */

export type SegmentKind = 'solid' | 'glass' | 'window' | 'door' | 'open';
export interface WallSegment { from: number; to: number; kind: SegmentKind }
export interface ResolvedWall {
  a: Point;
  b: Point;
  exterior: boolean;
  /** ids dos ambientes internos que a parede delimita */
  rooms: string[];
  segments: WallSegment[];
  thickness: number;
}

const EPS = 1e-6;
const key = (n: number) => Math.round(n * 1000) / 1000;

interface Edge { orient: 'h' | 'v'; line: number; from: number; to: number; room: PlanRoom; side: Side }

function roomEdges(room: PlanRoom): Edge[] {
  const out: Edge[] = [];
  const poly = room.polygon;
  const c = polygonCentroid(poly);
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    if (Math.abs(y1 - y2) < EPS) {
      // aresta horizontal: o lado é "n" se o interior do ambiente fica abaixo dela
      const probe: Point = [(x1 + x2) / 2, y1 + 0.01];
      const below = pointInPolygon(probe, poly) || (!pointInPolygon([(x1 + x2) / 2, y1 - 0.01], poly) && c[1] > y1);
      out.push({ orient: 'h', line: key(y1), from: Math.min(x1, x2), to: Math.max(x1, x2), room, side: below ? 'n' : 's' });
    } else if (Math.abs(x1 - x2) < EPS) {
      const probe: Point = [x1 + 0.01, (y1 + y2) / 2];
      const right = pointInPolygon(probe, poly) || (!pointInPolygon([x1 - 0.01, (y1 + y2) / 2], poly) && c[0] > x1);
      out.push({ orient: 'v', line: key(x1), from: Math.min(y1, y2), to: Math.max(y1, y2), room, side: right ? 'w' : 'e' });
    }
    // arestas inclinadas não são suportadas pelo gerador automático (as plantas usam ambientes ortogonais)
  }
  return out;
}

const pairIs = (a: RoomKind, b: RoomKind) => OPEN_PAIRS.some(([p, q]) => (p === a && q === b) || (p === b && q === a));

/** Deriva as paredes de um pavimento a partir dos ambientes internos e decide portas, janelas e vidros. */
export function resolveWalls(level: PlanLevel): ResolvedWall[] {
  const indoor = level.rooms.filter(isIndoor);
  const outdoorIds = new Set(level.rooms.filter((r) => !isIndoor(r)).map((r) => r.id));
  const edges = indoor.flatMap(roomEdges);
  const lines = new Map<string, Edge[]>();
  for (const e of edges) {
    const k = `${e.orient}:${e.line}`;
    (lines.get(k) ?? lines.set(k, []).get(k)!).push(e);
  }

  const walls: ResolvedWall[] = [];
  for (const group of lines.values()) {
    const cuts = [...new Set(group.flatMap((e) => [key(e.from), key(e.to)]))].sort((a, b) => a - b);
    // pedaços elementares com os ambientes que os cobrem
    const pieces: { from: number; to: number; edges: Edge[] }[] = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      const from = cuts[i], to = cuts[i + 1];
      const covering = group.filter((e) => e.from <= from + EPS && e.to >= to - EPS);
      if (covering.length) pieces.push({ from, to, edges: covering });
    }
    // junta pedaços contíguos com o mesmo par de ambientes
    const merged: typeof pieces = [];
    for (const p of pieces) {
      const last = merged[merged.length - 1];
      const sig = (x: typeof p) => x.edges.map((e) => e.room.id).sort().join('|');
      if (last && Math.abs(last.to - p.from) < EPS && sig(last) === sig(p)) last.to = p.to;
      else merged.push({ ...p });
    }
    for (const p of merged) {
      const { orient, line } = p.edges[0];
      const a: Point = orient === 'h' ? [p.from, line] : [line, p.from];
      const b: Point = orient === 'h' ? [p.to, line] : [line, p.to];
      const len = p.to - p.from;
      const exterior = p.edges.length === 1;
      const rooms = p.edges.map((e) => e.room);
      let segments: WallSegment[];
      if (exterior) {
        const e = p.edges[0];
        segments = exteriorSegments(e.room, e.side, len, touchesOutdoor(level, e, p.from, p.to, outdoorIds));
      } else {
        segments = interiorSegments(rooms[0], rooms[1], len);
      }
      walls.push({ a, b, exterior, rooms: rooms.map((r) => r.id), segments, thickness: exterior ? 0.22 : 0.12 });
    }
  }
  return walls;
}

/** A aresta encosta num ambiente aberto (piscina, gourmet...)? Usado para preferir vidro na fachada voltada ao lazer. */
function touchesOutdoor(level: PlanLevel, e: Edge, from: number, to: number, outdoorIds: Set<string>) {
  const mid = (from + to) / 2;
  const off = e.side === 'n' || e.side === 'w' ? -0.3 : 0.3;
  const probe: Point = e.orient === 'h' ? [mid, e.line + off] : [e.line + off, mid];
  return level.rooms.some((r) => outdoorIds.has(r.id) && pointInPolygon(probe, r.polygon));
}

function exteriorSegments(room: PlanRoom, side: Side, len: number, facesOutdoor: boolean): WallSegment[] {
  if (room.openSides?.includes(side)) return [{ from: 0, to: len, kind: 'open' }];
  if (room.solidSides?.includes(side) || len < 1.2) return [{ from: 0, to: len, kind: 'solid' }];
  if (GLAZED.includes(room.kind) || (facesOutdoor && room.kind !== 'banheiro')) {
    if (len < 2.2) return withSolids({ from: 0.3, to: len - 0.3, kind: 'window' }, len);
    return withSolids({ from: 0.35, to: len - 0.35, kind: 'glass' }, len);
  }
  const w = Math.min(len - 0.8, room.kind === 'banheiro' ? 1.2 : 1.8);
  if (w < 0.6) return [{ from: 0, to: len, kind: 'solid' }];
  const from = (len - w) / 2;
  return withSolids({ from, to: from + w, kind: 'window' }, len);
}

function interiorSegments(a: PlanRoom, b: PlanRoom, len: number): WallSegment[] {
  if (pairIs(a.kind, b.kind)) {
    if (len < 1.4) return [{ from: 0, to: len, kind: 'open' }];
    return withSolids({ from: 0.3, to: len - 0.3, kind: 'open' }, len);
  }
  if (len < 1.3) return [{ from: 0, to: len, kind: 'solid' }];
  const w = 0.9;
  // a porta fica perto de uma das extremidades, como numa planta real
  const from = Math.min(0.25, len - w);
  return withSolids({ from, to: from + w, kind: 'door' }, len);
}

function withSolids(s: WallSegment, len: number): WallSegment[] {
  const out: WallSegment[] = [];
  if (s.from > EPS) out.push({ from: 0, to: s.from, kind: 'solid' });
  out.push(s);
  if (s.to < len - EPS) out.push({ from: s.to, to: len, kind: 'solid' });
  return out;
}

/* ---------------- Mobiliário ilustrativo ---------------- */

const f = (kind: FurnitureKind, at: Point, size: [number, number], roomId: string, rotation = 0): PlanFurniture => ({ kind, at, size, rotation, roomId });

/** Distribui mobiliário típico em cada ambiente retangular (ou no maior retângulo de um L). */
export function autoFurniture(level: PlanLevel): PlanFurniture[] {
  if (level.furniture) return level.furniture;
  const out: PlanFurniture[] = [];
  for (const r of level.rooms) {
    const lp = labelPoint(r);
    const b = bounds(r.polygon);
    // usa um retângulo útil em volta do ponto de rótulo
    const w = Math.min(b.w, 2 * Math.min(lp[0] - b.minX, b.maxX - lp[0]) || b.w);
    const h = Math.min(b.h, 2 * Math.min(lp[1] - b.minY, b.maxY - lp[1]) || b.h);
    const [cx, cy] = lp;
    const wide = w >= h;
    switch (r.kind) {
      case 'sala': {
        if (w < 3 || h < 3) break;
        out.push(f('tapete', [cx, cy + 0.3], [Math.min(3.4, w - 1), Math.min(2.6, h - 1.2)], r.id));
        out.push(f('sofa', [cx, cy + Math.min(1.6, h / 2 - 0.7)], [Math.min(2.8, w - 1.4), 0.95], r.id));
        out.push(f('mesa-centro', [cx, cy + 0.3], [1.1, 0.6], r.id));
        out.push(f('poltrona', [cx - Math.min(1.7, w / 2 - 0.6), cy - 0.3], [0.8, 0.8], r.id, 90));
        if (w > 6) out.push(f('mesa', [cx + Math.min(w / 2 - 1.4, 3), cy - Math.min(h / 2 - 1.2, 1)], [2.0, 1.0], r.id));
        break;
      }
      case 'cozinha':
        if (w < 2 || h < 2) break;
        out.push(f('bancada', wide ? [cx, b.minY + 0.35] : [b.minX + 0.35, cy], wide ? [w - 0.4, 0.62] : [0.62, h - 0.4], r.id));
        if (w > 3.2 && h > 3.2) out.push(f('ilha', [cx, cy + 0.4], wide ? [Math.min(2.4, w - 2), 0.95] : [0.95, Math.min(2.4, h - 2)], r.id));
        break;
      case 'suite':
      case 'quarto': {
        if (w < 2.4 || h < 2.4) break;
        const big = r.kind === 'suite';
        const bw = big ? 1.93 : 1.4, bl = 2.05;
        out.push(f('cama', [cx, cy - 0.2], [bw, bl], r.id));
        out.push(f('criado', [cx - bw / 2 - 0.35, cy - 0.2 - bl / 2 + 0.3], [0.45, 0.4], r.id));
        out.push(f('criado', [cx + bw / 2 + 0.35, cy - 0.2 - bl / 2 + 0.3], [0.45, 0.4], r.id));
        if (h > 4 || w > 4.5) out.push(f('armario', wide ? [b.maxX - 0.32, cy] : [cx, b.maxY - 0.32], wide ? [0.6, Math.min(2.6, h - 1)] : [Math.min(2.6, w - 1), 0.6], r.id));
        break;
      }
      case 'banheiro':
        if (w < 1.4 || h < 1.4) break;
        out.push(f('pia', [cx, b.minY + 0.28], [Math.min(1.4, w - 0.6), 0.5], r.id));
        out.push(f('vaso', [b.minX + 0.45, b.maxY - 0.4], [0.4, 0.62], r.id));
        if (w * h > 5) out.push(f('chuveiro', [b.maxX - 0.55, b.maxY - 0.55], [0.95, 0.95], r.id));
        break;
      case 'gourmet':
        out.push(f('mesa', [cx, cy + 0.4], [2.4, 1.0], r.id));
        out.push(f('churrasqueira', wide ? [cx, b.minY + 0.4] : [b.minX + 0.4, cy], wide ? [Math.min(3, w - 1), 0.7] : [0.7, Math.min(3, h - 1)], r.id));
        break;
      case 'garagem': {
        const n = Math.max(1, Math.min(2, Math.floor((wide ? w : h) / 2.7)));
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * 2.7;
          out.push(wide ? f('carro', [cx + off, cy], [1.85, 4.5], r.id) : f('carro', [cx, cy + off], [4.5, 1.85], r.id));
        }
        break;
      }
      case 'piscina': {
        out.push(f('espreguicadeira', [b.minX + 0.9, b.maxY + 1.1], [0.7, 1.9], r.id));
        out.push(f('espreguicadeira', [b.minX + 2, b.maxY + 1.1], [0.7, 1.9], r.id));
        break;
      }
      case 'jardim': {
        const n = Math.max(2, Math.round((w * h) / 30));
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          out.push(f(i % 3 === 2 ? 'arbusto' : 'arvore', [b.minX + 1.2 + (w - 2.4) * t, i % 2 ? b.maxY - 1.4 : b.minY + 1.6 + (h > 6 ? 1 : 0)], i % 3 === 2 ? [1.2, 1.2] : [2.6, 2.6], r.id));
        }
        break;
      }
      case 'escritorio':
        if (w < 2 || h < 2) break;
        out.push(f('mesa', [cx, cy], [1.6, 0.75], r.id));
        out.push(f('cadeira', [cx, cy + 0.65], [0.55, 0.55], r.id));
        out.push(f('estante', wide ? [cx, b.minY + 0.22] : [b.minX + 0.22, cy], wide ? [Math.min(2.4, w - 0.6), 0.35] : [0.35, Math.min(2.4, h - 0.6)], r.id));
        break;
      case 'loja':
        out.push(f('balcao', [cx, b.maxY - 2], [Math.min(3.5, w - 2), 0.7], r.id));
        out.push(f('estante', [b.minX + 0.3, cy], [0.45, Math.min(6, h - 2)], r.id));
        out.push(f('estante', [b.maxX - 0.3, cy], [0.45, Math.min(6, h - 2)], r.id));
        break;
      default:
        break;
    }
  }
  if (level.stairs) {
    const s = level.stairs;
    out.push(f('escada', [s.x + s.w / 2, s.y + s.d / 2], [s.w, s.d], 'escada'));
  }
  return out;
}

/** Ambiente que contém um ponto (para clique em hotspots e sincronia 2D↔3D) */
export function roomAt(level: PlanLevel, p: Point): PlanRoom | undefined {
  return [...level.rooms].sort((a, b) => polygonArea(a.polygon) - polygonArea(b.polygon)).find((r) => pointInPolygon(p, r.polygon));
}

/** Soma das áreas internas (ambientes cobertos), útil para conferir a área construída declarada */
export function coveredArea(levels: PlanLevel[]): number {
  return levels.flatMap((l) => l.rooms).filter((r) => isIndoor(r) || COVERED_OPEN_KINDS.includes(r.kind)).reduce((s, r) => s + roomArea(r), 0);
}

export const rect = (x: number, y: number, w: number, h: number): Point[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
