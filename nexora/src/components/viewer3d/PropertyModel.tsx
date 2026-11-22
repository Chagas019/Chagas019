import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export interface ModelInfo { levels: string[] }

/**
 * Carrega o .glb (glTF binário; aceita compressão meshopt) e aplica:
 * - corte por pavimento (esconde pavimentos acima e coberturas, como numa maquete);
 * - modo noturno (acende materiais nx_lamp e a luz da piscina).
 */
export function PropertyModel({ url, cutLevel, night, onInfo }: { url: string; cutLevel: string | null; night: boolean; onInfo?: (i: ModelInfo) => void }) {
  const { scene } = useGLTF(url);
  const levels = useMemo(() => scene.children.filter((c) => c.name.startsWith('level_')).map((c) => c.name.replace('level_', '')), [scene]);

  useEffect(() => { onInfo?.({ levels }); }, [levels, onInfo]);

  useEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = !/glass|water|lamp/.test(m.name);
        m.receiveShadow = true;
      }
    });
  }, [scene]);

  useEffect(() => {
    const cutIndex = cutLevel ? levels.indexOf(cutLevel) : -1;
    for (const c of scene.children) {
      if (c.name.startsWith('level_')) c.visible = cutIndex < 0 || levels.indexOf(c.name.slice(6)) <= cutIndex;
      if (c.name.startsWith('roof_')) c.visible = cutIndex < 0 || levels.indexOf(c.name.slice(5)) < cutIndex;
    }
  }, [scene, cutLevel, levels]);

  useEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat.name === 'nx_lamp') mat.emissiveIntensity = night ? 7 : 0.15;
      if (mat.name === 'nx_pool_tile') { mat.emissive = new THREE.Color(night ? '#2fb7dc' : '#000000'); mat.emissiveIntensity = night ? 2 : 0; }
    });
  }, [scene, night]);

  return <primitive object={scene} />;
}
