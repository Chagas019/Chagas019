import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Model3D } from '@/types/property';

/** Órbita com amortecimento; anima a câmera até a posição predefinida do ambiente escolhido */
export function CameraControls({ model, preset, autoRotate }: { model: Model3D; preset?: Model3D['rooms'][string]; autoRotate: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const v = preset ?? model.initialView;
    goal.current = { pos: new THREE.Vector3(...v.position), target: new THREE.Vector3(...v.target) };
  }, [preset, model.initialView]);

  useFrame((_, dt) => {
    const c = controls.current;
    const g = goal.current;
    if (!c || !g) return;
    const k = 1 - Math.pow(0.0025, dt);
    camera.position.lerp(g.pos, k);
    c.target.lerp(g.target, k);
    if (camera.position.distanceTo(g.pos) < 0.02 && c.target.distanceTo(g.target) < 0.02) goal.current = null;
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={preset?.interior ? 0.3 : 2}
      maxDistance={90}
      maxPolarAngle={Math.PI * 0.495}
      autoRotate={autoRotate}
      autoRotateSpeed={0.6}
      onStart={() => { goal.current = null; }}
    />
  );
}

