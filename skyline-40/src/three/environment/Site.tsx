import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  Color, CylinderGeometry, IcosahedronGeometry, MeshBasicMaterial, MeshStandardMaterial, Path, Shape, ShapeGeometry,
  type Group,
} from 'three';
import { useSkyline } from '../../state/store';
import { QUALITY } from '../../config/performance';
import { garageRamps, GARAGE_CONFIG } from '../../data/garage';
import { MAT } from '../materials';
import { getPavingTexture, getWaterNormal } from '../textures';
import { rng } from '../utils/geo';
import { floorRuntime as rt } from '../building/floorRuntime';
import { InstancedBoxes, type BoxItem } from './InstancedBoxes';

const ramp = garageRamps().access;

/**
 * Terreno, praça de acesso, paisagismo, vias, orla e mar. No modo garagem o solo fica
 * translúcido e os objetos da praça somem, para a câmera "atravessar" o terreno.
 */
export function Site() {
  const mode = useSkyline((s) => s.mode);
  const landscape = useSkyline((s) => s.layers.landscape);
  const context = useSkyline((s) => s.layers.context);
  const quality = useSkyline((s) => s.quality);
  const plaza = useRef<Group>(null);
  const fade = useRef(1);

  const groundMat = useMemo(() => new MeshStandardMaterial({ color: new Color('#8d9189'), roughness: 1, transparent: true, opacity: 1, depthWrite: true }), []);
  const pavingMat = useMemo(() => {
    const t = getPavingTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(30, 30);
    return new MeshStandardMaterial({ map: t, roughness: 0.9, transparent: true, opacity: 1 });
  }, []);
  useEffect(() => () => { groundMat.dispose(); pavingMat.map?.dispose(); pavingMat.dispose(); }, [groundMat, pavingMat]);

  const groundGeo = useMemo(() => {
    const S = 3200;
    const shape = new Shape();
    shape.moveTo(-S, -S);
    shape.lineTo(S, -S);
    shape.lineTo(S, S);
    shape.lineTo(-S, S);
    shape.lineTo(-S, -S);
    // abertura da rampa de acesso à garagem (eixo Y do shape = -Z da cena)
    const hole = new Path();
    hole.moveTo(ramp.x0, -ramp.z0);
    hole.lineTo(ramp.x1, -ramp.z0);
    hole.lineTo(ramp.x1, -ramp.z1);
    hole.lineTo(ramp.x0, -ramp.z1);
    hole.lineTo(ramp.x0, -ramp.z0);
    shape.holes.push(hole);
    const g = new ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useEffect(() => () => groundGeo.dispose(), [groundGeo]);

  useFrame((_, delta) => {
    const target = mode === 'garage' ? 0 : 1;
    const k = useSkyline.getState().reducedMotion ? 1 : 1 - Math.exp(-delta * 3);
    fade.current += (target - fade.current) * k;
    if (Math.abs(fade.current - target) < 0.002) fade.current = target;
    groundMat.opacity = fade.current;
    pavingMat.opacity = fade.current;
    groundMat.depthWrite = pavingMat.depthWrite = fade.current > 0.98;
    groundMat.visible = pavingMat.visible = fade.current > 0.06;
    if (plaza.current) plaza.current.visible = fade.current > 0.6;
  });

  // pavimentação da praça recortada ao redor da rampa
  const paving: BoxItem[] = [
    { p: [(-46 + ramp.x0) / 2, 0.03, 5], s: [ramp.x0 + 46, 0.06, 90] },
    { p: [(ramp.x0 + ramp.x1) / 2, 0.03, (ramp.z1 + 50) / 2], s: [ramp.x1 - ramp.x0, 0.06, 50 - ramp.z1] },
    { p: [(ramp.x1 + 46) / 2, 0.03, 5], s: [46 - ramp.x1, 0.06, 90] },
  ];

  return (
    <group name="site">
      <mesh geometry={groundGeo} material={groundMat} receiveShadow name="ground" raycast={() => null} />
      <InstancedBoxes items={paving} material={pavingMat} receiveShadow />
      <group ref={plaza}>
        <Plaza landscape={landscape} />
        <Roads />
      </group>
      <AccessRamp />
      {context && <Waterfront />}
      {landscape && mode !== 'garage' && <Trees count={QUALITY[quality].trees} />}
      <StreetLights />
    </group>
  );
}

function Plaza({ landscape }: { landscape: boolean }) {
  const reflecting = useMemo(() => {
    const t = getWaterNormal().clone();
    t.needsUpdate = true;
    t.repeat.set(3, 4);
    const m = new MeshStandardMaterial({ color: new Color('#3d6276'), roughness: 0.03, metalness: 0.3, normalMap: t, envMapIntensity: 1.8 });
    m.normalScale.set(0.15, 0.15);
    return m;
  }, []);
  useEffect(() => () => { reflecting.normalMap?.dispose(); reflecting.dispose(); }, [reflecting]);
  useFrame((_, d) => {
    reflecting.normalMap!.offset.y += d * 0.01;
  });

  const lawns: BoxItem[] = landscape
    ? [
        { p: [-26, 0.12, 31], s: [28, 0.2, 26] },
        { p: [26, 0.12, 31], s: [28, 0.2, 26] },
        { p: [-36, 0.12, -6], s: [14, 0.2, 40] },
        { p: [36, 0.12, -10], s: [14, 0.2, 32] },
        { p: [-6, 0.12, -33], s: [44, 0.2, 10] },
      ]
    : [];
  const hedges: BoxItem[] = landscape
    ? [
        ...[-1, 1].flatMap((sx) => [
          { p: [sx * 12.6, 0.55, 31] as [number, number, number], s: [0.9, 0.9, 25] as [number, number, number] },
          { p: [sx * 26, 0.55, 44.2] as [number, number, number], s: [28, 0.9, 0.9] as [number, number, number] },
        ]),
      ]
    : [];
  const benches: BoxItem[] = [
    ...[-1, 1].flatMap((sx) => [20, 26, 32, 38].map((z) => ({ p: [sx * 9.3, 0.25, z] as [number, number, number], s: [0.6, 0.45, 2.2] as [number, number, number] }))),
  ];
  return (
    <group name="plaza">
      <InstancedBoxes items={lawns} material={MAT.lawn} receiveShadow />
      <InstancedBoxes items={hedges} material={MAT.plantDark} castShadow />
      <InstancedBoxes items={benches} material={MAT.wood} castShadow />
      {/* espelho d'água de chegada */}
      <mesh position={[0, 0.12, 31]} material={MAT.stone} receiveShadow>
        <boxGeometry args={[12.8, 0.24, 15]} />
      </mesh>
      <mesh position={[0, 0.25, 31]} rotation={[-Math.PI / 2, 0, 0]} material={reflecting}>
        <planeGeometry args={[12, 14.2]} />
      </mesh>
    </group>
  );
}

function Roads() {
  const items: BoxItem[] = useMemo(() => [
    { p: [0, 0.02, 58], s: [1400, 0.04, 12] },
    { p: [0, 0.02, -52], s: [1400, 0.04, 12] },
    { p: [57, 0.021, 0], s: [10, 0.04, 220] },
    { p: [-57, 0.021, 0], s: [10, 0.04, 220] },
  ], []);
  const marks: BoxItem[] = useMemo(() => {
    const out: BoxItem[] = [];
    for (let x = -600; x <= 600; x += 9) {
      out.push({ p: [x, 0.05, 58], s: [4.5, 0.01, 0.18] });
      out.push({ p: [x, 0.05, -52], s: [4.5, 0.01, 0.18] });
    }
    // faixa de pedestres em frente ao acesso
    for (let i = 0; i < 10; i++) out.push({ p: [-4.5 + i, 0.05, 58], s: [0.5, 0.01, 10] });
    return out;
  }, []);
  return (
    <group name="roads">
      <InstancedBoxes items={items} material={MAT.asphalt} receiveShadow />
      <InstancedBoxes items={marks} material={MAT.marking} />
    </group>
  );
}

function AccessRamp() {
  const len = Math.hypot(ramp.z1 - ramp.z0, GARAGE_CONFIG.levelHeight);
  const ang = Math.atan2(GARAGE_CONFIG.levelHeight, ramp.z1 - ramp.z0);
  const cx = (ramp.x0 + ramp.x1) / 2;
  const cz = (ramp.z0 + ramp.z1) / 2;
  const w = ramp.x1 - ramp.x0;
  return (
    <group name="garage-access-ramp">
      <mesh position={[cx, -GARAGE_CONFIG.levelHeight / 2 - 0.1, cz]} rotation={[ang, 0, 0]} material={MAT.asphalt} receiveShadow>
        <boxGeometry args={[w, 0.2, len]} />
      </mesh>
      {[ramp.x0 - 0.15, ramp.x1 + 0.15].map((x) => (
        <mesh key={x} position={[x, -GARAGE_CONFIG.levelHeight / 2 + 0.3, cz]} material={MAT.concreteRaw} castShadow receiveShadow>
          <boxGeometry args={[0.3, GARAGE_CONFIG.levelHeight + 1, ramp.z1 - ramp.z0]} />
        </mesh>
      ))}
      {/* guarda-corpo e faixas zebradas na entrada */}
      {[ramp.x0 - 0.15, ramp.x1 + 0.15].map((x) => (
        <mesh key={`r${x}`} position={[x, 0.95, cz]} material={MAT.metalLight}>
          <boxGeometry args={[0.06, 0.06, ramp.z1 - ramp.z0]} />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[ramp.x0 + 0.6 + i * 1.2, 0.03, ramp.z0 - 1.5]} rotation={[-Math.PI / 2, 0, 0.6]} material={MAT.markingYellow}>
          <planeGeometry args={[0.4, 3]} />
        </mesh>
      ))}
    </group>
  );
}

function Waterfront() {
  const sea = useMemo(() => {
    const t = getWaterNormal().clone();
    t.needsUpdate = true;
    t.repeat.set(220, 120);
    const m = new MeshStandardMaterial({ color: new Color('#1b4b68'), roughness: 0.16, metalness: 0.35, normalMap: t, envMapIntensity: 1.3 });
    m.normalScale.set(0.6, 0.6);
    return m;
  }, []);
  useEffect(() => () => { sea.normalMap?.dispose(); sea.dispose(); }, [sea]);
  useFrame((_, d) => {
    const k = useSkyline.getState().reducedMotion ? 0.1 : 1;
    sea.normalMap!.offset.x += d * 0.004 * k;
    sea.normalMap!.offset.y += d * 0.0025 * k;
  });
  return (
    <group name="waterfront">
      {/* calçadão da orla e areia */}
      <mesh position={[0, 0.04, 72]} material={MAT.paving} receiveShadow>
        <boxGeometry args={[1400, 0.08, 16]} />
      </mesh>
      <mesh position={[0, 0.02, 122]} receiveShadow>
        <boxGeometry args={[1400, 0.04, 84]} />
        <meshStandardMaterial color="#d8c9a6" roughness={1} />
      </mesh>
      <mesh position={[0, -0.05, 2160]} rotation={[-Math.PI / 2, 0, 0]} material={sea} name="sea">
        <planeGeometry args={[7000, 4080]} />
      </mesh>
    </group>
  );
}

function Trees({ count }: { count: number }) {
  const data = useMemo(() => {
    const rand = rng(2026);
    const pts: { x: number; z: number; h: number; palm?: boolean }[] = [];
    // alamedas nas vias
    for (let x = -330; x <= 330; x += 14) {
      if (Math.abs(x) < 8) continue;
      pts.push({ x, z: 51, h: 7 + rand() * 3 });
      pts.push({ x: x + 7, z: -44.5, h: 6 + rand() * 3 });
    }
    // coqueiros no calçadão
    for (let x = -400; x <= 400; x += 18) pts.push({ x: x + rand() * 4, z: 78, h: 10 + rand() * 4, palm: true });
    // jardins da praça
    for (const [x0, z0, w, d, n] of [[-38, 20, 22, 22, 9], [16, 20, 22, 22, 9], [-42, -24, 10, 36, 6], [30, -24, 10, 30, 5]] as const) {
      for (let i = 0; i < n; i++) pts.push({ x: x0 + rand() * w, z: z0 + rand() * d, h: 6 + rand() * 5 });
    }
    // laterais da quadra
    for (let z = -40; z <= 46; z += 11) {
      pts.push({ x: 49, z, h: 7 + rand() * 3 });
      pts.push({ x: -49, z, h: 7 + rand() * 3 });
    }
    const chosen = pts.slice(0, count);
    const trunks: BoxItem[] = [];
    const crowns: BoxItem[] = [];
    const palms: BoxItem[] = [];
    const greens = ['#4f6d44', '#5a7a4c', '#46623f', '#64834f', '#3f5a3a'];
    chosen.forEach((t) => {
      if (t.palm) {
        trunks.push({ p: [t.x, t.h / 2, t.z], s: [0.35, t.h, 0.35] });
        palms.push({ p: [t.x, t.h, t.z], s: [3.6, 0.9, 3.6], r: rand() * 3, color: '#4f7a45' });
      } else {
        trunks.push({ p: [t.x, t.h * 0.3, t.z], s: [0.4, t.h * 0.6, 0.4] });
        crowns.push({ p: [t.x, t.h * 0.7, t.z], s: [t.h * 0.45, t.h * 0.5, t.h * 0.45], r: rand() * 3, color: greens[Math.floor(rand() * greens.length)] });
      }
    });
    return { trunks, crowns, palms };
  }, [count]);
  const trunkGeo = useMemo(() => new CylinderGeometry(0.5, 0.65, 1, 6), []);
  const crownGeo = useMemo(() => new IcosahedronGeometry(1, 1), []);
  const palmGeo = useMemo(() => new IcosahedronGeometry(1, 0), []);
  const crownMat = useMemo(() => new MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }), []);
  useEffect(() => () => { trunkGeo.dispose(); crownGeo.dispose(); palmGeo.dispose(); crownMat.dispose(); }, [trunkGeo, crownGeo, palmGeo, crownMat]);
  return (
    <group name="trees">
      <InstancedBoxes items={data.trunks} material={MAT.woodDark} geometry={trunkGeo} castShadow />
      <InstancedBoxes items={data.crowns} material={crownMat} geometry={crownGeo} castShadow />
      <InstancedBoxes items={data.palms} material={crownMat} geometry={palmGeo} castShadow />
    </group>
  );
}

function StreetLights() {
  const heads = useMemo(() => new MeshBasicMaterial({ color: '#ffe2b3', toneMapped: false }), []);
  const bollard = useMemo(() => new MeshBasicMaterial({ color: '#ffe2b3', toneMapped: false }), []);
  useEffect(() => () => { heads.dispose(); bollard.dispose(); }, [heads, bollard]);
  useFrame(() => {
    const s = useSkyline.getState();
    const on = s.layers.archLights ? rt.night : 0;
    heads.color.set('#ffe2b3').multiplyScalar(0.25 + on * 2.2);
    bollard.color.set('#ffe2b3').multiplyScalar(0.2 + on * 1.8);
  });
  const { poles, lamps, bollards, bollardTops } = useMemo(() => {
    const poles: BoxItem[] = [];
    const lamps: BoxItem[] = [];
    for (let x = -320; x <= 320; x += 28) {
      for (const z of [64.5, -45.5]) {
        poles.push({ p: [x, 4.5, z], s: [0.18, 9, 0.18] });
        lamps.push({ p: [x, 9, z + (z > 0 ? -1 : 1)], s: [0.5, 0.15, 2.2] });
      }
    }
    const bollards: BoxItem[] = [];
    const bollardTops: BoxItem[] = [];
    for (const sx of [-1, 1]) {
      for (let z = 16; z <= 46; z += 5) {
        bollards.push({ p: [sx * 10.6, 0.45, z], s: [0.18, 0.9, 0.18] });
        bollardTops.push({ p: [sx * 10.6, 0.93, z], s: [0.2, 0.06, 0.2] });
      }
    }
    return { poles, lamps, bollards, bollardTops };
  }, []);
  return (
    <group name="street-lights">
      <InstancedBoxes items={poles} material={MAT.metal} />
      <InstancedBoxes items={lamps} material={heads} />
      <InstancedBoxes items={bollards} material={MAT.metal} />
      <InstancedBoxes items={bollardTops} material={bollard} />
    </group>
  );
}
