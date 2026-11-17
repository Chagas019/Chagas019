// Figuras de corpo inteiro (silhuetas pintadas) — prisioneiros, guardas, e Kolbe em plano aberto.
// Representação respeitosa: sem violência gráfica e sem símbolos de ódio.
import React from 'react';
import {useCurrentFrame} from 'remotion';

export type FigureProps = {
  kind: 'prisioneiro' | 'guarda' | 'kolbe' | 'pai';
  x: number; y: number; h: number; // pé em (x,y), altura em px
  walk?: number; // fase do caminhar (0 = parado)
  sway?: number; seed?: number; rim?: string; tone?: string; flip?: boolean;
  grief?: number; // 0..1 (pai de família: mãos no rosto, ombros curvados)
  glint?: number; // brilho nos óculos (kolbe)
  opacity?: number;
};

export const Figure: React.FC<FigureProps> = ({kind, x, y, h, walk = 0, sway = 1, seed = 0, rim = '#c9d6e6', tone, flip, grief = 0, glint = 0, opacity = 1}) => {
  const frame = useCurrentFrame();
  const s = h / 600;
  const idle = Math.sin((frame + seed * 37) / (28 + (seed % 5) * 3)) * sway;
  const lg = Math.sin(walk) * 22, bob = Math.abs(Math.cos(walk)) * 6 * (walk ? 1 : 0);
  const shake = grief ? Math.sin(frame * 0.9 + seed) * 2.2 * grief : 0;
  const isPris = kind !== 'guarda';
  const body = tone ?? (kind === 'guarda' ? '#1c1d1a' : '#3b4049');
  const stripe = '#6c7480';
  const bend = grief * 14;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} opacity={opacity}>
      <g transform={`translate(${shake} ${-bob + idle * 0.6})`}>
        {/* pernas */}
        <g fill={body}>
          <path d={`M-30,330 L${-34 + lg},590 L${-6 + lg},590 L4,340 Z`} />
          <path d={`M-4,340 L${8 - lg},590 L${36 - lg},590 L32,330 Z`} />
        </g>
        {kind === 'guarda' && <g fill="#0d0d0c"><rect x={-38 + lg} y={520} width={34} height={72} rx={6} /><rect x={4 - lg} y={520} width={34} height={72} rx={6} /></g>}
        {/* tronco */}
        <g transform={`rotate(${bend} 0 330)`}>
          <path d={kind === 'guarda'
            ? 'M-58,120 C-62,200 -60,300 -50,360 L50,360 C60,300 62,200 58,120 C40,104 -40,104 -58,120 Z'
            : 'M-52,124 C-58,200 -54,290 -46,350 L46,350 C54,290 58,200 52,124 C36,110 -36,110 -52,124 Z'} fill={body} />
          {isPris && [-36, -14, 8, 30].map((sx) => <rect key={sx} x={sx} y={118} width={10} height={232} fill={stripe} opacity={0.75} />)}
          {kind === 'guarda' && <path d="M-50,236 L50,236" stroke="#0a0a09" strokeWidth={12} />}
          {/* braços */}
          {grief > 0 ? (
            <g fill={body}>
              <path d={`M-50,130 C-70,170 -40,${110 - bend} -14,${80 - bend} L-2,${96 - bend} C-24,${130 - bend} -40,190 -30,200 Z`} />
              <path d={`M50,130 C70,170 40,${110 - bend} 14,${80 - bend} L2,${96 - bend} C24,${130 - bend} 40,190 30,200 Z`} />
            </g>
          ) : (
            <g fill={body}>
              <path d={`M-52,128 C${-70 - lg * 0.3},200 ${-66 - lg * 0.5},260 ${-60 - lg * 0.6},300 L${-44 - lg * 0.6},300 C-46,250 -40,190 -36,140 Z`} />
              <path d={`M52,128 C${70 + lg * 0.3},200 ${66 + lg * 0.5},260 ${60 + lg * 0.6},300 L${44 + lg * 0.6},300 C46,250 40,190 36,140 Z`} />
            </g>
          )}
          {/* cabeça */}
          <g transform={`translate(0 ${bend * 1.4}) rotate(${grief * 18})`}>
            <rect x={-12} y={84} width={24} height={30} fill={kind === 'guarda' ? body : '#7a5a46'} />
            <ellipse cx={0} cy={62} rx={30} ry={36} fill={kind === 'guarda' ? '#3a2e26' : '#8a654f'} />
            {kind === 'guarda' && <path d="M-40,58 C-40,10 40,10 40,58 L48,64 L-48,64 Z" fill="#1b1c19" />}
            {(kind === 'prisioneiro' || kind === 'pai') && <path d="M-31,46 C-28,20 28,20 31,46 Z" fill="#59616c" />}
            {kind === 'kolbe' && (
              <g>
                <circle cx={-11} cy={60} r={8} fill="none" stroke="#d9c08a" strokeWidth={2.4} />
                <circle cx={11} cy={60} r={8} fill="none" stroke="#d9c08a" strokeWidth={2.4} />
                <circle cx={13} cy={57} r={3 + glint * 4} fill="#fff7dc" opacity={glint} />
              </g>
            )}
          </g>
          {grief > 0 && <g fill="#8a654f"><ellipse cx={-14} cy={70 + bend * 1.4} rx={11} ry={15} /><ellipse cx={14} cy={70 + bend * 1.4} rx={11} ry={15} /></g>}
        </g>
        {/* luz de recorte */}
        <path d="M54,124 C60,200 58,300 48,360 M30,60 C32,40 22,30 10,28" stroke={rim} strokeWidth={5} opacity={0.4} fill="none" />
      </g>
    </g>
  );
};
