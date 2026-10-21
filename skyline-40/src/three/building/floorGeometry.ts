import { IcosahedronGeometry, type BufferGeometry } from 'three';
import { BUILDING, type FloorVariant } from '../../data/building';
import { UNITS, WALLS, DOORS, unitToFloor } from '../../data/apartment';
import { box, cyl, merge } from '../utils/geo';

/**
 * Módulos construtivos reutilizáveis de cada tipo de pavimento. Cada módulo é dividido por
 * material e instanciado uma vez por pavimento (40 pavimentos ≈ 35 draw calls no total).
 * Origem local: y = 0 no piso acabado; a laje ocupa y ∈ [-0,3; 0].
 */
export interface FloorModule {
  structure: BufferGeometry;
  core: BufferGeometry;
  glass: BufferGeometry;
  facadeMetal: BufferGeometry;
  railing: BufferGeometry;
  handrail: BufferGeometry;
  interior: BufferGeometry;
  finish: BufferGeometry;
  /** Frisos de LED nas quinas (iluminação arquitetônica noturna). */
  led: BufferGeometry;
  /** Ripados e brises em madeira (veio vertical). */
  wood: BufferGeometry;
  /** Forros de madeira sob as varandas e a marquise (veio horizontal). */
  soffit: BufferGeometry;
  /** Molduras e jardineiras em grafite. */
  graphite: BufferGeometry;
  /** Revestimento em travertino. */
  stone: BufferGeometry;
  /** Vegetação nas jardineiras das varandas. */
  plants: BufferGeometry;
  /** Perfis de LED quente embutidos nos forros. */
  ledWarm: BufferGeometry;
}

const { halfX: HX, halfZ: HZ, slabThickness: ST, core: CORE } = BUILDING;

export function floorHeightFor(variant: FloorVariant) {
  return variant === 'lobby' ? BUILDING.lobbyHeight : BUILDING.typicalHeight;
}

function coreParts(h: number): BufferGeometry[] {
  const t = 0.25;
  const H = h - ST;
  const y = H / 2;
  const cx = CORE.halfX;
  const cz = CORE.halfZ;
  const parts: BufferGeometry[] = [
    // paredes longitudinais do núcleo
    box(cx * 2, H, t, 0, y, cz - t / 2),
    box(cx * 2, H, t, 0, y, -cz + t / 2),
    // divisórias entre poços de elevador e escadas
    box(t, H, cz * 2, 2, y, 0),
    box(t, H, cz * 2, -2, y, 0),
    box(2, H, 0.2, 3, y, 0),
    box(2, H, 0.2, -3, y, 0),
  ];
  // paredes laterais (x = ±4) com as portas dos elevadores
  for (const sx of [-1, 1]) {
    const x = sx * (cx - t / 2);
    parts.push(box(t, H, 0.5, x, y, 2.25));
    parts.push(box(t, H, 0.5, x, y, -2.25));
    parts.push(box(t, H, 0.4, x, y, 0));
    // vergas acima das portas
    parts.push(box(t, H - 2.3, 1.3, x, 2.3 + (H - 2.3) / 2, 1.25));
    parts.push(box(t, H - 2.3, 1.3, x, 2.3 + (H - 2.3) / 2, -1.25));
  }
  // escada em dois lances (tesoura) dentro do núcleo
  const run = 3.9;
  const ang = Math.atan2(h / 2, run);
  const len = Math.hypot(run, h / 2);
  parts.push(box(1.7, 0.18, len, -0.95, h / 4, 0, 0, -ang));
  parts.push(box(1.7, 0.18, len, 0.95, (3 * h) / 4, 0, 0, ang));
  parts.push(box(3.8, 0.18, 0.6, 0, h / 2, 2.0));
  return parts;
}

function slabParts(variant: FloorVariant, h: number) {
  const structure: BufferGeometry[] = [];
  // laje principal
  structure.push(box(HX * 2, ST, HZ * 2, 0, -ST / 2, 0));
  // faixas de borda (lajes aparentes brancas)
  const band = 0.52;
  structure.push(box(HX * 2 + 0.12, band, 0.12, 0, -band / 2 + 0.08, HZ + 0.02));
  structure.push(box(HX * 2 + 0.12, band, 0.12, 0, -band / 2 + 0.08, -HZ - 0.02));
  structure.push(box(0.12, band, HZ * 2 + 0.12, HX + 0.02, -band / 2 + 0.08, 0));
  structure.push(box(0.12, band, HZ * 2 + 0.12, -HX - 0.02, -band / 2 + 0.08, 0));

  // pilares periféricos (atrás da pele de vidro)
  const colH = h - ST;
  const colXs = [-14.2, -7.2, 7.2, 14.2];
  if (variant === 'lobby') {
    // colunata externa cilíndrica no térreo
    for (const x of [-14.4, -9.6, -4.8, 4.8, 9.6, 14.4]) {
      structure.push(cyl(0.38, 0.38, colH, x, colH / 2, HZ - 0.5, 20));
      structure.push(cyl(0.38, 0.38, colH, x, colH / 2, -HZ + 0.5, 20));
    }
    for (const z of [-5, 0, 5]) {
      structure.push(cyl(0.38, 0.38, colH, HX - 0.5, colH / 2, z, 20));
      structure.push(cyl(0.38, 0.38, colH, -HX + 0.5, colH / 2, z, 20));
    }
    // marquise em balanço sobre o acesso
    structure.push(box(18, 0.28, 8.5, 0, 4.75, HZ + 4.25));
    structure.push(box(18.2, 0.12, 8.6, 0, 4.6, HZ + 4.25));
    structure.push(cyl(0.16, 0.16, 4.6, -8, 2.3, HZ + 7.8, 12));
    structure.push(cyl(0.16, 0.16, 4.6, 8, 2.3, HZ + 7.8, 12));
  } else {
    for (const x of colXs) {
      structure.push(box(0.7, colH, 0.7, x, colH / 2, HZ - 0.75));
      structure.push(box(0.7, colH, 0.7, x, colH / 2, -HZ + 0.75));
    }
    for (const z of [-4.2, 4.2]) {
      structure.push(box(0.7, colH, 0.7, HX - 0.75, colH / 2, z));
      structure.push(box(0.7, colH, 0.7, -HX + 0.75, colH / 2, z));
    }
  }
  return structure;
}

function balconyParts(variant: FloorVariant, h: number) {
  const structure: BufferGeometry[] = [];
  const railing: BufferGeometry[] = [];
  const handrail: BufferGeometry[] = [];
  const soffit: BufferGeometry[] = [];
  const ledWarm: BufferGeometry[] = [];
  const graphite: BufferGeometry[] = [];
  const plants: BufferGeometry[] = [];
  const D = BUILDING.balconyDepth;
  const RH = 1.08;
  const wrap = variant === 'upper';
  for (const sz of [-1, 1]) {
    // lâmina vertical branca no eixo da fachada (separa as varandas)
    structure.push(box(0.9, h, D + 0.25, 0, h / 2 - ST, sz * (HZ + (D + 0.25) / 2)));
    for (const sx of [-1, 1]) {
      const x0 = 0.45;
      const x1 = wrap ? HX + D : HX - 0.3;
      const w = x1 - x0;
      const cx = sx * (x0 + w / 2);
      const cz = sz * (HZ + D / 2);
      structure.push(box(w, 0.24, D, cx, -0.12, cz));
      // forro de madeira e perfil de LED quente sob a varanda (visto de baixo, como no render)
      soffit.push(box(w - 0.1, 0.03, D - 0.12, cx, -0.255, cz - sz * 0.02));
      ledWarm.push(box(w - 0.4, 0.025, 0.05, cx, -0.275, sz * (HZ + D - 0.35)));
      // jardineira em grafite com vegetação junto ao guarda-corpo
      const px = sx * (x0 + 1.4);
      graphite.push(box(2.2, 0.55, 0.5, px, 0.275, sz * (HZ + D - 0.35)));
      for (let i = 0; i < 4; i++) {
        const g = new IcosahedronGeometry(0.34 + (i % 2) * 0.1, 1);
        g.scale(1, 0.85, 0.8);
        g.translate(px - 0.75 + i * 0.5, 0.75 + (i % 2) * 0.12, sz * (HZ + D - 0.35));
        plants.push(g);
      }
      railing.push(box(w, RH, 0.03, cx, RH / 2, sz * (HZ + D - 0.04)));
      handrail.push(box(w, 0.05, 0.07, cx, RH, sz * (HZ + D - 0.04)));
      if (wrap) {
        // varanda contornando a quina (na fachada lateral)
        const z0 = 3;
        const z1 = HZ;
        const len = z1 - z0;
        const sideX = sx * (HX + D / 2);
        const sideZ = sz * (z0 + len / 2);
        structure.push(box(D, 0.24, len, sideX, -0.12, sideZ));
        railing.push(box(0.03, RH, len + D, sx * (HX + D - 0.04), RH / 2, sz * (z0 + (len + D) / 2)));
        handrail.push(box(0.07, 0.05, len + D, sx * (HX + D - 0.04), RH, sz * (z0 + (len + D) / 2)));
        railing.push(box(D, RH, 0.03, sideX, RH / 2, sz * z0));
        handrail.push(box(D, 0.05, 0.07, sideX, RH, sz * z0));
        soffit.push(box(D - 0.12, 0.03, len, sideX, -0.255, sideZ));
        ledWarm.push(box(0.05, 0.025, len, sx * (HX + D - 0.35), -0.275, sideZ));
      } else {
        // moldura grafite fechando a varanda na extremidade (como o pórtico escuro da referência)
        graphite.push(box(0.4, h, D + 0.2, sx * (HX - 0.1), h / 2 - ST, sz * (HZ + D / 2 + 0.1)));
        railing.push(box(0.03, RH, D, sx * (HX - 0.3), RH / 2, cz));
        handrail.push(box(0.07, 0.05, D, sx * (HX - 0.3), RH, cz));
      }
    }
  }
  return { structure, railing, handrail, soffit, ledWarm, graphite, plants };
}

function facadeParts(variant: FloorVariant, h: number) {
  const glass: BufferGeometry[] = [];
  const metal: BufferGeometry[] = [];
  const wood: BufferGeometry[] = [];
  const graphite: BufferGeometry[] = [];
  const stone: BufferGeometry[] = [];
  const soffit: BufferGeometry[] = [];
  const ledWarm: BufferGeometry[] = [];
  const gh = h - ST - 0.1;
  const gy = 0.08 + gh / 2 - 0.04;
  const inset = variant === 'lobby' ? 1.2 : 0.06;
  const gx = HX - inset;
  const gz = HZ - inset;
  glass.push(box(gx * 2, gh, 0.04, 0, gy, gz));
  glass.push(box(gx * 2, gh, 0.04, 0, gy, -gz));
  if (variant === 'lobby') {
    // laterais do térreo revestidas em travertino; frente e fundos envidraçados
    stone.push(box(0.3, gh + 0.1, gz * 2, gx, gy, 0));
    stone.push(box(0.3, gh + 0.1, gz * 2, -gx, gy, 0));
    // forro de madeira e LED sob a marquise
    soffit.push(box(17.6, 0.04, 8.2, 0, 4.58, HZ + 4.25));
    for (const x of [-6, -2, 2, 6]) ledWarm.push(box(0.06, 0.03, 7.6, x, 4.555, HZ + 4.25));
    // pórtico grafite emoldurando o acesso
    graphite.push(box(10, 0.6, 0.5, 0, 5.3, HZ + 0.3));
    graphite.push(box(0.5, 5.6, 0.5, -5, 2.8, HZ + 0.3));
    graphite.push(box(0.5, 5.6, 0.5, 5, 2.8, HZ + 0.3));
  } else {
    glass.push(box(0.04, gh, gz * 2, gx, gy, 0));
    glass.push(box(0.04, gh, gz * 2, -gx, gy, 0));
  }

  // montantes da pele de vidro
  const step = variant === 'lobby' ? 2.4 : 1.5;
  for (let x = -gx + step; x < gx - 0.2; x += step) {
    metal.push(box(0.06, gh, 0.14, x, gy, gz + 0.04));
    metal.push(box(0.06, gh, 0.14, x, gy, -gz - 0.04));
  }
  for (let z = -gz + step; z < gz - 0.2 && variant !== 'lobby'; z += step) {
    metal.push(box(0.14, gh, 0.06, gx + 0.04, gy, z));
    metal.push(box(0.14, gh, 0.06, -gx - 0.04, gy, z));
  }
  if (variant === 'lobby') {
    // portas de acesso (pórtico metálico)
    metal.push(box(5.2, 0.18, 0.3, 0, 3.1, gz + 0.1));
    metal.push(box(0.12, 3.1, 0.3, -2.6, 1.55, gz + 0.1));
    metal.push(box(0.12, 3.1, 0.3, 2.6, 1.55, gz + 0.1));
  }
  // brises verticais
  if (variant === 'podium') {
    for (let x = -HX + 0.4; x <= HX - 0.3; x += 0.8) {
      wood.push(box(0.07, h, 0.42, x, h / 2 - ST, HZ + 0.26));
      wood.push(box(0.07, h, 0.42, x, h / 2 - ST, -HZ - 0.26));
    }
    for (let z = -HZ + 0.4; z <= HZ - 0.3; z += 0.8) {
      wood.push(box(0.42, h, 0.07, HX + 0.26, h / 2 - ST, z));
      wood.push(box(0.42, h, 0.07, -HX - 0.26, h / 2 - ST, z));
    }
  } else if (variant === 'typical' || variant === 'upper') {
    const limit = variant === 'upper' ? 2.6 : HZ - 0.4;
    for (let z = -limit; z <= limit + 0.01; z += 1.2) {
      wood.push(box(0.5, h, 0.08, HX + 0.3, h / 2 - ST, z));
      wood.push(box(0.5, h, 0.08, -HX - 0.3, h / 2 - ST, z));
    }
  } else if (variant === 'crown') {
    for (let x = -HX + 1.5; x < HX; x += 3) {
      graphite.push(box(0.12, h, 0.6, x, h / 2 - ST, HZ + 0.32));
      graphite.push(box(0.12, h, 0.6, x, h / 2 - ST, -HZ - 0.32));
    }
  }
  return { glass, metal, wood, graphite, stone, soffit, ledWarm };
}

/** Paredes internas das quatro unidades, portas e acabamento de piso. */
function interiorParts(variant: FloorVariant, h: number) {
  const interior: BufferGeometry[] = [];
  const finish: BufferGeometry[] = [];
  const wallH = h - ST - 0.02;
  const residential = variant === 'typical' || variant === 'upper';
  if (residential) {
    for (const unit of UNITS) {
      for (const w of WALLS) {
        const [x1, z1] = unitToFloor(unit, w.a[0], w.a[1]);
        const [x2, z2] = unitToFloor(unit, w.b[0], w.b[1]);
        const len = Math.hypot(x2 - x1, z2 - z1);
        const horizontal = Math.abs(z2 - z1) < 1e-6;
        interior.push(box(horizontal ? len + w.t : w.t, wallH, horizontal ? w.t : len + w.t, (x1 + x2) / 2, wallH / 2, (z1 + z2) / 2));
      }
      // vergas sobre as portas
      for (const d of DOORS) {
        const [x, z] = unitToFloor(unit, d.at[0], d.at[1]);
        const lintel = wallH - 2.2;
        if (d.axis === 'x') interior.push(box(d.width, lintel, 0.14, x, 2.2 + lintel / 2, z));
        else interior.push(box(0.14, lintel, d.width, x, 2.2 + lintel / 2, z));
        // folha da porta aberta a 90° (madeira), calculada na planta local e espelhada
        const leafLen = d.width - 0.06;
        const hinge: [number, number] = d.axis === 'x' ? [d.at[0] - d.width / 2, d.at[1]] : [d.at[0], d.at[1] - d.width / 2];
        const tip: [number, number] = d.axis === 'x' ? [hinge[0], hinge[1] + d.swing * leafLen] : [hinge[0] + d.swing * leafLen, hinge[1]];
        const [hx, hz] = unitToFloor(unit, hinge[0], hinge[1]);
        const [tx, tz] = unitToFloor(unit, tip[0], tip[1]);
        const alongZ = Math.abs(tz - hz) > Math.abs(tx - hx);
        finish.push(box(alongZ ? 0.04 : leafLen, 2.15, alongZ ? leafLen : 0.04, (hx + tx) / 2, 1.075, (hz + tz) / 2));
      }
      // piso (madeira) da unidade: corpo principal e faixa lateral
      const a = unitToFloor(unit, 7.5, 6.75);
      finish.push(box(15 - 0.1, 0.02, 8.5 - 0.1, a[0], 0.012, a[1]));
      const b = unitToFloor(unit, 10.5, 1.25);
      finish.push(box(9 - 0.1, 0.02, 2.5 - 0.1, b[0], 0.012, b[1]));
    }
    // hall social dos elevadores
    finish.push(box(2, 0.02, 5, 5, 0.014, 0));
    finish.push(box(2, 0.02, 5, -5, 0.014, 0));
    // paredes do hall (fecham o hall nas extremidades das unidades)
    for (const sx of [-1, 1]) interior.push(box(0.14, wallH, 5, sx * 6, wallH / 2, 0));
  } else {
    // pavimentos de uso comum: piso em pedra clara
    finish.push(box(HX * 2 - 0.6, 0.02, HZ * 2 - 0.6, 0, 0.012, 0));
    if (variant === 'lobby') {
      // recepção, estar e jardineiras do lobby
      finish.push(box(6, 1.1, 1.0, 0, 0.55, 6.2));
      finish.push(box(6.4, 0.06, 1.2, 0, 1.12, 6.2));
      for (const sx of [-1, 1]) {
        finish.push(box(3.2, 0.45, 1.0, sx * 9, 0.22, 5.5));
        finish.push(box(3.2, 0.45, 1.0, sx * 9, 0.22, 8.4));
        finish.push(box(1.4, 0.4, 1.4, sx * 9, 0.2, 6.95));
        finish.push(box(1.2, 0.8, 6, sx * 12.4, 0.4, -6));
      }
    }
  }
  return { interior, finish };
}

export function buildFloorModule(variant: FloorVariant): FloorModule {
  const h = floorHeightFor(variant);
  const structure = slabParts(variant, h);
  const railing: BufferGeometry[] = [];
  const handrail: BufferGeometry[] = [];
  const f = facadeParts(variant, h);
  const { glass, metal } = f;
  const soffit = [...f.soffit];
  const ledWarm = [...f.ledWarm];
  const graphite = [...f.graphite];
  const plants: BufferGeometry[] = [];
  if (variant === 'typical' || variant === 'upper') {
    const b = balconyParts(variant, h);
    structure.push(...b.structure);
    railing.push(...b.railing);
    handrail.push(...b.handrail);
    soffit.push(...b.soffit);
    ledWarm.push(...b.ledWarm);
    graphite.push(...b.graphite);
    plants.push(...b.plants);
  }
  const { interior, finish } = interiorParts(variant, h);
  const led: BufferGeometry[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) led.push(box(0.1, h, 0.1, sx * (HX + 0.09), h / 2 - ST, sz * (HZ + 0.09)));
  if (variant === 'lobby') {
    // arandelas sob a marquise
    for (const x of [-6, -2, 2, 6]) led.push(box(0.9, 0.05, 0.9, x, 4.58, HZ + 4));
  }
  return {
    led: merge(led),
    wood: merge(f.wood),
    soffit: merge(soffit),
    graphite: merge(graphite),
    stone: merge(f.stone),
    plants: merge(plants),
    ledWarm: merge(ledWarm),
    structure: merge(structure),
    core: merge(coreParts(h)),
    glass: merge(glass),
    facadeMetal: merge(metal),
    railing: merge(railing),
    handrail: merge(handrail),
    interior: merge(interior),
    finish: merge(finish),
  };
}

export function disposeModule(m: FloorModule) {
  Object.values(m).forEach((g) => g.dispose());
}
