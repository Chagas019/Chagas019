// Cenários flat reutilizáveis (contorno grosso, cores chapadas) — linguagem v2.
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {OUT} from '../../characters/Chibi';

export const SW = 6;

export const Stars: React.FC<{n?: number; h?: number}> = ({n = 70, h = 1100}) => {
  const frame = useCurrentFrame();
  return (
    <g>
      {Array.from({length: n}, (_, i) => {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(frame / (14 + (i % 7) * 3) + i));
        return <circle key={i} cx={random(`sx${i}`) * 1300 - 110} cy={random(`sy${i}`) * h} r={1.5 + random(`sr${i}`) * 2.5} fill="#F6EFD9" opacity={tw} />;
      })}
    </g>
  );
};

/** Parede de tijolos com contorno. */
export const Bricks: React.FC<{x: number; y: number; w: number; h: number; fill?: string; line?: string; bw?: number; bh?: number}> = ({x, y, w, h, fill = '#A3412F', line = '#7C2E21', bw = 70, bh = 30}) => {
  const rows = Math.ceil(h / bh);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} />
      {Array.from({length: rows}, (_, r) => (
        <g key={r}>
          <line x1={x} y1={y + r * bh} x2={x + w} y2={y + r * bh} stroke={line} strokeWidth={3} />
          {Array.from({length: Math.ceil(w / bw) + 1}, (_, c) => {
            const bx = x + c * bw + (r % 2 ? bw / 2 : 0);
            return bx < x + w ? <line key={c} x1={bx} y1={y + r * bh} x2={bx} y2={Math.min(y + h, y + (r + 1) * bh)} stroke={line} strokeWidth={3} /> : null;
          })}
        </g>
      ))}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={OUT} strokeWidth={SW} />
    </g>
  );
};

/** Bloco de alojamento de tijolos (estilo dos blocos de Auschwitz I). */
export const Barrack: React.FC<{x: number; y: number; w: number; h: number; lit?: boolean}> = ({x, y, w, h, lit}) => (
  <g>
    <path d={`M${x - 20},${y} L${x + w / 2},${y - h * 0.28} L${x + w + 20},${y} Z`} fill="#6B2A20" stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
    <Bricks x={x} y={y} w={w} h={h} />
    {Array.from({length: Math.floor(w / 110)}, (_, i) => (
      <g key={i}>
        <rect x={x + 30 + i * 110} y={y + h * 0.25} width={56} height={70} fill={lit ? '#F2C766' : '#2B2320'} stroke={OUT} strokeWidth={5} />
        <line x1={x + 58 + i * 110} y1={y + h * 0.25} x2={x + 58 + i * 110} y2={y + h * 0.25 + 70} stroke={OUT} strokeWidth={4} />
      </g>
    ))}
  </g>
);

/** Poste de concreto curvo com lâmpada. */
export const FencePost: React.FC<{x: number; y: number; s?: number; lamp?: boolean; side?: 1 | -1}> = ({x, y, s = 1, lamp = true, side = 1}) => {
  const frame = useCurrentFrame();
  const fl = 0.85 + 0.15 * Math.sin(frame / 3 + x);
  return (
    <g transform={`translate(${x} ${y}) scale(${s * side} ${s})`}>
      {lamp && <circle cx={-52} cy={-388} r={70} fill="#F7D57A" opacity={0.22 * fl} />}
      <path d="M-14,0 L-14,-360 Q-14,-420 -60,-410 L-60,-392 Q-26,-396 14,-360 L14,0 Z" fill="#CFC6B4" stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
      {lamp && <g><path d="M-74,-392 L-46,-392 L-50,-374 L-70,-374 Z" fill="#3B3430" stroke={OUT} strokeWidth={4} /><circle cx={-60} cy={-370} r={9} fill="#FFE9A8" stroke={OUT} strokeWidth={3} opacity={fl} /></g>}
      {[-300, -230, -160, -90].map((yy) => <circle key={yy} cx={0} cy={yy} r={4} fill={OUT} />)}
    </g>
  );
};

export const BarbedWire: React.FC<{x1: number; x2: number; y: number; sag?: number}> = ({x1, x2, y, sag = 12}) => (
  <g>
    <path d={`M${x1},${y} Q${(x1 + x2) / 2},${y + sag} ${x2},${y}`} stroke={OUT} strokeWidth={3} fill="none" />
    {Array.from({length: Math.floor((x2 - x1) / 40)}, (_, i) => {
      const px = x1 + 20 + i * 40, t = (px - x1) / (x2 - x1), py = y + 4 * sag * t * (1 - t);
      return <path key={i} d={`M${px - 6},${py - 6} L${px + 6},${py + 6} M${px + 6},${py - 6} L${px - 6},${py + 6}`} stroke={OUT} strokeWidth={3} />;
    })}
  </g>
);

export const Tower: React.FC<{x: number; y: number; s?: number; beam?: number}> = ({x, y, s = 1, beam}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {beam !== undefined && <polygon points={`0,-300 ${-380 + beam * 600},420 ${-200 + beam * 600},420`} fill="#FFF3C8" opacity={0.16} />}
    <path d="M-60,0 L-36,-260 M60,0 L36,-260 M-50,-90 L50,-170 M50,-90 L-50,-170" stroke={OUT} strokeWidth={10} strokeLinecap="round" />
    <path d="M-60,0 L-36,-260 M60,0 L36,-260" stroke="#6E5444" strokeWidth={5} strokeLinecap="round" />
    <rect x={-62} y={-330} width={124} height={74} fill="#6E5444" stroke={OUT} strokeWidth={SW} />
    <rect x={-44} y={-318} width={88} height={34} fill="#F2C766" stroke={OUT} strokeWidth={4} />
    <path d="M-86,-326 L0,-386 L86,-326 Z" fill="#4A372C" stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
  </g>
);

/** Fundo "sunburst" (raios alternados girando) — clássico da animação flat. */
export const Sunburst: React.FC<{cx: number; cy: number; a: string; b: string; n?: number; speed?: number}> = ({cx, cy, a, b, n = 24, speed = 0.15}) => {
  const frame = useCurrentFrame();
  return (
    <g>
      <rect x={-200} y={-200} width={1480} height={2320} fill={a} />
      {Array.from({length: n}, (_, i) => {
        const a0 = ((i * 2) / (n * 2)) * Math.PI * 2 + frame * speed * 0.01, a1 = a0 + Math.PI / n;
        return <path key={i} d={`M${cx},${cy} L${cx + Math.cos(a0) * 2400},${cy + Math.sin(a0) * 2400} L${cx + Math.cos(a1) * 2400},${cy + Math.sin(a1) * 2400} Z`} fill={b} />;
      })}
    </g>
  );
};

/** Nota musical (hinos no bunker). */
export const Note: React.FC<{x: number; y: number; s?: number; o?: number}> = ({x, y, s = 1, o = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
    <path d="M0,0 L0,-46 L26,-54 L26,-10" stroke="#FFE7A6" strokeWidth={5} fill="none" strokeLinejoin="round" />
    <ellipse cx={-7} cy={2} rx={10} ry={7} fill="#FFE7A6" />
    <ellipse cx={19} cy={-8} rx={10} ry={7} fill="#FFE7A6" />
  </g>
);
