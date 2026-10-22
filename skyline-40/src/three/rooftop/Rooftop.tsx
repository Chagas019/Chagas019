import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BackSide, Color, MeshStandardMaterial, type Group, type PointLight } from 'three';
import { BUILDING, FLOOR_COUNT, floorHeight } from '../../data/building';
import { useSkyline } from '../../state/store';
import { floorRuntime as rt, visibility } from '../building/floorRuntime';
import { MAT, realMaterials } from '../materials';
import { box } from '../utils/geo';
import { getDeckTexture, getTileTexture, getWaterNormal } from '../textures';
import { B, C, Plant } from '../apartment/FurniturePiece';

const HX = BUILDING.halfX;
const HZ = BUILDING.halfZ;
/** Piscina panorâmica (coordenadas locais da cobertura, y = 0 no deck estrutural). */
export const POOL = { x0: -13.4, x1: 5.4, z0: 4.7, z1: 10.3, water: 0.62, bottom: -0.65 };

/**
 * Cobertura premium: piscina com borda infinita, deck, espreguiçadeiras, lounge, espaço gourmet,
 * jardim, mirante, guarda-corpos de vidro e iluminação arquitetônica. Acompanha o pavimento 40
 * (vista explodida, corte e revelação).
 */
export function Rooftop() {
  const group = useRef<Group>(null);
  const h40 = floorHeight(FLOOR_COUNT);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const v = visibility('structure', FLOOR_COUNT);
    g.visible = v > 0.01;
    g.position.y = rt.y[FLOOR_COUNT] + h40;
    g.scale.set(1, Math.max(v, 0.001), 1);
  });

  return (
    <group ref={group} name="rooftop">
      <RoofDeck />
      <Pool />
      <Loungers />
      <Lounge />
      <Gourmet />
      <Garden />
      <CoreOverrun />
      <Perimeter />
      <Crown />
      <SkyLounge />
      <RoofLights />
    </group>
  );
}

function RoofDeck() {
  const deck = useMemo(() => {
    const tex = getDeckTexture().clone();
    tex.needsUpdate = true;
    tex.repeat.set(6, 9);
    return new MeshStandardMaterial({ map: tex, roughness: 0.72, color: new Color('#d8c3ad') });
  }, []);
  useEffect(() => () => { deck.map?.dispose(); deck.dispose(); }, [deck]);
  return (
    <group>
      {/* laje de cobertura e faixa de borda */}
      <B s={[HX * 2, 0.3, HZ * 2]} p={[0, -0.15, 0]} m={MAT.concrete} />
      <B s={[HX * 2 + 0.12, 0.52, 0.12]} p={[0, -0.18, HZ + 0.02]} m={MAT.concrete} />
      <B s={[HX * 2 + 0.12, 0.52, 0.12]} p={[0, -0.18, -HZ - 0.02]} m={MAT.concrete} />
      <B s={[0.12, 0.52, HZ * 2 + 0.12]} p={[HX + 0.02, -0.18, 0]} m={MAT.concrete} />
      <B s={[0.12, 0.52, HZ * 2 + 0.12]} p={[-HX - 0.02, -0.18, 0]} m={MAT.concrete} />
      <mesh position={[0, 0.06, 0]} material={deck} receiveShadow>
        <boxGeometry args={[HX * 2 - 0.6, 0.12, HZ * 2 - 0.6]} />
      </mesh>
    </group>
  );
}

function Pool() {
  const { x0, x1, z0, z1, water, bottom } = POOL;
  const w = x1 - x0;
  const d = z1 - z0;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const waterMat = useMemo(() => {
    const n = getWaterNormal();
    const tex = n.clone();
    tex.needsUpdate = true;
    tex.repeat.set(4, 1.3);
    const m = new MeshStandardMaterial({
      color: new Color('#3a9ec4'), roughness: 0.04, metalness: 0.15, transparent: true, opacity: 0.74,
      normalMap: tex, envMapIntensity: 2.2, emissive: new Color('#0b6a92'), emissiveIntensity: 0.05,
    });
    m.normalScale.set(0.55, 0.55);
    return m;
  }, []);
  const tileMat = useMemo(() => {
    const t = getTileTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(w / 1.2, 1.6);
    return new MeshStandardMaterial({ map: t, roughness: 0.3, side: BackSide, color: new Color('#ffffff') });
  }, [w]);
  const lightsMat = useMemo(() => MAT.lightCool.clone(), []);
  useEffect(() => () => { waterMat.normalMap?.dispose(); waterMat.dispose(); tileMat.map?.dispose(); tileMat.dispose(); lightsMat.dispose(); }, [waterMat, tileMat, lightsMat]);

  useFrame((_, delta) => {
    const s = useSkyline.getState();
    const k = s.reducedMotion ? 0.15 : 1;
    const nm = waterMat.normalMap!;
    nm.offset.x += delta * 0.018 * k;
    nm.offset.y += delta * 0.011 * k;
    // à noite a piscina acende (luz subaquática)
    const night = rt.night;
    waterMat.emissiveIntensity = 0.04 + night * 0.9 * (s.layers.archLights ? 1 : 0.2);
    lightsMat.color.setScalar(0.4 + night * 1.6 * (s.layers.archLights ? 1 : 0));
  });

  return (
    <group name="pool">
      {/* bacia elevada: paredes em pedra mineral */}
      <B s={[w + 0.6, 0.85, 0.3]} p={[cx, 0.42, z0 - 0.15]} m={MAT.stone} />
      <B s={[0.3, 0.85, d + 0.6]} p={[x0 - 0.15, 0.42, cz]} m={MAT.stone} />
      <B s={[0.3, 0.85, d + 0.6]} p={[x1 + 0.15, 0.42, cz]} m={MAT.stone} />
      {/* borda infinita: lâmina de vidro e calha de transbordo voltadas para o mar */}
      <B s={[w + 0.6, 0.6, 0.1]} p={[cx, 0.3, z1 + 0.05]} m={MAT.stone} />
      <B s={[w + 0.6, 0.32, 0.05]} p={[cx, 0.76, z1 + 0.05]} m={MAT.railGlass} cast={false} />
      <B s={[w + 0.6, 0.12, 0.42]} p={[cx, 0.06, z1 + 0.32]} m={MAT.black} cast={false} />
      {/* interior revestido em pastilhas (faces internas) */}
      <mesh position={[cx, (water + bottom) / 2, cz]} material={tileMat} receiveShadow>
        <boxGeometry args={[w, water - bottom, d]} />
      </mesh>
      {/* degraus de acesso */}
      {[0, 1, 2].map((i) => (
        <B key={i} s={[1.8, 0.28, 0.45]} p={[x0 + 1.1, bottom + 0.3 + i * 0.28, z0 + 0.25 + i * 0.45]} m={MAT.white} cast={false} />
      ))}
      {/* luzes subaquáticas */}
      {[-11, -7, -3, 1, 4].map((x) => (
        <mesh key={x} position={[x, 0.15, z0 + 0.03]} material={lightsMat}>
          <boxGeometry args={[0.35, 0.12, 0.02]} />
        </mesh>
      ))}
      <mesh position={[cx, water, cz]} rotation={[-Math.PI / 2, 0, 0]} material={waterMat} name="pool-water">
        <planeGeometry args={[w, d, 1, 1]} />
      </mesh>
    </group>
  );
}

function Lounger({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <B s={[0.72, 0.08, 1.95]} p={[0, 0.3, 0]} m={MAT.woodDark} />
      <B s={[0.66, 0.08, 1.2]} p={[0, 0.38, 0.3]} m={MAT.fabric} />
      <group position={[0, 0.38, -0.32]} rotation={[-0.75, 0, 0]}>
        <B s={[0.66, 0.08, 0.75]} p={[0, 0, -0.35]} m={MAT.fabric} />
      </group>
      {[-0.3, 0.3].map((x) => [-0.85, 0.85].map((z) => <B key={`${x}${z}`} s={[0.05, 0.28, 0.05]} p={[x, 0.14, z]} m={MAT.metal} />))}
    </group>
  );
}

function Parasol({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <C r={0.25} h={0.1} p={[0, 0.17, 0]} m={MAT.stone} />
      <C r={0.03} h={2.5} p={[0, 1.4, 0]} m={MAT.metalLight} seg={8} />
      <mesh position={[0, 2.55, 0]} material={MAT.white} castShadow>
        <coneGeometry args={[1.5, 0.45, 8, 1, true]} />
      </mesh>
    </group>
  );
}

function Loungers() {
  return (
    <group name="loungers">
      {[-12.4, -11.0, -8.6, -7.2, -5.6].map((x) => (
        <Lounger key={x} p={[x, 0.12, 3.35]} />
      ))}
      {[-11.7, -7.9].map((x) => <Parasol key={x} p={[x, 0.12, 2.75]} />)}
      <Plant h={1.3} w={0.9} p={[2.6, 0.12, 3.2]} />
    </group>
  );
}

function Lounge() {
  return (
    <group name="lounge" position={[10.3, 0.12, 6.4]}>
      {/* tapete externo */}
      <B s={[6.4, 0.02, 6.2]} p={[0, 0.01, 0]} m={MAT.fabric} cast={false} />
      {/* sofá em L */}
      <B s={[5.2, 0.42, 0.95]} p={[0, 0.21, -2.4]} m={MAT.fabricDark} />
      <B s={[5.2, 0.42, 0.22]} p={[0, 0.6, -2.8]} m={MAT.fabricDark} />
      <B s={[0.95, 0.42, 3.6]} p={[2.6, 0.21, -0.1]} m={MAT.fabricDark} />
      <B s={[0.22, 0.42, 3.6]} p={[3.0, 0.6, -0.1]} m={MAT.fabricDark} />
      <B s={[4.9, 0.1, 0.7]} p={[0, 0.47, -2.3]} m={MAT.fabric} />
      {/* lareira externa */}
      <C r={0.75} h={0.45} p={[-0.3, 0.22, 0.1]} m={MAT.concreteRaw} seg={24} />
      <mesh position={[-0.3, 0.48, 0.1]} material={MAT.lightWarm} name="firepit">
        <cylinderGeometry args={[0.5, 0.5, 0.06, 24]} />
      </mesh>
      {/* poltronas */}
      <B s={[0.85, 0.42, 0.85]} p={[-2.3, 0.21, 1.6]} m={MAT.fabricBlue} />
      <B s={[0.85, 0.42, 0.85]} p={[-0.6, 0.21, 2.2]} m={MAT.fabricBlue} />
      <Plant h={1.6} w={1.0} p={[-2.9, 0, -2.6]} />
      <Plant h={1.2} w={0.8} p={[3.2, 0, 2.6]} />
    </group>
  );
}

function Gourmet() {
  const slats = useMemo(() => Array.from({ length: 16 }, (_, i) => -13.6 + i * 0.75), []);
  return (
    <group name="gourmet">
      {/* pérgola */}
      {[[-13.8, -10.3], [-2.2, -10.3], [-13.8, -3.6], [-2.2, -3.6]].map(([x, z]) => (
        <B key={`${x}${z}`} s={[0.18, 3, 0.18]} p={[x, 1.62, z]} m={MAT.metal} />
      ))}
      <B s={[11.8, 0.22, 0.18]} p={[-8, 3.1, -10.3]} m={MAT.metal} />
      <B s={[11.8, 0.22, 0.18]} p={[-8, 3.1, -3.6]} m={MAT.metal} />
      {slats.map((x) => (
        <B key={x} s={[0.09, 0.16, 6.9]} p={[x, 3.28, -6.95]} m={MAT.wood} />
      ))}
      {/* bancada gourmet com churrasqueira */}
      <B s={[8.5, 0.9, 0.75]} p={[-8.6, 0.57, -10.15]} m={MAT.woodDark} />
      <B s={[8.6, 0.05, 0.8]} p={[-8.6, 1.04, -10.15]} m={MAT.stone} />
      <B s={[1.4, 1.5, 0.8]} p={[-3.4, 0.87, -10.15]} m={MAT.black} />
      <B s={[1.2, 0.3, 0.5]} p={[-11.5, 1.2, -10.4]} m={MAT.metalLight} />
      {/* mesa para 8 pessoas */}
      <group position={[-8, 0.12, -6.6]}>
        <B s={[3.8, 0.06, 1.15]} p={[0, 0.75, 0]} m={MAT.wood} />
        <B s={[0.12, 0.72, 0.9]} p={[-1.6, 0.36, 0]} m={MAT.metal} />
        <B s={[0.12, 0.72, 0.9]} p={[1.6, 0.36, 0]} m={MAT.metal} />
        {[-1.35, -0.45, 0.45, 1.35].map((x) =>
          [-0.85, 0.85].map((z) => (
            <group key={`${x}${z}`} position={[x, 0, z]} rotation={[0, z > 0 ? Math.PI : 0, 0]}>
              <B s={[0.48, 0.06, 0.46]} p={[0, 0.46, 0]} m={MAT.fabric} />
              <B s={[0.48, 0.4, 0.05]} p={[0, 0.68, -0.22]} m={MAT.woodDark} />
              <B s={[0.04, 0.44, 0.04]} p={[0, 0.22, 0]} m={MAT.metal} />
            </group>
          )),
        )}
        {/* luminárias pendentes */}
        {[-1.2, 0, 1.2].map((x) => (
          <mesh key={x} position={[x, 2.55, 0]} material={MAT.lightWarm}>
            <sphereGeometry args={[0.16, 12, 8]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Garden() {
  const trees = useMemo(() => [[4.2, -8.6, 3.2], [8.4, -9.2, 3.8], [12.6, -8.4, 3.0], [13.2, -1.6, 2.6], [-13.4, 1.2, 2.4]] as [number, number, number][], []);
  return (
    <group name="garden">
      {/* canteiros elevados */}
      <B s={[11.6, 0.6, 3.6]} p={[8.6, 0.42, -8.9]} m={MAT.concreteRaw} />
      <B s={[11.3, 0.08, 3.3]} p={[8.6, 0.74, -8.9]} m={MAT.lawn} cast={false} />
      <B s={[1.6, 0.6, 7.5]} p={[13.6, 0.42, -0.8]} m={MAT.concreteRaw} />
      <B s={[1.4, 0.08, 7.3]} p={[13.6, 0.74, -0.8]} m={MAT.lawn} cast={false} />
      <B s={[1.6, 0.6, 6.5]} p={[-13.6, 0.42, 0.2]} m={MAT.concreteRaw} />
      <B s={[1.4, 0.08, 6.3]} p={[-13.6, 0.74, 0.2]} m={MAT.lawn} cast={false} />
      {trees.map(([x, z, h]) => (
        <group key={`${x}${z}`} position={[x, 0.75, z]}>
          <C r={0.09} r2={0.13} h={h * 0.55} p={[0, h * 0.27, 0]} m={MAT.woodDark} seg={8} />
          <mesh position={[0, h * 0.68, 0]} material={MAT.plant} castShadow>
            <icosahedronGeometry args={[h * 0.32, 1]} />
          </mesh>
          <mesh position={[h * 0.15, h * 0.82, 0.2]} material={MAT.plantDark} castShadow>
            <icosahedronGeometry args={[h * 0.22, 1]} />
          </mesh>
        </group>
      ))}
      {[[5.5, -7.3], [7.6, -7.4], [10.2, -7.2], [11.8, -7.5]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.95, z]} material={MAT.plantDark} castShadow>
          <icosahedronGeometry args={[0.45, 1]} />
        </mesh>
      ))}
      {/* bancos de contemplação */}
      <B s={[2.4, 0.42, 0.55]} p={[6.2, 0.33, -5.9]} m={MAT.wood} />
      <B s={[2.4, 0.42, 0.55]} p={[10.6, 0.33, -5.9]} m={MAT.wood} />
      {/* mirante com lunetas nas quinas frontais */}
      {[[13.5, 10.1], [-14.1, 10.1]].map(([x, z]) => (
        <group key={x} position={[x, 0.12, z]}>
          <C r={0.05} h={1.15} p={[0, 0.58, 0]} m={MAT.metal} seg={8} />
          <group position={[0, 1.22, 0]} rotation={[0.25, x > 0 ? -0.5 : 0.5, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={MAT.metalLight}>
              <cylinderGeometry args={[0.07, 0.09, 0.45, 12]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

function CoreOverrun() {
  const { halfX: cx, halfZ: cz } = BUILDING.core;
  const R = realMaterials();
  const geos = useMemo(() => ({ volume: box(cx * 2 + 0.6, 3.6, cz * 2 + 0.6, 0, 1.8, 0), soffit: box(cx * 2 + 2.3, 0.04, cz * 2 + 3.5, 0, 3.6, 0.9) }), [cx, cz]);
  useEffect(() => () => { geos.volume.dispose(); geos.soffit.dispose(); }, [geos]);
  return (
    <group name="core-overrun">
      {/* volume da casa de máquinas revestido em travertino, com forro de madeira na marquise */}
      <mesh geometry={geos.volume} material={R.stone} castShadow receiveShadow />
      <mesh geometry={geos.soffit} material={R.soffit} />
      {/* porta envidraçada de acesso à cobertura */}
      <B s={[3.6, 2.6, 0.06]} p={[0, 1.42, cz + 0.32]} m={MAT.glass} cast={false} />
      <B s={[3.8, 0.12, 0.12]} p={[0, 2.75, cz + 0.33]} m={MAT.metal} />
      {/* marquise em balanço */}
      <B s={[cx * 2 + 2.4, 0.18, cz * 2 + 3.6]} p={[0, 3.7, 0.9]} m={MAT.concrete} />
    </group>
  );
}

function Perimeter() {
  const H = 1.2;
  const off = 0.18;
  const ledMat = useMemo(() => MAT.lightWarm.clone(), []);
  useEffect(() => () => ledMat.dispose(), [ledMat]);
  useFrame(() => {
    const s = useSkyline.getState();
    ledMat.color.set('#ffd7a1').multiplyScalar(s.layers.archLights ? 0.12 + rt.night * 1.5 : 0.05);
  });
  const sides: { s: [number, number, number]; p: [number, number, number] }[] = [
    { s: [HX * 2 - off * 2, H, 0.03], p: [0, H / 2 + 0.12, HZ - off] },
    { s: [HX * 2 - off * 2, H, 0.03], p: [0, H / 2 + 0.12, -HZ + off] },
    { s: [0.03, H, HZ * 2 - off * 2], p: [HX - off, H / 2 + 0.12, 0] },
    { s: [0.03, H, HZ * 2 - off * 2], p: [-HX + off, H / 2 + 0.12, 0] },
  ];
  return (
    <group name="perimeter">
      {sides.map((sd, i) => (
        <group key={i}>
          <mesh position={sd.p} material={MAT.railGlass}>
            <boxGeometry args={sd.s} />
          </mesh>
          <mesh position={[sd.p[0], H + 0.14, sd.p[2]]} material={MAT.metalLight}>
            <boxGeometry args={[Math.max(sd.s[0], 0.06), 0.05, Math.max(sd.s[2], 0.06)]} />
          </mesh>
          <mesh position={[sd.p[0], 0.16, sd.p[2]]} material={ledMat}>
            <boxGeometry args={[Math.max(sd.s[0], 0.05), 0.04, Math.max(sd.s[2], 0.05)]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Coroamento: moldura esbelta que marca a silhueta do edifício, com LED à noite. */
function Crown() {
  const ledMat = useMemo(() => MAT.lightCool.clone(), []);
  useEffect(() => () => ledMat.dispose(), [ledMat]);
  useFrame(() => {
    const s = useSkyline.getState();
    ledMat.color.set('#dbe8ff').multiplyScalar(s.layers.archLights ? 0.25 + rt.night * 2.2 : 0.1);
  });
  const H = 7.2;
  const X = HX + 0.4;
  const Z = HZ + 0.4;
  return (
    <group name="crown">
      {[[X, Z], [-X, Z], [X, -Z], [-X, -Z]].map(([x, z]) => (
        <B key={`${x}${z}`} s={[0.5, H, 0.5]} p={[x, H / 2 - 0.4, z]} m={MAT.concrete} />
      ))}
      <B s={[X * 2 + 0.5, 0.45, 0.5]} p={[0, H - 0.4, Z]} m={MAT.concrete} />
      <B s={[X * 2 + 0.5, 0.45, 0.5]} p={[0, H - 0.4, -Z]} m={MAT.concrete} />
      <B s={[0.5, 0.45, Z * 2 + 0.5]} p={[X, H - 0.4, 0]} m={MAT.concrete} />
      <B s={[0.5, 0.45, Z * 2 + 0.5]} p={[-X, H - 0.4, 0]} m={MAT.concrete} />
      {[[0, -0.66, Z, X * 2, 0.06], [0, -0.66, -Z, X * 2, 0.06]].map(([x, yo, z, w, d], i) => (
        <mesh key={i} position={[x, H + yo, z]} material={ledMat}>
          <boxGeometry args={[w, 0.05, d]} />
        </mesh>
      ))}
      {[[X, 0], [-X, 0]].map(([x, z], i) => (
        <mesh key={`s${i}`} position={[x, H - 0.66, z]} material={ledMat}>
          <boxGeometry args={[0.06, 0.05, Z * 2]} />
        </mesh>
      ))}
    </group>
  );
}

/** Interior do pavimento 40 (sky lounge) visto através do vidro. */
function SkyLounge() {
  const h = floorHeight(FLOOR_COUNT);
  return (
    <group position={[0, -h, 0]} name="sky-lounge">
      <B s={[7, 1.05, 0.8]} p={[-8, 0.53, 6]} m={MAT.woodDark} />
      <B s={[7.1, 0.05, 0.9]} p={[-8, 1.08, 6]} m={MAT.stone} />
      {[[-9, 9], [9, 8], [9, -7], [-9, -7]].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0.02, z]}>
          <B s={[3, 0.42, 0.9]} p={[0, 0.21, 0]} m={MAT.fabricDark} />
          <B s={[3, 0.4, 0.2]} p={[0, 0.6, -0.35]} m={MAT.fabricDark} />
          <B s={[1.2, 0.36, 0.7]} p={[0, 0.18, 1.3]} m={MAT.stone} />
        </group>
      ))}
      <B s={[4, 0.06, 1.2]} p={[9, 0.76, 1.5]} m={MAT.wood} />
      {[[6, 9], [-12, -9], [12.5, -2]].map(([x, z]) => <Plant key={`${x}${z}`} h={1.8} w={1} p={[x, 0, z]} />)}
    </group>
  );
}

function RoofLights() {
  const a = useRef<PointLight>(null);
  const b = useRef<PointLight>(null);
  useFrame(() => {
    const s = useSkyline.getState();
    const k = s.layers.archLights ? rt.night : 0;
    if (a.current) a.current.intensity = k * 60;
    if (b.current) b.current.intensity = k * 45;
  });
  return (
    <group>
      <pointLight ref={a} position={[-4, 3.2, 7.5]} color="#9fd8ff" distance={22} decay={1.5} intensity={0} />
      <pointLight ref={b} position={[-8, 2.6, -6.8]} color="#ffcf94" distance={16} decay={1.5} intensity={0} />
    </group>
  );
}
