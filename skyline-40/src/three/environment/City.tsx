import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, CanvasTexture, Color, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, RepeatWrapping, SRGBColorSpace, Vector3 } from 'three';
import { useSkyline } from '../../state/store';
import { QUALITY } from '../../config/performance';
import { rng } from '../utils/geo';
import { floorRuntime as rt } from '../building/floorRuntime';

function facadeTextures() {
  const W = 128;
  const H = 256;
  const make = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return c;
  };
  const day = make();
  const night = make();
  const d = day.getContext('2d')!;
  const n = night.getContext('2d')!;
  d.fillStyle = '#c9ccce';
  d.fillRect(0, 0, W, H);
  n.fillStyle = '#000';
  n.fillRect(0, 0, W, H);
  const cols = 8;
  const rows = 24;
  const cw = W / cols;
  const rh = H / rows;
  const rand = rng(9);
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cw + 2;
      const y = r * rh + 2;
      d.fillStyle = `rgb(${88 + rand() * 30}, ${104 + rand() * 30}, ${122 + rand() * 30})`;
      d.fillRect(x, y, cw - 4, rh - 4);
      if (rand() < 0.42) {
        const warm = rand() < 0.7;
        n.fillStyle = warm ? `rgba(255, ${190 + rand() * 40}, ${120 + rand() * 50}, 1)` : 'rgba(210, 228, 255, 1)';
        n.fillRect(x, y, cw - 4, rh - 4);
      }
    }
  }
  // canto escuro usado pelas faces de topo
  d.fillStyle = '#7d8186';
  d.fillRect(0, 0, 3, 3);
  n.fillStyle = '#000';
  n.fillRect(0, 0, 3, 3);
  const mk = (cv: HTMLCanvasElement) => {
    const t = new CanvasTexture(cv);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.colorSpace = SRGBColorSpace;
    return t;
  };
  return { map: mk(day), emissive: mk(night) };
}

/** Entorno urbano: quadras instanciadas, mais baixas que o SKYLINE 40, com janelas acesas à noite. */
export function City() {
  const quality = useSkyline((s) => s.quality);
  const count = QUALITY[quality].cityBlocks;
  const ref = useRef<InstancedMesh>(null);
  const { geometry, material } = useMemo(() => {
    const g = new BoxGeometry(1, 1, 1);
    g.translate(0, 0.5, 0);
    // faces de topo e base (índices 8–15) apontam para o canto liso da textura
    const uv = g.attributes.uv;
    for (let i = 8; i < 16; i++) uv.setXY(i, 0.005, 0.995);
    uv.needsUpdate = true;
    const tex = facadeTextures();
    const m = new MeshStandardMaterial({
      map: tex.map, emissiveMap: tex.emissive, emissive: new Color('#ffffff'), emissiveIntensity: 0, roughness: 0.75, metalness: 0.15,
    });
    return { geometry: g, material: m };
  }, []);
  useEffect(() => () => { geometry.dispose(); material.map?.dispose(); material.emissiveMap?.dispose(); material.dispose(); }, [geometry, material]);

  const blocks = useMemo(() => {
    const rand = rng(1234);
    const out: { x: number; z: number; w: number; d: number; h: number; c: Color }[] = [];
    const tints = ['#e8e4dc', '#d4d8dc', '#c6c2b8', '#b9c0c8', '#efece6', '#a7adb4'];
    for (let gx = -720; gx <= 720; gx += 36) {
      for (let gz = -980; gz <= 120; gz += 36) {
        if (Math.abs(gx) < 92 && Math.abs(gz) < 84) continue; // terreno do empreendimento
        if (gz > 40 && gz < 140) continue; // avenida e orla
        if (rand() < 0.32) continue;
        const dist = Math.hypot(gx, gz);
        const w = 14 + rand() * 14;
        const d = 14 + rand() * 14;
        const tall = rand() < 0.12;
        const h = Math.min(122, (tall ? 55 + rand() * 60 : 12 + rand() * 38) * (dist < 200 ? 0.8 : 1));
        out.push({ x: gx + (rand() - 0.5) * 8, z: gz + (rand() - 0.5) * 8, w, d, h, c: new Color(tints[Math.floor(rand() * tints.length)]) });
      }
    }
    // os mais próximos primeiro, para que a qualidade baixa mantenha o entorno imediato
    out.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
    return out.slice(0, count);
  }, [count]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    const q = new Quaternion();
    blocks.forEach((b, i) => {
      m.compose(new Vector3(b.x, 0, b.z), q, new Vector3(b.w, b.h, b.d));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, b.c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blocks]);

  useFrame(() => {
    material.emissiveIntensity = rt.night * 0.7;
  });

  return <instancedMesh key={blocks.length} ref={ref} args={[geometry, material, blocks.length]} castShadow={false} receiveShadow raycast={() => null} name="city" />;
}
