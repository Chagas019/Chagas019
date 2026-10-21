import { useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Color, Euler, InstancedMesh, Matrix4, Quaternion, Vector3, type BufferGeometry, type Material } from 'three';

export interface BoxItem {
  p: [number, number, number];
  s: [number, number, number];
  r?: number;
  color?: number | string;
}

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();
const _c = new Color();

/** Muitos objetos iguais num único draw call (pilares, vagas, luminárias, árvores...). */
export function InstancedBoxes({
  items, material, geometry, castShadow, receiveShadow, name,
}: { items: BoxItem[]; material: Material; geometry?: BufferGeometry; castShadow?: boolean; receiveShadow?: boolean; name?: string }) {
  const ref = useRef<InstancedMesh>(null);
  const geo = useMemo(() => geometry ?? new BoxGeometry(1, 1, 1), [geometry]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => {
      _q.setFromEuler(_e.set(0, it.r ?? 0, 0));
      _m.compose(_p.set(...it.p), _q, _s.set(...it.s));
      mesh.setMatrixAt(i, _m);
      if (it.color !== undefined) mesh.setColorAt(i, _c.set(it.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  useLayoutEffect(() => () => { if (!geometry) geo.dispose(); }, [geo, geometry]);
  if (items.length === 0) return null;
  return <instancedMesh key={items.length} ref={ref} name={name} args={[geo, material, items.length]} castShadow={castShadow} receiveShadow={receiveShadow} raycast={() => null} />;
}
