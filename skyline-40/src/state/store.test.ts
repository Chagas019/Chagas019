import { beforeEach, describe, expect, it } from 'vitest';
import { useSkyline } from './store';
import { FLOOR_COUNT } from '../data/building';
import {
  apartmentShot, buildingTop, floorShot, garageShot, orbitLimits, presetShot, rooftopShot, unitShot, type CameraShot, type ViewId,
} from '../three/camera/views';

const S = () => useSkyline.getState();
const dist = (s: CameraShot) => Math.hypot(s.position[0] - s.target[0], s.position[1] - s.target[1], s.position[2] - s.target[2]);

describe('câmeras', () => {
  it('todas as vistas pré-definidas são válidas e respeitam os limites de órbita', () => {
    const views: ViewId[] = ['overview', 'top', 'bottom', 'front', 'side', 'back', 'exploded'];
    views.forEach((v) => {
      const shot = presetShot(v, v === 'exploded' ? 1 : 0, 6);
      [...shot.position, ...shot.target].forEach((n) => expect(Number.isFinite(n)).toBe(true));
      const lim = orbitLimits('overview', { exploded: v === 'exploded', gap: 6 });
      expect(dist(shot)).toBeGreaterThanOrEqual(lim.minDistance);
      expect(dist(shot)).toBeLessThanOrEqual(lim.maxDistance);
    });
    expect(presetShot('top').position[1]).toBeGreaterThan(buildingTop(0, 6));
    expect(presetShot('bottom').position[1]).toBeLessThan(3);
  });

  it('enquadramentos de modos ficam dentro dos limites do respectivo modo', () => {
    const check = (shot: CameraShot, mode: string, extra: Parameters<typeof orbitLimits>[1]) => {
      const lim = orbitLimits(mode, extra);
      expect(dist(shot)).toBeGreaterThanOrEqual(lim.minDistance - 1e-6);
      expect(dist(shot)).toBeLessThanOrEqual(lim.maxDistance + 1e-6);
    };
    check(floorShot(10, 0, 6), 'floor', { exploded: false, gap: 6 });
    check(unitShot(10, 'C', 0, 6), 'floor', { exploded: false, gap: 6 });
    (['perspective', 'plan', 'interior'] as const).forEach((v) => check(apartmentShot(24, 'B', v), 'apartment', { exploded: false, gap: 6, apartmentView: v }));
    (['overview', 'pool', 'deck', 'lounge', 'gourmet', 'garden', 'mirante'] as const).forEach((sp) => check(rooftopShot(sp), 'rooftop', { exploded: false, gap: 6 }));
    (['perspective', 'top', 'street'] as const).forEach((v) => check(garageShot(0, v), 'garage', { exploded: false, gap: 6, garageView: v }));
  });

  it('a aproximação acompanha a cota do pavimento, inclusive na vista explodida', () => {
    expect(floorShot(30, 0, 6).target[1]).toBeGreaterThan(floorShot(10, 0, 6).target[1]);
    expect(floorShot(30, 1, 6).target[1]).toBeGreaterThan(floorShot(30, 0, 6).target[1]);
  });
});

describe('estado e controles', () => {
  beforeEach(() => {
    S().resetCamera();
    S().setTimeOfDay('day');
  });

  it('cada botão de vista gera um movimento de câmera', () => {
    const before = S().camera.id;
    (['overview', 'top', 'bottom', 'front', 'side'] as ViewId[]).forEach((v, i) => {
      S().setView(v);
      expect(S().activeView).toBe(v);
      expect(S().camera.id).toBe(before + i + 1);
    });
  });

  it('vista explodida liga, ajusta a distância e desliga', () => {
    S().setView('exploded');
    expect(S().exploded).toBe(true);
    S().setExplodeGap(10);
    expect(S().explodeGap).toBe(10);
    S().setExplodeGap(100);
    expect(S().explodeGap).toBe(14);
    S().toggleExploded(false);
    expect(S().exploded).toBe(false);
  });

  it('seleção de pavimentos fica entre 1 e 40', () => {
    for (let n = 1; n <= FLOOR_COUNT; n++) {
      S().selectFloor(n);
      expect(S().selectedFloor).toBe(n);
      expect(S().mode).toBe('floor');
    }
    S().stepFloor(5);
    expect(S().selectedFloor).toBe(40);
    S().selectFloor(1);
    S().stepFloor(-3);
    expect(S().selectedFloor).toBe(1);
    S().selectFloor(null);
    expect(S().mode).toBe('overview');
  });

  it('unidades, apartamento, cobertura e garagem', () => {
    S().selectUnit(12, 'D');
    expect(S().selectedUnit).toBe('D');
    S().openApartment();
    expect(S().mode).toBe('apartment');
    expect(S().selectedFloor).toBe(12);
    S().setApartmentView('interior', 'master');
    expect(S().apartmentView).toBe('interior');
    expect(S().apartmentRoom).toBe('master');
    S().openRooftop('pool');
    expect(S().mode).toBe('rooftop');
    expect(S().rooftopSpot).toBe('pool');
    S().playRooftopFilm();
    expect(S().camera.path?.length).toBeGreaterThan(3);
    S().openGarage(1, 'street');
    expect(S().mode).toBe('garage');
    expect(S().garageLevel).toBe(1);
    expect(S().garageView).toBe('street');
  });

  it('horário, camadas e reinício', () => {
    S().cycleTimeOfDay();
    expect(S().timeOfDay).toBe('sunset');
    S().cycleTimeOfDay();
    expect(S().timeOfDay).toBe('night');
    S().setLayer('facade');
    expect(S().layers.facade).toBe(false);
    S().setLayer('technical', true);
    expect(S().layers.technical).toBe(true);
    S().resetCamera();
    expect(S().layers.facade).toBe(true);
    expect(S().layers.technical).toBe(false);
    expect(S().mode).toBe('overview');
  });

  it('redução de movimento torna as transições instantâneas', () => {
    S().setReducedMotion(true);
    S().setView('side');
    expect(S().camera.duration).toBeLessThan(0.05);
    S().setReducedMotion(false);
    S().setView('front');
    expect(S().camera.duration).toBeGreaterThan(1);
  });
});
