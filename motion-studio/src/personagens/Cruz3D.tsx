// Cruz latina 3D (@remotion/three). Dono: agente PERSONAGENS.
// Geometria: ExtrudeGeometry com chanfro (arestas captam a luz de recorte). Proporções clássicas:
// braço horizontal = 2/3 da altura; braço superior = braços laterais.
// Rotação/drift = função do frame (sem useFrame). `luz` 0..1 "acende" o recorte âmbar.
import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {interpolate, Easing, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';

export type MaterialCruz = 'pedra' | 'madeira' | 'ouro';

const MATERIAIS: Record<MaterialCruz, {cor: string; rugosidade: number; metal: number}> = {
  pedra: {cor: '#CFC5B3', rugosidade: 0.88, metal: 0},
  madeira: {cor: '#C2A27A', rugosidade: 0.78, metal: 0},
  ouro: {cor: '#C9A45C', rugosidade: 0.42, metal: 0.85},
};

export type Cruz3DProps = {
  /** Largura/altura do canvas em px (obrigatórios no ThreeCanvas). */
  largura: number;
  altura: number;
  material?: MaterialCruz;
  /** Sobrescreve a cor base do material. */
  cor?: string;
  /** Cor do recorte (âmbar). */
  corLuz?: string;
  /** Intensidade da luz de recorte 0..1.5 (anime para "acender"). */
  luz?: number;
  /** Luz frontal de preenchimento 0..1 (0 = só silhueta recortada). */
  preenchimento?: number;
  /** Brilho próprio (emissivo) 0..1 — para o clímax. */
  emissivo?: number;
  /** Rotação base em Y (graus) e amplitude da oscilação lenta (graus). */
  rotacaoY?: number;
  oscilacao?: number;
  /** Período da oscilação/drift em segundos. */
  periodo?: number;
  /** Deriva vertical (unidades de cena; 0.05 ≈ sutil). */
  deriva?: number;
  /** Escala da cruz no quadro (1 ≈ ocupa ~70% da altura). */
  escala?: number;
  /** Frame local de entrada (sobe da escuridão + leve aproximação). */
  entradaEm?: number;
  duracaoEntrada?: number;
};

/** Contorno 2D da cruz latina centrada (altura 3). */
const formaCruz = () => {
  const H = 3;
  const W = 2;
  const e = 0.3; // espessura das hastes
  const yBarra = 0.5; // centro do braço horizontal (braço superior = braços laterais)
  const s = new THREE.Shape();
  const t = H / 2;
  const by0 = yBarra - e / 2;
  const by1 = yBarra + e / 2;
  const h = e / 2;
  s.moveTo(-h, -t);
  s.lineTo(h, -t);
  s.lineTo(h, by0);
  s.lineTo(W / 2, by0);
  s.lineTo(W / 2, by1);
  s.lineTo(h, by1);
  s.lineTo(h, t);
  s.lineTo(-h, t);
  s.lineTo(-h, by1);
  s.lineTo(-W / 2, by1);
  s.lineTo(-W / 2, by0);
  s.lineTo(-h, by0);
  s.closePath();
  return s;
};

const CruzMesh: React.FC<{cor: string; rug: number; metal: number; emissivo: number; corLuz: string; rot: [number, number, number]; pos: [number, number, number]; escala: number}> = ({
  cor,
  rug,
  metal,
  emissivo,
  corLuz,
  rot,
  pos,
  escala,
}) => {
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(formaCruz(), {
      depth: 0.26,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.03,
      bevelSegments: 3,
      curveSegments: 4,
    });
    g.center();
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} rotation={rot} position={pos} scale={escala}>
      <meshStandardMaterial color={cor} roughness={rug} metalness={metal} emissive={corLuz} emissiveIntensity={emissivo} />
    </mesh>
  );
};

export const Cruz3D: React.FC<Cruz3DProps> = ({
  largura,
  altura,
  material = 'pedra',
  cor,
  corLuz = '#FFB24A',
  luz = 1,
  preenchimento = 0.25,
  emissivo = 0,
  rotacaoY = -14,
  oscilacao = 6,
  periodo = 9,
  deriva = 0.05,
  escala = 1,
  entradaEm = 0,
  duracaoEntrada = 90,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = MATERIAIS[material];
  const t = (frame - entradaEm) / fps;
  const w = (Math.PI * 2) / periodo;
  const ent = interpolate(frame, [entradaEm, entradaEm + duracaoEntrada], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const ry = ((rotacaoY + oscilacao * Math.sin(t * w)) * Math.PI) / 180;
  const rx = ((1.5 * Math.sin(t * w * 0.7 + 1.1)) * Math.PI) / 180;
  const y = deriva * Math.sin(t * w * 1.3) - 0.25 * (1 - ent);
  const z = -0.6 * (1 - ent);
  const L = Math.max(0, luz) * ent;
  const aspecto = largura / altura;

  return (
    <ThreeCanvas width={largura} height={altura} camera={{position: [0, 0, 6], fov: 38}} style={{opacity: ent}}>
      <ambientLight intensity={0.04 + 0.05 * preenchimento} color="#9FB3D9" />
      {/* preenchimento frontal quente e fraco */}
      <directionalLight position={[1.5, 1, 5]} intensity={1.6 * preenchimento} color="#FFE2B3" />
      {/* recortes âmbar: atrás-esquerda e atrás-direita (desenham as arestas chanfradas) */}
      <directionalLight position={[-4, 2.5, -3.5]} intensity={5.5 * L} color={corLuz} />
      <directionalLight position={[4.5, 1.5, -3]} intensity={4.2 * L} color={corLuz} />
      {/* contraluz alto (topo das hastes) */}
      <directionalLight position={[0.5, 6, -2]} intensity={2.8 * L} color="#FFF4DE" />
      {/* bounce frio de baixo (profundidade) */}
      <pointLight position={[0, -4, 3]} intensity={6 * (0.3 + preenchimento)} color="#2B4A72" />
      <CruzMesh
        cor={cor ?? m.cor}
        rug={m.rugosidade}
        metal={m.metal}
        emissivo={emissivo * ent}
        corLuz={corLuz}
        rot={[rx, ry, 0]}
        pos={[0, y, z]}
        escala={escala * Math.min(1, aspecto * 1.6)}
      />
    </ThreeCanvas>
  );
};
