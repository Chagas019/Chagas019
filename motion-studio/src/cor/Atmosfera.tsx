// Fundo vivo + grão cinematográfico + vinheta. Dono: agente COR. Determinístico (noise com seed fixa).
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import type {Paleta} from './tema';
import {gradientes} from './tema';

export const FundoVivo: React.FC<{paleta: Paleta; seed?: string}> = ({paleta, seed = 'estudio'}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const t = frame / 240;
  const blob = (id: string, cor: string, base: [number, number], tam: number) => {
    const x = base[0] + noise2D(`${seed}-${id}-x`, t, 0) * 0.12;
    const y = base[1] + noise2D(`${seed}-${id}-y`, 0, t) * 0.12;
    const s = Math.max(width, height) * tam;
    return (
      <div
        style={{
          position: 'absolute',
          left: x * width - s / 2,
          top: y * height - s / 2,
          width: s,
          height: s,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${cor} 0%, transparent 65%)`,
          opacity: 0.55,
        }}
      />
    );
  };
  return (
    <AbsoluteFill style={{background: gradientes(paleta).fundo, overflow: 'hidden'}}>
      {blob('a', paleta.primaria, [0.2, 0.25], 0.9)}
      {blob('b', paleta.secundaria, [0.85, 0.7], 0.8)}
      {blob('c', paleta.destaque, [0.5, 1.0], 0.6)}
    </AbsoluteFill>
  );
};

/** Grão de filme: feTurbulence com seed derivada do frame (reprodutível). */
export const Grao: React.FC<{intensidade?: number}> = ({intensidade = 0.07}) => {
  const frame = useCurrentFrame();
  const seed = (frame % 12) + 1;
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity: intensidade}}>
      <svg width="100%" height="100%">
        <filter id={`grao-${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grao-${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Vinheta: React.FC<{forca?: number}> = ({forca = 0.55}) => (
  <AbsoluteFill style={{pointerEvents: 'none', background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${forca}) 100%)`}} />
);
