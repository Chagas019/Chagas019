import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group, PointLight } from 'three';
import { FURNITURE, ROOMS, getUnit, roomArea, type UnitId } from '../../data/apartment';
import { useSkyline } from '../../state/store';
import { floorRuntime as rt } from '../building/floorRuntime';
import { MAT } from '../materials';
import { FurniturePiece } from './FurniturePiece';

/**
 * Apartamento decorado demonstrativo: mobiliário, iluminação e marcadores de ambientes da
 * unidade selecionada. A planta local é espelhada para as unidades A, C e D.
 */
export function ApartmentInterior({ floor, unitId }: { floor: number; unitId: UnitId }) {
  const unit = getUnit(unitId);
  const group = useRef<Group>(null);
  const lights = useRef<(PointLight | null)[]>([]);
  const view = useSkyline((s) => s.apartmentView);
  const room = useSkyline((s) => s.apartmentRoom);

  useFrame(() => {
    if (group.current) group.current.position.y = rt.y[floor];
    const night = rt.night;
    lights.current.forEach((l) => l && (l.intensity = 6 + night * 22));
  });

  return (
    <group ref={group} scale={[unit.sx, 1, unit.sz]} name="apartment-demo">
      {FURNITURE.map((f, i) => (
        <group key={i} position={[f.x, 0.025, f.z]} rotation={[0, ((f.rot ?? 0) * Math.PI) / 180, 0]}>
          <FurniturePiece item={f} />
        </group>
      ))}
      {/* forro com luminárias embutidas */}
      {view === 'interior' && [[3, 8.6], [7, 8.6], [2, 4.2], [12.3, 8.5], [12.3, 2], [5.5, 4.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 3.06, z]} rotation={[Math.PI / 2, 0, 0]} material={MAT.lightWarm}>
          <circleGeometry args={[0.12, 16]} />
        </mesh>
      ))}
      <pointLight ref={(l) => (lights.current[0] = l)} position={[4, 2.6, 8.5]} color="#ffdcb0" distance={11} decay={1.6} />
      <pointLight ref={(l) => (lights.current[1] = l)} position={[12.3, 2.6, 8]} color="#ffdcb0" distance={8} decay={1.6} />
      {view !== 'interior' &&
        ROOMS.filter((r) => r.id !== 'lavabo' && r.id !== 'circulacao').map((r) => {
          const cx = (r.x[0] + r.x[1]) / 2;
          const cz = (r.z[0] + r.z[1]) / 2;
          const clickable = Boolean(r.eye);
          return (
            <group key={r.id} position={[cx, 2.2, cz]}>
              <Html center zIndexRange={[15, 0]} style={{ pointerEvents: clickable ? 'auto' : 'none' }}>
                <button
                  type="button"
                  className={`room-tag${clickable ? ' is-link' : ''}${room === r.id ? ' is-active' : ''}`}
                  tabIndex={clickable ? 0 : -1}
                  onClick={() => clickable && useSkyline.getState().setApartmentView('interior', r.id)}
                >
                  <strong>{r.name}</strong>
                  <span>{roomArea(r).toFixed(1).replace('.', ',')} m² · exemplo</span>
                </button>
              </Html>
            </group>
          );
        })}
    </group>
  );
}
