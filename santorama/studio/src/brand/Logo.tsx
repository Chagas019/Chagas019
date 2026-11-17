// SANTORAMA — logotipo. Emblema: arco ogival (janela de igreja / moldura de cinema) com a cruz
// que irradia luz e um halo; o "S" entrelaçado como monograma. Animável via `p` (0..1).
import React from 'react';
import {C, F} from './tokens';

export const Emblem: React.FC<{size?: number; p?: number; glow?: number; mono?: boolean}> = ({size = 300, p = 1, glow = 1, mono = false}) => {
  const d = 1400;
  const st = (k: number) => Math.min(1, Math.max(0, (p - k) / 0.35));
  return (
    <svg viewBox="0 0 300 380" width={size} height={size * 380 / 300} style={{overflow: 'visible'}}>
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.ouroClaro} /><stop offset="0.5" stopColor={C.ouro} /><stop offset="1" stopColor={C.ocre} />
        </linearGradient>
        <radialGradient id="halo"><stop offset="0" stopColor={C.ouroClaro} stopOpacity={0.9} /><stop offset="0.5" stopColor={C.ouro} stopOpacity={0.25} /><stop offset="1" stopColor={C.ouro} stopOpacity={0} /></radialGradient>
        <filter id="eglow"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      {/* halo atrás da cruz */}
      <circle cx={150} cy={170} r={110} fill="url(#halo)" opacity={glow * st(0.35)} />
      {/* raios */}
      <g opacity={0.55 * st(0.45)}>
        {Array.from({length: 24}, (_, i) => (
          <line key={i} x1={150} y1={170} x2={150 + Math.cos((i / 24) * Math.PI * 2) * 98} y2={170 + Math.sin((i / 24) * Math.PI * 2) * 98} stroke={C.ouro} strokeWidth={i % 2 ? 1 : 2} />
        ))}
      </g>
      {/* arco ogival duplo */}
      <path d="M40,370 L40,170 Q40,40 150,10 Q260,40 260,170 L260,370" fill="none" stroke="url(#gold)" strokeWidth={8}
        strokeDasharray={d} strokeDashoffset={d * (1 - st(0))} strokeLinecap="round" />
      <path d="M62,370 L62,176 Q62,62 150,34 Q238,62 238,176 L238,370" fill="none" stroke="url(#gold)" strokeWidth={2.5}
        strokeDasharray={d} strokeDashoffset={d * (1 - st(0.1))} opacity={0.8} />
      {/* cruz */}
      <g opacity={st(0.3)} transform={`translate(150 170) scale(${0.8 + 0.2 * st(0.3)}) translate(-150 -170)`}>
        <rect x={142} y={88} width={16} height={190} rx={2} fill="url(#gold)" />
        <rect x={104} y={136} width={92} height={16} rx={2} fill="url(#gold)" />
        <rect x={142} y={88} width={16} height={190} rx={2} fill={C.ouroClaro} filter="url(#eglow)" opacity={0.5 * glow} />
      </g>
      {/* monograma S */}
      {mono && <text x={150} y={352} fontFamily={F.titulo} fontWeight={700} fontSize={64} textAnchor="middle" fill="url(#gold)" opacity={st(0.5)}>S</text>}
      {/* base */}
      <path d="M20,370 L280,370" stroke="url(#gold)" strokeWidth={4} strokeDasharray={300} strokeDashoffset={300 * (1 - st(0.2))} />
    </svg>
  );
};

export const Wordmark: React.FC<{size?: number; p?: number; slogan?: boolean; color?: string}> = ({size = 96, p = 1, slogan = true, color = C.pergaminho}) => {
  const letters = 'SANTORAMA'.split('');
  return (
    <div style={{textAlign: 'center'}}>
      <div style={{fontFamily: F.titulo, fontWeight: 700, fontSize: size, letterSpacing: size * 0.22, color, marginRight: -size * 0.22, whiteSpace: 'nowrap'}}>
        {letters.map((l, i) => {
          const k = Math.min(1, Math.max(0, p * 1.6 - i * 0.07));
          return <span key={i} style={{display: 'inline-block', opacity: k, transform: `translateY(${(1 - k) * 20}px)`, filter: `blur(${(1 - k) * 8}px)`}}>{l}</span>;
        })}
      </div>
      {slogan && (
        <div style={{opacity: Math.min(1, Math.max(0, p * 2 - 1)), marginTop: size * 0.18}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18}}>
            <div style={{height: 1.5, width: size * 1.3, background: `linear-gradient(90deg, transparent, ${C.ouro})`}} />
            <svg width={18} height={24} viewBox="0 0 18 24"><rect x={7} y={0} width={4} height={24} fill={C.ouro} /><rect x={0} y={6} width={18} height={4} fill={C.ouro} /></svg>
            <div style={{height: 1.5, width: size * 1.3, background: `linear-gradient(90deg, ${C.ouro}, transparent)`}} />
          </div>
          <div style={{fontFamily: F.serifa, fontStyle: 'italic', fontWeight: 600, fontSize: size * 0.4, color: C.ouroClaro, marginTop: size * 0.14}}>
            Histórias que inspiram.<br />Vidas que apontam para Cristo.
          </div>
        </div>
      )}
    </div>
  );
};
