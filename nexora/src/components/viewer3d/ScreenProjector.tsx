import { useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type AnchorMap = MutableRefObject<Map<string, HTMLElement | null>>;

/**
 * Projeta pontos 3D na tela e posiciona elementos DOM comuns (fora do Canvas) a cada quadro.
 * Substitui o <Html> do drei: os marcadores continuam sendo botões normais da página, focáveis pelo teclado.
 */
export function ScreenProjector({ points, anchors }: { points: Record<string, [number, number, number]>; anchors: AnchorMap }) {
  const { camera, size } = useThree();
  const v = useRef(new THREE.Vector3());
  const camDir = useRef(new THREE.Vector3());
  useFrame(() => {
    camera.getWorldDirection(camDir.current);
    for (const [id, p] of Object.entries(points)) {
      const el = anchors.current.get(id);
      if (!el) continue;
      v.current.set(p[0], p[1], p[2]);
      const toPoint = v.current.clone().sub(camera.position);
      const behind = toPoint.dot(camDir.current) <= 0.05;
      v.current.project(camera);
      const x = (v.current.x * 0.5 + 0.5) * size.width;
      const y = (-v.current.y * 0.5 + 0.5) * size.height;
      const off = behind || x < -40 || y < -20 || x > size.width + 40 || y > size.height + 20;
      el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.visibility = off ? 'hidden' : 'visible';
      el.style.zIndex = String(Math.round(1000 - toPoint.length() * 10));
    }
  });
  return null;
}
