// Personagem 2D vetorial (mascote "Pixo") com entrada, flutuação, rotação, piscar e sombra. Dono: agente PERSONAGENS.
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {flutuar, piscando, quique} from './movimentos';

type Props = {
  tamanho: number;
  corCorpo: string;
  corBrilho: string;
  entradaEm?: number;
  /** Graus por segundo de rotação lenta. */
  rotacao?: number;
  olharX?: number;
};

export const Mascote: React.FC<Props> = ({tamanho, corCorpo, corBrilho, entradaEm = 0, rotacao = 0, olharX = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const q = quique(frame, fps, entradaEm, tamanho * 2.2);
  const f = q.visivel ? flutuar(frame - entradaEm, tamanho * 0.04, 110) : 0;
  const y = q.y + f;
  const altura = Math.max(0, -y);
  const sombraEscala = Math.max(0.35, 1 - altura / (tamanho * 2.4));
  const rot = Math.sin(frame / 90) * 4 + (rotacao * frame) / fps;
  const olho = piscando(frame + entradaEm);
  if (!q.visivel) return null;
  return (
    <div style={{position: 'relative', width: tamanho, height: tamanho * 1.25}}>
      {/* sombra de contato */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 0,
          width: tamanho * 0.8,
          height: tamanho * 0.12,
          transform: `translateX(-50%) scale(${sombraEscala})`,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, transparent 70%)',
          filter: 'blur(4px)',
        }}
      />
      <svg
        viewBox="0 0 200 200"
        width={tamanho}
        height={tamanho}
        style={{
          position: 'absolute',
          left: 0,
          bottom: tamanho * 0.08,
          transform: `translateY(${y}px) rotate(${rot}deg) scale(${1 + q.squash}, ${1 - q.squash})`,
          transformOrigin: '50% 100%',
          overflow: 'visible',
        }}
      >
        <defs>
          <radialGradient id="corpo" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={corBrilho} />
            <stop offset="100%" stopColor={corCorpo} />
          </radialGradient>
        </defs>
        <path d="M100 12 C155 12 188 55 188 108 C188 160 150 190 100 190 C50 190 12 160 12 108 C12 55 45 12 100 12 Z" fill="url(#corpo)" />
        {/* brilho especular para profundidade */}
        <ellipse cx="68" cy="52" rx="26" ry="14" fill="white" opacity="0.35" transform="rotate(-25 68 52)" />
        {/* olhos */}
        {[72, 128].map((cx) => (
          <g key={cx} transform={`translate(${cx + olharX * 6} 102) scale(1 ${olho})`}>
            <ellipse rx="15" ry="20" fill="white" />
            <circle cx={olharX * 4} cy="3" r="9" fill="#120F2A" />
            <circle cx={olharX * 4 + 3} cy="-2" r="3" fill="white" />
          </g>
        ))}
        <path d="M84 142 Q100 156 116 142" stroke="#120F2A" strokeWidth="6" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
};
