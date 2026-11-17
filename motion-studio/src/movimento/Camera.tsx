// Câmera virtual com zoom/pan/rotação + camadas de parallax. Dono: agente MOVIMENTO.
import React, {createContext, useContext} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {curvas} from './curvas';

type Chave = {frame: number; zoom?: number; x?: number; y?: number; rot?: number};
type Estado = {zoom: number; x: number; y: number; rot: number};
const Ctx = createContext<Estado>({zoom: 1, x: 0, y: 0, rot: 0});

const valor = (frame: number, chaves: Chave[], k: keyof Omit<Chave, 'frame'>, pad: number) => {
  const pts = chaves.filter((c) => c[k] !== undefined);
  if (pts.length === 0) return pad;
  if (pts.length === 1) return pts[0][k] as number;
  return interpolate(frame, pts.map((p) => p.frame), pts.map((p) => p[k] as number), {
    easing: curvas.suave,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
};

/** Envolve a cena. As camadas <Camada> se deslocam conforme a profundidade. */
export const Camera: React.FC<{chaves: Chave[]; children: React.ReactNode}> = ({chaves, children}) => {
  const frame = useCurrentFrame();
  const e: Estado = {
    zoom: valor(frame, chaves, 'zoom', 1),
    x: valor(frame, chaves, 'x', 0),
    y: valor(frame, chaves, 'y', 0),
    rot: valor(frame, chaves, 'rot', 0),
  };
  return (
    <Ctx.Provider value={e}>
      <AbsoluteFill style={{transform: `scale(${e.zoom}) rotate(${e.rot}deg)`, transformOrigin: '50% 50%'}}>{children}</AbsoluteFill>
    </Ctx.Provider>
  );
};

/** profundidade 0 = fundo distante (quase parado), 1 = plano da câmera, >1 = primeiro plano. */
export const Camada: React.FC<{profundidade: number; children: React.ReactNode; style?: React.CSSProperties}> = ({profundidade, children, style}) => {
  const {x, y, zoom} = useContext(Ctx);
  const escalaExtra = 1 + (zoom - 1) * (profundidade - 1) * 0.5;
  return (
    <AbsoluteFill style={{transform: `translate(${-x * profundidade}px, ${-y * profundidade}px) scale(${escalaExtra})`, ...style}}>
      {children}
    </AbsoluteFill>
  );
};
