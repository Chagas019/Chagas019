import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Matrix4, Quaternion, Vector3, type BufferGeometry, type Material } from 'three';
import { floorRuntime as rt, visibility, type Category } from './floorRuntime';
import { isResidential } from '../../data/building';
import { unitAt } from '../../data/apartment';
import { useSkyline } from '../../state/store';

const _m = new Matrix4();
const _p = new Vector3();
const _s = new Vector3();
const _q = new Quaternion();
const WHITE = new Color('#ffffff');
const SELECTED = new Color('#bcd2ff');
const HOVER = new Color('#dde8fb');

interface Props {
  floors: number[];
  geometry: BufferGeometry;
  material: Material;
  category: Category;
  pickable?: boolean;
  tint?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  name?: string;
}

/** Um módulo de pavimento instanciado em vários andares; segue o estado animado de cada andar. */
export function FloorInstances({ floors, geometry, material, category, pickable, tint, castShadow, receiveShadow, name }: Props) {
  const ref = useRef<InstancedMesh>(null);
  const last = useRef(-1);
  const color = useMemo(() => new Color(), []);
  const empty = !geometry.attributes.position || geometry.attributes.position.count === 0;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    if (tint) for (let i = 0; i < floors.length; i++) mesh.setColorAt(i, WHITE);
    last.current = -1;
  }, [floors, tint, geometry, material]);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh || last.current === rt.version) return;
    last.current = rt.version;
    for (let i = 0; i < floors.length; i++) {
      const n = floors[i];
      const v = visibility(category, n);
      _p.set(0, rt.y[n], 0);
      if (v < 0.002) _s.set(0, 0, 0);
      else _s.set(1, v, 1);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      if (tint) {
        if (n === rt.selected) color.copy(SELECTED);
        else if (n === rt.hovered) color.copy(HOVER);
        else color.copy(WHITE);
        mesh.setColorAt(i, color);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.boundingSphere = null;
    mesh.boundingBox = null;
  });

  const handlers = pickable
    ? {
        onPointerMove: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          if (e.instanceId === undefined) return;
          useSkyline.getState().hoverFloor(floors[e.instanceId]);
          document.body.style.cursor = 'pointer';
        },
        onPointerOut: () => {
          useSkyline.getState().hoverFloor(null);
          document.body.style.cursor = '';
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.instanceId === undefined || e.delta > 6) return;
          const n = floors[e.instanceId];
          const s = useSkyline.getState();
          if (s.tour.active) return;
          if (s.mode === 'apartment' || s.mode === 'garage') return;
          if (s.mode === 'floor' && s.selectedFloor === n && isResidential(n)) {
            const local = e.point.clone();
            s.selectUnit(n, unitAt(local.x, local.z));
          } else {
            s.selectFloor(n);
          }
        },
      }
    : {};

  if (empty) return null;
  return (
    <instancedMesh
      ref={ref}
      name={name}
      args={[geometry, material, floors.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={false}
      {...handlers}
    />
  );
}
