/** Posições de câmera por ambiente, derivadas da planta. Mantém planta 2D e visualizador 3D sincronizados. */
import type { Model3D, VectorFloorPlan } from '@/types/property';
import { bounds, isIndoor } from './plan';

export function cameraPresetsFromPlan(plan: VectorFloorPlan): Model3D['rooms'] {
  const l0 = plan.levels[0];
  const cx = l0.width / 2, cz = l0.depth / 2;
  const indoorAll = plan.levels.flatMap((l) => l.rooms.filter(isIndoor).flatMap((r) => r.polygon));
  const house = bounds(indoorAll.length ? indoorAll : l0.rooms.flatMap((r) => r.polygon));
  const out: Model3D['rooms'] = {};
  for (const level of plan.levels) {
    for (const r of level.rooms) {
      const b = bounds(r.polygon);
      const x = b.cx - cx, z = b.cy - cz;
      const floor = level.elevation + 0.12;
      if (isIndoor(r)) {
        // de um canto do ambiente, na altura dos olhos, olhando para o centro
        const ox = Math.max(0.6, b.w / 2 - 0.5), oz = Math.max(0.6, b.h / 2 - 0.5);
        const sx = b.cx < house.cx ? 1 : -1;
        const sz = b.cy < house.cy ? 1 : -1;
        out[r.id] = {
          label: r.name,
          interior: true,
          level: level.id,
          position: round([x + sx * ox, floor + 1.6, z + sz * oz]),
          target: round([x, floor + 1.0, z]),
        };
      } else {
        // ambientes externos: vista elevada, de fora da casa
        let dx = b.cx - house.cx, dz = b.cy - house.cy;
        const len = Math.hypot(dx, dz) || 1;
        dx /= len; dz /= len;
        const dist = Math.max(b.w, b.h) * 0.9 + 4;
        out[r.id] = {
          label: r.name,
          interior: false,
          level: level.id,
          position: round([x + dx * dist, floor + 3.6, z + dz * dist]),
          target: round([x, floor + 0.4, z]),
        };
      }
    }
  }
  return out;
}

const round = (v: [number, number, number]) => v.map((n) => Math.round(n * 100) / 100) as [number, number, number];
