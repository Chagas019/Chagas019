/**
 * Gera um modelo 3D arquitetônico a partir de uma planta vetorial (VectorFloorPlan).
 * Usado em dois lugares:
 *  - scripts/render-assets.mjs: exporta o .glb demonstrativo e os renders das fotos de demonstração;
 *  - nada no site em produção depende deste arquivo: o visualizador carrega o .glb pronto.
 * Convenção: x do modelo = x da planta, z do modelo = y da planta, ambos centrados no lote.
 */
import * as THREE from 'three';
import type { PlanFurniture, PlanLevel, PlanRoom, Point, VectorFloorPlan } from '@/types/property';
import { autoFurniture, bounds, COVERED_OPEN_KINDS, isIndoor, pointInPolygon, resolveWalls } from '@/lib/plan';
import { createMaterials, type FacadeStyle, type MaterialSet } from './materials';

export interface BuildOptions {
  facade?: FacadeStyle;
  /** Pavimento com fachada em madeira (ex.: o volume superior) */
  accentLevel?: string;
  site?: boolean;
  /** Inclui a laje de cobertura e o teto (desligar para vistas "casa de bonecas") */
  roof?: boolean;
  /** Raio da vegetação de fundo, em metros (0 desliga) */
  backdrop?: number;
  ground?: 'grama' | 'nenhum';
}

const box = (w: number, h: number, d: number, m: THREE.Material, name?: string) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.001), Math.max(h, 0.001), Math.max(d, 0.001)), m);
  mesh.castShadow = mesh.receiveShadow = true;
  if (name) mesh.name = name;
  return mesh;
};

export function planCenter(plan: VectorFloorPlan): Point {
  const l = plan.levels[0];
  return [l.width / 2, l.depth / 2];
}

export function buildFromPlan(plan: VectorFloorPlan, opts: BuildOptions = {}) {
  const M = createMaterials(opts.facade ?? 'concreto');
  const accent = opts.accentLevel ? createMaterials('madeira').facade : null;
  const [cx, cz] = planCenter(plan);
  const root = new THREE.Group();
  root.name = 'nexora_model';
  const toW = ([x, y]: Point) => new THREE.Vector2(x - cx, y - cz);

  plan.levels.forEach((level, i) => {
    const g = new THREE.Group();
    g.name = `level_${level.id}`;
    const facade = accent && level.id === opts.accentLevel ? accent : M.facade;
    buildFloors(g, level, M, toW);
    buildWalls(g, level, M, facade, toW);
    buildFurniture(g, level, M, toW);
    if (opts.roof !== false) {
      const roof = buildRoof(level, M, toW, i === plan.levels.length - 1);
      roof.name = `roof_${level.id}`;
      root.add(roof);
    }
    root.add(g);
  });

  if (opts.site !== false) root.add(buildSite(plan, M, toW, opts));
  return { root, materials: M };
}

/* ---------- Pisos ---------- */
function shapeFrom(poly: Point[], toW: (p: Point) => THREE.Vector2) {
  const s = new THREE.Shape();
  poly.forEach((p, i) => {
    const v = toW(p);
    // a forma é desenhada no plano XY e girada -90° em X, então y da forma = -z do mundo
    if (i === 0) s.moveTo(v.x, -v.y);
    else s.lineTo(v.x, -v.y);
  });
  s.closePath();
  return s;
}

function slab(poly: Point[], y: number, thickness: number, m: THREE.Material, toW: (p: Point) => THREE.Vector2, name?: string) {
  const geo = new THREE.ExtrudeGeometry(shapeFrom(poly, toW), { depth: thickness, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  // UVs em metros para as texturas repetirem na escala certa
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.y = y - thickness;
  mesh.castShadow = mesh.receiveShadow = true;
  if (name) mesh.name = name;
  return mesh;
}

function floorMaterial(r: PlanRoom, M: MaterialSet) {
  switch (r.kind) {
    case 'banheiro': case 'servico': case 'cozinha': case 'deposito': return M.floorStone;
    case 'garagem': return M.concrete;
    case 'gourmet': case 'varanda': return M.deck;
    case 'loja': return M.floorStone;
    default: return M.floorWood;
  }
}

function buildFloors(g: THREE.Group, level: PlanLevel, M: MaterialSet, toW: (p: Point) => THREE.Vector2) {
  for (const r of level.rooms) {
    if (r.kind === 'piscina' || r.kind === 'jardim' || r.kind === 'lote') continue;
    const top = level.elevation + 0.12;
    if (level.elevation > 0) {
      // pavimento superior: acabamento fino por cima e laje branca por baixo (o teto de quem está embaixo)
      g.add(slab(r.polygon, top, 0.03, floorMaterial(r, M), toW, `floor_${r.id}`));
      g.add(slab(r.polygon, top - 0.03, 0.2, M.slab, toW, `floor_under_${r.id}`));
    } else {
      g.add(slab(r.polygon, top, 0.12, floorMaterial(r, M), toW, `floor_${r.id}`));
    }
  }
  if (level.stairs && level.elevation === 0) {
    const s = level.stairs;
    const steps = 18;
    const rise = 3.2 / steps;
    const asc = s.dir;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const along = asc === 's' || asc === 'n' ? s.d : s.w;
      const run = along / steps;
      let px = s.x + s.w / 2, py = s.y + s.d / 2;
      if (asc === 's') py = s.y + t * s.d;
      if (asc === 'n') py = s.y + s.d - t * s.d;
      if (asc === 'e') px = s.x + t * s.w;
      if (asc === 'w') px = s.x + s.w - t * s.w;
      const v = toW([px, py]);
      const step = box(asc === 'n' || asc === 's' ? s.w : run * 1.02, 0.05, asc === 'n' || asc === 's' ? run * 1.02 : s.d, M.wood, 'stair');
      step.position.set(v.x, 0.12 + rise * (i + 1), v.y);
      g.add(step);
    }
  }
}

/* ---------- Paredes, vidros e esquadrias ---------- */
function buildWalls(g: THREE.Group, level: PlanLevel, M: MaterialSet, facade: THREE.Material, toW: (p: Point) => THREE.Vector2) {
  const H = level.height;
  const base = level.elevation + 0.12;
  const rooms = new Map(level.rooms.map((r) => [r.id, r]));
  for (const w of resolveWalls(level)) {
    const a = toW(w.a), b = toW(w.b);
    const dir = b.clone().sub(a);
    dir.normalize();
    const angle = -Math.atan2(dir.y, dir.x);
    // normal externa: aponta para fora do ambiente
    let normal = new THREE.Vector2(-dir.y, dir.x);
    if (w.exterior) {
      const room = rooms.get(w.rooms[0])!;
      const mid: Point = [(w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2];
      const probe: Point = [mid[0] + normal.x * 0.3, mid[1] + normal.y * 0.3];
      if (pointInPolygon(probe, room.polygon)) normal = normal.multiplyScalar(-1);
    }
    const t = w.thickness;
    const piece = (from: number, to: number, y0: number, y1: number, m: THREE.Material, thick = t, offset = 0, name?: string) => {
      if (to - from < 0.01 || y1 - y0 < 0.01) return;
      const mesh = box(to - from, y1 - y0, thick, m, name);
      const c = a.clone().add(dir.clone().multiplyScalar((from + to) / 2)).add(normal.clone().multiplyScalar(offset));
      mesh.position.set(c.x, base + (y0 + y1) / 2, c.y);
      mesh.rotation.y = angle;
      g.add(mesh);
    };
    const solid = (from: number, to: number, y0: number, y1: number) => {
      piece(from, to, y0, y1, w.exterior ? M.wall : M.wall);
      if (w.exterior) piece(from, to, y0, y1, facade, 0.03, t / 2 + 0.015);
    };
    for (const s of w.segments) {
      switch (s.kind) {
        case 'solid':
          solid(s.from, s.to, 0, H);
          break;
        case 'glass': {
          const head = H - 0.12;
          solid(s.from, s.to, head, H);
          piece(s.from, s.to, 0.0, head, M.glass, 0.025, 0, 'glass');
          // caixilhos finos a cada ~2,4 m
          const n = Math.max(1, Math.round((s.to - s.from) / 2.4));
          for (let k = 0; k <= n; k++) {
            const x = s.from + ((s.to - s.from) * k) / n;
            piece(x - 0.025, x + 0.025, 0, head, M.frame, 0.06);
          }
          piece(s.from, s.to, 0, 0.04, M.frame, 0.07);
          break;
        }
        case 'window': {
          const sill = rooms.get(w.rooms[0])?.kind === 'banheiro' ? 1.5 : 0.95;
          const head = Math.min(2.25, H - 0.3);
          solid(s.from, s.to, 0, sill);
          solid(s.from, s.to, head, H);
          piece(s.from, s.to, sill, head, M.glass, 0.025, 0, 'glass');
          piece(s.from, s.to, sill - 0.03, sill, M.frame, 0.08);
          piece(s.from, s.to, head, head + 0.03, M.frame, 0.08);
          break;
        }
        case 'door':
          solid(s.from, s.to, 2.2, H);
          break;
        case 'open':
          if (!w.exterior && H > 2.8) piece(s.from, s.to, H - 0.25, H, M.wall);
          break;
      }
    }
  }
}

/* ---------- Coberturas ---------- */
function buildRoof(level: PlanLevel, M: MaterialSet, toW: (p: Point) => THREE.Vector2, top: boolean) {
  const g = new THREE.Group();
  const y = level.elevation + 0.12 + level.height;
  const covered = level.rooms.filter((r) => isIndoor(r) || COVERED_OPEN_KINDS.includes(r.kind));
  for (const r of covered) {
    g.add(slab(r.polygon, y + 0.18, 0.18, M.slab, toW, `ceiling_${r.id}`));
    if (isIndoor(r) && r.kind !== 'garagem') {
      // luminária embutida (acende no modo noturno do visualizador)
      const b = bounds(r.polygon);
      const c = toW([b.cx, b.cy]);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(Math.min(1.6, b.w * 0.4), 0.02, Math.min(1.6, b.h * 0.4)), M.lamp);
      lamp.name = `lamp_${r.id}`;
      lamp.position.set(c.x, y - 0.01, c.y);
      g.add(lamp);
    }
    if (COVERED_OPEN_KINDS.includes(r.kind)) {
      // pilares nos cantos livres
      const b = bounds(r.polygon);
      for (const p of [[b.maxX - 0.15, b.maxY - 0.15], [b.minX + 0.15, b.maxY - 0.15], [b.maxX - 0.15, b.minY + 0.15]] as Point[]) {
        if (level.rooms.some((o) => o.id !== r.id && isIndoor(o) && pointInPolygon(p, o.polygon))) continue;
        const v = toW(p);
        const col = box(0.18, level.height, 0.18, M.frame);
        col.position.set(v.x, level.elevation + 0.12 + level.height / 2, v.y);
        g.add(col);
      }
    }
  }
  if (top && covered.length) {
    // beiral: laje fina que ultrapassa as fachadas de cada ambiente coberto (não fecha pátios internos)
    const over = 0.6;
    for (const r of covered) {
      const b = bounds(r.polygon);
      g.add(slab([[b.minX - over, b.minY - over], [b.maxX + over, b.minY - over], [b.maxX + over, b.maxY + over], [b.minX - over, b.maxY + over]], y + 0.3, 0.12, M.slab, toW, 'roof_eave'));
    }
  }
  return g;
}

/* ---------- Mobiliário ---------- */
function buildFurniture(g: THREE.Group, level: PlanLevel, M: MaterialSet, toW: (p: Point) => THREE.Vector2) {
  const base = level.elevation + 0.12;
  for (const f of autoFurniture(level)) {
    if (f.kind === 'escada') continue;
    const obj = furnitureMesh(f, M);
    if (!obj) continue;
    const v = toW(f.at);
    obj.position.set(v.x, f.kind === 'arvore' || f.kind === 'arbusto' || f.kind === 'espreguicadeira' ? 0 : base, v.y);
    obj.rotation.y = -THREE.MathUtils.degToRad(f.rotation ?? 0);
    obj.name = `furniture_${f.kind}_${f.roomId ?? ''}`;
    g.add(obj);
  }
}

function furnitureMesh(f: PlanFurniture, M: MaterialSet): THREE.Object3D | null {
  const [w, d] = f.size;
  const g = new THREE.Group();
  const add = (m: THREE.Mesh, x: number, y: number, z: number) => { m.position.set(x, y, z); g.add(m); return m; };
  switch (f.kind) {
    case 'tapete': add(box(w, 0.012, d, M.rug), 0, 0.006, 0); break;
    case 'sofa':
      add(box(w, 0.42, d, M.fabric), 0, 0.21, 0);
      add(box(w, 0.4, 0.2, M.fabric), 0, 0.62, d / 2 - 0.1);
      add(box(0.18, 0.2, d, M.fabric), -w / 2 + 0.09, 0.52, 0);
      add(box(0.18, 0.2, d, M.fabric), w / 2 - 0.09, 0.52, 0);
      break;
    case 'poltrona':
      add(box(w, 0.4, d, M.fabricDark), 0, 0.2, 0);
      add(box(w, 0.42, 0.14, M.fabricDark), 0, 0.6, d / 2 - 0.07);
      break;
    case 'mesa-centro': add(box(w, 0.06, d, M.wood), 0, 0.36, 0); add(box(w * 0.6, 0.33, d * 0.6, M.stone), 0, 0.165, 0); break;
    case 'mesa': {
      add(box(w, 0.05, d, M.wood), 0, 0.75, 0);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(box(0.05, 0.73, 0.05, M.frame), sx * (w / 2 - 0.1), 0.365, sz * (d / 2 - 0.1));
      const n = Math.max(2, Math.floor(w / 0.7));
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + (w / n) * (i + 0.5);
        add(box(0.45, 0.45, 0.45, M.fabricDark), x, 0.225, -d / 2 - 0.35);
        add(box(0.45, 0.45, 0.45, M.fabricDark), x, 0.225, d / 2 + 0.35);
      }
      break;
    }
    case 'cadeira': add(box(w, 0.45, d, M.fabricDark), 0, 0.225, 0); break;
    case 'cama':
      add(box(w, 0.3, d, M.wood), 0, 0.15, 0);
      add(box(w - 0.06, 0.22, d - 0.1, M.white), 0, 0.41, 0.03);
      add(box(w * 0.98, 0.18, d * 0.55, M.fabric), 0, 0.53, 0.35);
      add(box(w + 0.2, 1.0, 0.08, M.wood), 0, 0.5, -d / 2 - 0.04);
      add(box(w * 0.38, 0.12, 0.35, M.white), -w * 0.24, 0.58, -d / 2 + 0.3);
      add(box(w * 0.38, 0.12, 0.35, M.white), w * 0.24, 0.58, -d / 2 + 0.3);
      break;
    case 'criado': add(box(w, 0.5, d, M.wood), 0, 0.25, 0); break;
    case 'armario': add(box(w, 2.4, d, M.wood), 0, 1.2, 0); break;
    case 'estante': add(box(w, 2.0, d, M.wood), 0, 1.0, 0); break;
    case 'bancada': add(box(w, 0.86, d, M.white), 0, 0.43, 0); add(box(w, 0.04, d + 0.02, M.stone), 0, 0.88, 0); break;
    case 'ilha': add(box(w, 0.88, d, M.wood), 0, 0.44, 0); add(box(w + 0.05, 0.05, d + 0.05, M.stone), 0, 0.9, 0); break;
    case 'balcao': add(box(w, 1.05, d, M.wood), 0, 0.525, 0); break;
    case 'pia': add(box(w, 0.08, d, M.stone), 0, 0.84, 0); add(box(w * 0.9, 0.5, d * 0.9, M.wood), 0, 0.55, 0); break;
    case 'vaso': add(box(w, 0.42, d, M.white), 0, 0.21, 0); break;
    case 'chuveiro': add(box(w, 0.04, d, M.floorStone), 0, 0.02, 0); add(box(0.02, 2.0, d, M.glass), -w / 2, 1.0, 0); break;
    case 'banheira': add(box(w, 0.55, d, M.white), 0, 0.275, 0); break;
    case 'churrasqueira': add(box(w, 0.9, d, M.stone), 0, 0.45, 0); add(box(Math.min(w, 1.2), 1.6, d, M.concrete), w / 2 - 0.6, 1.7, 0); break;
    case 'espreguicadeira': add(box(w, 0.08, d, M.white), 0, 0.32, 0).rotation.x = 0.04; add(box(w, 0.5, 0.06, M.white), 0, 0.55, -d / 2 + 0.25).rotation.x = -0.6; break;
    case 'carro': {
      const L = Math.max(w, d), W = Math.min(w, d);
      const car = new THREE.Group();
      const body = box(W, 0.6, L, M.car); body.position.y = 0.45; car.add(body);
      const cabin = box(W * 0.86, 0.48, L * 0.5, M.glass); cabin.position.set(0, 0.98, -L * 0.04); car.add(cabin);
      const roof = box(W * 0.84, 0.05, L * 0.46, M.car); roof.position.set(0, 1.23, -L * 0.04); car.add(roof);
      if (w > d) car.rotation.y = Math.PI / 2;
      g.add(car);
      break;
    }
    case 'arvore': {
      const h = 3.8 + (Math.abs(Math.sin(f.at[0] * 12.9 + f.at[1] * 78.2)) * 2.4);
      add(box(0.18, h * 0.55, 0.18, M.trunk), 0, h * 0.275, 0);
      for (let k = 0; k < 4; k++) {
        const r = w * (0.32 + 0.08 * Math.sin(k * 2.1 + f.at[0]));
        const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), k % 2 ? M.leaf : M.leafDark);
        s.castShadow = true;
        s.position.set(Math.cos(k * 1.9) * w * 0.18, h * 0.62 + k * 0.32, Math.sin(k * 1.9) * w * 0.18);
        s.scale.y = 0.85;
        g.add(s);
      }
      break;
    }
    case 'arbusto': {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(w / 2, 1), M.leafDark);
      s.castShadow = true;
      s.scale.y = 0.7;
      s.position.y = w * 0.3;
      g.add(s);
      break;
    }
    default:
      return null;
  }
  return g;
}

/* ---------- Terreno, piscina e entorno ---------- */
function buildSite(plan: VectorFloorPlan, M: MaterialSet, toW: (p: Point) => THREE.Vector2, opts: BuildOptions) {
  const g = new THREE.Group();
  g.name = 'site';
  const ground = plan.levels[0];
  if (opts.ground !== 'nenhum') {
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), M.grass);
    lawn.rotation.x = -Math.PI / 2;
    lawn.receiveShadow = true;
    lawn.name = 'ground';
    g.add(lawn);
  }
  for (const r of ground.rooms) {
    if (r.kind !== 'piscina') continue;
    const b = bounds(r.polygon);
    const c = toW([b.cx, b.cy]);
    const deckPoly: Point[] = [[b.minX - 1.6, b.minY - 1.2], [b.maxX + 1.2, b.minY - 1.2], [b.maxX + 1.2, b.maxY + 2.6], [b.minX - 1.6, b.maxY + 2.6]];
    g.add(slab(deckPoly, 0.06, 0.06, M.deck, toW, 'pool_deck'));
    const depth = 1.4;
    const basin = box(b.w, depth, b.h, M.poolTile, 'pool_basin');
    basin.position.set(c.x, 0.07 - depth / 2 - 0.01, c.y);
    basin.material = M.poolTile;
    g.add(basin);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(b.w, b.h), M.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(c.x, 0.075, c.y);
    water.name = 'pool_water';
    g.add(water);
    const cw = 0.35;
    for (const [w, d, x, z] of [
      [b.w + 2 * cw, cw, c.x, c.y - b.h / 2 - cw / 2],
      [b.w + 2 * cw, cw, c.x, c.y + b.h / 2 + cw / 2],
      [cw, b.h, c.x - b.w / 2 - cw / 2, c.y],
      [cw, b.h, c.x + b.w / 2 + cw / 2, c.y],
    ]) {
      const m = box(w, 0.05, d, M.coping, 'pool_coping');
      m.position.set(x, 0.1, z);
      g.add(m);
    }
  }
  // entorno: árvores em anel, deterministas
  const R = opts.backdrop ?? 34;
  if (R > 0) {
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + Math.sin(i * 7.3) * 0.08;
      const rr = R + Math.abs(Math.sin(i * 3.7)) * 14;
      const f: PlanFurniture = { kind: 'arvore', at: [Math.cos(a) * rr, Math.sin(a) * rr], size: [3.2 + Math.abs(Math.sin(i)) * 2, 3] };
      const tree = furnitureMesh(f, M)!;
      tree.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
      tree.scale.setScalar(1.3 + Math.abs(Math.sin(i * 1.3)) * 0.6);
      g.add(tree);
    }
  }
  return g;
}

/** Centro do ambiente em coordenadas do modelo (para hotspots e câmeras) */
export function roomWorldCenter(plan: VectorFloorPlan, levelId: string, roomId: string): [number, number, number] | null {
  const level = plan.levels.find((l) => l.id === levelId);
  const room = level?.rooms.find((r) => r.id === roomId);
  if (!level || !room) return null;
  const [cx, cz] = planCenter(plan);
  const b = bounds(room.polygon);
  return [b.cx - cx, level.elevation + 1.2, b.cy - cz];
}
