import type { ReactNode } from 'react';
import type { Material } from 'three';
import type { Furniture } from '../../data/apartment';
import { MAT } from '../materials';

/** Caixa simples com material (atalho para montar mobiliário). */
export function B({ s, p, m, cast = true }: { s: [number, number, number]; p: [number, number, number]; m: Material; cast?: boolean }) {
  return (
    <mesh position={p} material={m} castShadow={cast} receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

export function C({ r, h, p, m, seg = 16, r2 }: { r: number; h: number; p: [number, number, number]; m: Material; seg?: number; r2?: number }) {
  return (
    <mesh position={p} material={m} castShadow receiveShadow>
      <cylinderGeometry args={[r, r2 ?? r, h, seg]} />
    </mesh>
  );
}

export function Plant({ h, w, p = [0, 0, 0] }: { h: number; w: number; p?: [number, number, number] }) {
  return (
    <group position={p}>
      <C r={w * 0.32} r2={w * 0.26} h={h * 0.3} p={[0, h * 0.15, 0]} m={MAT.stone} />
      <mesh position={[0, h * 0.62, 0]} material={MAT.plant} castShadow>
        <icosahedronGeometry args={[w * 0.5, 1]} />
      </mesh>
      <mesh position={[w * 0.12, h * 0.85, -w * 0.08]} material={MAT.plantDark} castShadow>
        <icosahedronGeometry args={[w * 0.34, 1]} />
      </mesh>
    </group>
  );
}

function Legs({ w, d, h, m = MAT.metal, inset = 0.05, r = 0.022 }: { w: number; d: number; h: number; m?: Material; inset?: number; r?: number }) {
  const xs = [-w / 2 + inset, w / 2 - inset];
  const zs = [-d / 2 + inset, d / 2 - inset];
  return (
    <>
      {xs.map((x) => zs.map((z) => <C key={`${x}${z}`} r={r} h={h} p={[x, h / 2, z]} m={m} seg={8} />))}
    </>
  );
}

/** Desenha uma peça de mobiliário a partir dos dados da planta (centro local já posicionado pelo pai). */
export function FurniturePiece({ item }: { item: Furniture }) {
  const { w, d, h } = item;
  let body: ReactNode = null;
  switch (item.kind) {
    case 'rug':
      body = <B s={[w, h, d]} p={[0, h / 2, 0]} m={MAT.fabric} cast={false} />;
      break;
    case 'sofa':
      body = (
        <>
          <B s={[w, 0.42, d]} p={[0, 0.21, 0]} m={MAT.fabricDark} />
          <B s={[w, 0.4, 0.22]} p={[0, 0.6, -d / 2 + 0.11]} m={MAT.fabricDark} />
          <B s={[0.2, 0.28, d]} p={[-w / 2 + 0.1, 0.55, 0]} m={MAT.fabricDark} />
          <B s={[0.2, 0.28, d]} p={[w / 2 - 0.1, 0.55, 0]} m={MAT.fabricDark} />
          <B s={[w - 0.5, 0.12, d - 0.3]} p={[0, 0.48, 0.08]} m={MAT.fabric} />
        </>
      );
      break;
    case 'armchair':
      body = (
        <>
          <B s={[w, 0.4, d]} p={[0, 0.2, 0]} m={MAT.fabricBlue} />
          <B s={[w, 0.42, 0.16]} p={[0, 0.61, -d / 2 + 0.08]} m={MAT.fabricBlue} />
        </>
      );
      break;
    case 'coffeeTable':
      body = (
        <>
          <B s={[w, 0.05, d]} p={[0, h, 0]} m={MAT.stone} />
          <B s={[w * 0.6, h - 0.05, d * 0.5]} p={[0, (h - 0.05) / 2, 0]} m={MAT.woodDark} />
        </>
      );
      break;
    case 'tvUnit':
      body = (
        <>
          <B s={[w, h, d]} p={[0, h / 2, 0]} m={MAT.woodDark} />
          <B s={[0.05, 0.85, 1.6]} p={[0, h + 0.75, 0]} m={MAT.black} />
        </>
      );
      break;
    case 'diningTable':
    case 'outdoorTable':
    case 'desk':
      body = (
        <>
          <B s={[w, 0.05, d]} p={[0, h - 0.025, 0]} m={item.kind === 'desk' ? MAT.white : MAT.wood} />
          <Legs w={w} d={d} h={h - 0.05} m={MAT.metal} inset={0.12} />
        </>
      );
      break;
    case 'chair':
    case 'outdoorChair':
    case 'stool':
      body = (
        <>
          <B s={[w, 0.06, d]} p={[0, item.kind === 'stool' ? h : 0.46, 0]} m={item.kind === 'outdoorChair' ? MAT.fabric : MAT.woodDark} />
          {item.kind !== 'stool' && <B s={[w, 0.42, 0.05]} p={[0, 0.7, -d / 2 + 0.03]} m={MAT.woodDark} />}
          <Legs w={w} d={d} h={item.kind === 'stool' ? h : 0.44} inset={0.05} r={0.015} />
        </>
      );
      break;
    case 'pendant':
      body = (
        <>
          <B s={[w, 0.06, d * 0.4]} p={[0, 2.25, 0]} m={MAT.lightWarm} cast={false} />
          <B s={[0.01, 0.6, 0.01]} p={[0, 2.6, 0]} m={MAT.metal} cast={false} />
        </>
      );
      break;
    case 'counter':
    case 'island':
      body = (
        <>
          <B s={[w, h - 0.04, d]} p={[0, (h - 0.04) / 2, 0]} m={item.kind === 'island' ? MAT.woodDark : MAT.white} />
          <B s={[w + 0.02, 0.04, d + 0.02]} p={[0, h - 0.02, 0]} m={MAT.stone} />
        </>
      );
      break;
    case 'tallCabinet':
    case 'wardrobe':
      body = <B s={[w, h, d]} p={[0, h / 2, 0]} m={item.kind === 'wardrobe' ? MAT.wood : MAT.white} />;
      break;
    case 'bed':
      body = (
        <>
          <B s={[w, 0.3, d]} p={[0, 0.15, 0]} m={MAT.woodDark} />
          <B s={[w - 0.06, 0.24, d - 0.1]} p={[0, 0.42, 0.03]} m={MAT.white} />
          <B s={[w + 0.3, 1.05, 0.08]} p={[0, 0.52, -d / 2 + 0.02]} m={MAT.fabricBlue} />
          <B s={[w - 0.1, 0.06, d * 0.45]} p={[0, 0.57, d * 0.2]} m={MAT.fabricDark} />
          <B s={[w * 0.4, 0.14, 0.32]} p={[-w * 0.22, 0.6, -d / 2 + 0.3]} m={MAT.fabric} />
          <B s={[w * 0.4, 0.14, 0.32]} p={[w * 0.22, 0.6, -d / 2 + 0.3]} m={MAT.fabric} />
        </>
      );
      break;
    case 'nightstand':
    case 'console':
    case 'bench':
      body = <B s={[w, h, d]} p={[0, h / 2, 0]} m={item.kind === 'bench' ? MAT.fabricBlue : MAT.woodDark} />;
      break;
    case 'vanity':
      body = (
        <>
          <B s={[w, 0.45, d]} p={[0, h - 0.22, 0]} m={MAT.woodDark} />
          <B s={[w, 0.03, d]} p={[0, h, 0]} m={MAT.stone} />
          <B s={[w * 0.9, 0.8, 0.02]} p={[0, h + 0.6, -d / 2 + 0.01]} m={MAT.metalLight} />
        </>
      );
      break;
    case 'toilet':
      body = (
        <>
          <B s={[w, 0.4, d * 0.65]} p={[0, 0.2, d * 0.1]} m={MAT.white} />
          <B s={[w, 0.45, 0.16]} p={[0, 0.45, -d / 2 + 0.08]} m={MAT.white} />
        </>
      );
      break;
    case 'shower':
      body = (
        <>
          <B s={[w, 0.04, d]} p={[0, 0.02, 0]} m={MAT.stone} cast={false} />
          <B s={[w, 2.0, 0.02]} p={[0, 1.0, d / 2]} m={MAT.railGlass} cast={false} />
          <B s={[0.02, 2.0, d]} p={[-w / 2, 1.0, 0]} m={MAT.railGlass} cast={false} />
        </>
      );
      break;
    case 'bathtub':
      body = <B s={[w, 0.55, d]} p={[0, 0.275, 0]} m={MAT.white} />;
      break;
    case 'plant':
      body = <Plant h={h} w={w} />;
      break;
    case 'daybed':
      body = (
        <>
          <B s={[w, 0.3, d]} p={[0, 0.15, 0]} m={MAT.woodDark} />
          <B s={[w - 0.08, 0.14, d - 0.08]} p={[0, 0.37, 0]} m={MAT.fabric} />
        </>
      );
      break;
    case 'lamp':
      body = (
        <>
          <C r={0.16} h={0.03} p={[0, 0.015, 0]} m={MAT.metal} />
          <C r={0.015} h={h - 0.3} p={[0, (h - 0.3) / 2, 0]} m={MAT.metal} seg={6} />
          <C r={0.2} r2={0.24} h={0.3} p={[0, h - 0.15, 0]} m={MAT.lightWarm} />
        </>
      );
      break;
  }
  return <group>{body}</group>;
}
