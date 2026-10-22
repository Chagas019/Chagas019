import { describe, expect, it } from 'vitest';
import { FLOORS, FLOOR_COUNT, ROOF_Y, SECTORS, floorBaseY, floorHeight, floorVariant, getFloorInfo, isResidential } from './building';
import { DOORS, FURNITURE, ROOMS, UNITS, WALLS, privateArea, unitAt, unitToFloor } from './apartment';
import { GARAGE_CONFIG, garageBands, garageColumns, garageLevels, garageRamps, garageSpots, garageStats } from './garage';
import { TOUR, TOUR_TOTAL } from './tour';

describe('edifício', () => {
  it('tem exatamente 40 pavimentos numerados de 1 a 40', () => {
    expect(FLOOR_COUNT).toBe(40);
    expect(FLOORS).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
  });

  it('setores cobrem 1–40 sem lacunas nem sobreposição', () => {
    const covered = new Map<number, number>();
    SECTORS.forEach((s) => {
      for (let n = s.range[0]; n <= s.range[1]; n++) covered.set(n, (covered.get(n) ?? 0) + 1);
    });
    FLOORS.forEach((n) => expect(covered.get(n)).toBe(1));
    expect(SECTORS.map((s) => s.range)).toEqual([[1, 5], [6, 30], [31, 39], [40, 40]]);
  });

  it('cotas crescem sem sobreposição (pavimentos alinhados)', () => {
    for (let n = 1; n < FLOOR_COUNT; n++) {
      expect(floorBaseY(n + 1)).toBeCloseTo(floorBaseY(n) + floorHeight(n), 6);
    }
    expect(ROOF_Y).toBeCloseTo(floorBaseY(40) + floorHeight(40), 6);
    expect(ROOF_Y).toBeGreaterThan(120);
  });

  it('cada pavimento tem tipo, setor e informações', () => {
    expect(floorVariant(1)).toBe('lobby');
    expect(floorVariant(2)).toBe('podium');
    expect(floorVariant(20)).toBe('typical');
    expect(floorVariant(35)).toBe('upper');
    expect(floorVariant(40)).toBe('crown');
    FLOORS.forEach((n) => {
      const info = getFloorInfo(n);
      expect(info.title.length).toBeGreaterThan(3);
      expect(info.uses.length).toBeGreaterThan(0);
      expect(info.units).toBe(isResidential(n) ? 4 : 0);
    });
  });
});

describe('apartamento', () => {
  const inside = (x: number, z: number) => x >= -0.01 && x <= 15.01 && z >= -0.01 && z <= 13.01 && !(x < 6 - 0.01 && z < 2.5 - 0.01);

  it('ambientes ficam dentro da unidade (incluindo varanda)', () => {
    ROOMS.forEach((r) => {
      expect(inside(r.x[0], r.z[0])).toBe(true);
      expect(inside(r.x[1], r.z[1])).toBe(true);
      if (r.eye) {
        expect(inside(...r.eye.at)).toBe(true);
      }
    });
  });

  it('paredes são ortogonais e portas ficam em vãos de parede', () => {
    WALLS.forEach((w) => expect(w.a[0] === w.b[0] || w.a[1] === w.b[1]).toBe(true));
    DOORS.forEach((d) => {
      // nenhuma parede ocupa o centro do vão da porta
      const blocked = WALLS.some((w) => {
        const minX = Math.min(w.a[0], w.b[0]);
        const maxX = Math.max(w.a[0], w.b[0]);
        const minZ = Math.min(w.a[1], w.b[1]);
        const maxZ = Math.max(w.a[1], w.b[1]);
        return d.at[0] > minX + 0.01 && d.at[0] < maxX - 0.01 && Math.abs(d.at[1] - minZ) < 0.01 && minZ === maxZ
          || d.at[1] > minZ + 0.01 && d.at[1] < maxZ - 0.01 && Math.abs(d.at[0] - minX) < 0.01 && minX === maxX;
      });
      expect(blocked).toBe(false);
    });
  });

  it('mobiliário fica dentro da unidade', () => {
    FURNITURE.forEach((f) => {
      expect(inside(f.x, f.z)).toBe(true);
      expect(ROOMS.some((r) => r.id === f.room)).toBe(true);
    });
  });

  it('espelhamento e identificação de unidades são consistentes', () => {
    UNITS.forEach((u) => {
      const [x, z] = unitToFloor(u, 7, 6);
      expect(unitAt(x, z)).toBe(u.id);
    });
    expect(privateArea()).toBeGreaterThan(100);
  });
});

describe('garagem paramétrica', () => {
  it('dois níveis (G1, G2) abaixo do solo', () => {
    const lv = garageLevels();
    expect(lv.map((l) => l.id)).toEqual(['G1', 'G2']);
    lv.forEach((l) => expect(l.y).toBeLessThan(0));
  });

  it('faixas cobrem a profundidade sem sobrepor o núcleo', () => {
    const bands = garageBands();
    const spots = bands.filter((b) => b.kind === 'spots');
    expect(spots.length).toBe(4);
    bands.forEach((b) => expect(Math.abs(b.z0) >= GARAGE_CONFIG.spineHalf - 1e-6 || Math.abs(b.z1) >= GARAGE_CONFIG.spineHalf - 1e-6).toBe(true));
    const total = bands.reduce((s, b) => s + (b.z1 - b.z0), 0) + GARAGE_CONFIG.spineHalf * 2;
    expect(total).toBeCloseTo(GARAGE_CONFIG.halfZ * 2, 6);
  });

  it('vagas não se sobrepõem e o sorteio é determinístico', () => {
    const a = garageSpots(0);
    const b = garageSpots(0);
    expect(a).toEqual(b);
    const keys = new Set(a.map((s) => `${s.x.toFixed(2)}:${s.z.toFixed(2)}`));
    expect(keys.size).toBe(a.length);
    a.forEach((s) => expect(Math.abs(s.z)).toBeGreaterThan(GARAGE_CONFIG.spineHalf));
    expect(garageStats().total).toBe(a.length * GARAGE_CONFIG.levels);
  });

  it('rampas com inclinação plausível e pilares fora das circulações', () => {
    const r = garageRamps();
    expect(r.inner.slope).toBeLessThanOrEqual(0.25);
    expect(r.access.slope).toBeLessThanOrEqual(0.25);
    const aisles = garageBands().filter((b) => b.kind === 'aisle');
    garageColumns().forEach(([, z]) => aisles.forEach((a) => expect(z > a.z0 + 0.01 && z < a.z1 - 0.01).toBe(false)));
  });

  it('mudar os parâmetros recalcula níveis e vagas', () => {
    const cfg = { ...GARAGE_CONFIG, levels: 3, halfX: 40 };
    expect(garageLevels(cfg).length).toBe(3);
    expect(garageSpots(0, cfg).length).toBeGreaterThan(garageSpots(0).length);
  });
});

describe('apresentação guiada', () => {
  it('percorre as nove etapas na ordem pedida', () => {
    expect(TOUR.map((t) => t.id)).toEqual(['panorama', 'fachada', 'giro', 'pavimentos', 'explodida', 'apartamento', 'cobertura', 'garagem', 'retorno']);
    TOUR.forEach((t) => {
      expect(t.caption.length).toBeGreaterThan(10);
      t.actions.forEach((a) => expect(a.at).toBeLessThan(t.duration));
    });
    expect(TOUR_TOTAL).toBeGreaterThan(60);
  });
});
