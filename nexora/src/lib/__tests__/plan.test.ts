import { autoFurniture, coveredArea, labelPoint, pointInPolygon, polygonArea, rect, resolveWalls } from '../plan';
import { cameraPresetsFromPlan } from '../plan3d';
import { demoProperties } from '@/data/properties';
import { planCasaHorizonte } from '@/data/plans';

describe('geometria da planta', () => {
  it('área de polígonos, inclusive em L', () => {
    expect(polygonArea(rect(0, 0, 4, 3))).toBe(12);
    expect(polygonArea([[16, 2], [22, 2], [22, 12], [10, 12], [10, 7], [16, 7]])).toBe(90);
  });
  it('rótulo de ambiente em L fica dentro do ambiente', () => {
    const sala = planCasaHorizonte.levels[0].rooms.find((r) => r.id === 'sala')!;
    expect(pointInPolygon(labelPoint(sala), sala.polygon)).toBe(true);
  });
  it('paredes: externas com vidro na sala, portas entre quartos e circulação, abertura entre sala e cozinha', () => {
    const walls = resolveWalls(planCasaHorizonte.levels[0]);
    const between = (a: string, b: string) => walls.filter((w) => w.rooms.includes(a) && w.rooms.includes(b));
    expect(between('sala', 'cozinha').flatMap((w) => w.segments).some((s) => s.kind === 'open')).toBe(true);
    expect(walls.filter((w) => w.exterior && w.rooms[0] === 'sala').flatMap((w) => w.segments).some((s) => s.kind === 'glass')).toBe(true);
    expect(walls.filter((w) => w.exterior && w.rooms[0] === 'garagem').flatMap((w) => w.segments).some((s) => s.kind === 'open')).toBe(true);
    // segmentos cobrem a parede inteira, sem buracos nem sobreposição
    for (const w of walls) {
      const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
      let at = 0;
      for (const s of w.segments) { expect(s.from).toBeCloseTo(at, 5); at = s.to; }
      expect(at).toBeCloseTo(len, 5);
    }
  });
  it('mobiliário fica dentro do respectivo ambiente', () => {
    const lvl = planCasaHorizonte.levels[0];
    for (const f of autoFurniture(lvl).filter((f) => f.kind !== 'espreguicadeira' && f.kind !== 'escada')) {
      const room = lvl.rooms.find((r) => r.id === f.roomId)!;
      expect(pointInPolygon(f.at, room.polygon)).toBe(true);
    }
  });
  it('área construída declarada confere com a planta (±5%)', () => {
    for (const p of demoProperties) {
      if (p.floorPlan?.kind !== 'vetorial' || !p.builtArea) continue;
      const a = coveredArea(p.floorPlan.levels);
      expect(Math.abs(a - p.builtArea) / p.builtArea).toBeLessThan(0.05);
    }
  });
  it('câmeras do 3D existem para todos os ambientes e usam os mesmos ids da planta', () => {
    const presets = cameraPresetsFromPlan(planCasaHorizonte);
    const ids = planCasaHorizonte.levels.flatMap((l) => l.rooms.map((r) => r.id));
    expect(Object.keys(presets).sort()).toEqual([...ids].sort());
    for (const id of ['sala', 'cozinha', 'suite', 'quarto-1', 'banheiro', 'gourmet', 'piscina', 'jardim', 'garagem']) expect(presets[id]).toBeDefined();
    expect(presets.suite.position[1]).toBeGreaterThan(3);
  });
});
