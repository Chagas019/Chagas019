// SANTORAMA v2 — personagens no estilo flat/chibi com contorno grosso (linguagem do vídeo de referência).
// Um único boneco parametrizável garante consistência: Kolbe usa sempre o preset KOLBE_*.
// Caixa de desenho: viewBox 0 0 200 300, pés em y=300, centro x=100.
import React from 'react';
import {random, useCurrentFrame} from 'remotion';

export const OUT = '#2B1B14'; // cor do contorno da série
const SW = 5; // espessura do contorno

export type Outfit = 'habito' | 'listrado' | 'guarda' | 'civil';
export type Arms = 'down' | 'pray' | 'face' | 'open' | 'point';
export type ChibiProps = {
  outfit: Outfit;
  hair?: 'kolbe' | 'raspado' | 'curto' | 'none';
  cap?: 'listrado' | 'capacete' | null;
  glasses?: boolean;
  skin?: string;
  expression?: 'sereno' | 'gentil' | 'determinado' | 'triste' | 'choro' | 'serio';
  arms?: Arms;
  walk?: number; // fase do caminhar em radianos (0 = parado)
  eyesClosed?: boolean;
  gaze?: number; // -1..1
  number?: string; // número no peito
  seed?: string;
  shake?: number;
  x?: number; y?: number; h?: number; // posição do pé e altura em px quando usado dentro de <svg>
  flip?: boolean;
  halo?: number;
  opacity?: number;
};

export const KOLBE_HABITO: Partial<ChibiProps> = {outfit: 'habito', hair: 'kolbe', glasses: true, seed: 'kolbe'};
export const KOLBE_PRISIONEIRO: Partial<ChibiProps> = {outfit: 'listrado', hair: 'raspado', glasses: true, number: '16670', seed: 'kolbe'};

function blink(frame: number, seed: string) {
  let t = 0;
  for (let i = 0; i < 300 && t < frame + 10; i++) {
    const s = t + 70 + random(`${seed}b${i}`) * 90;
    if (frame >= s && frame < s + 5) return true;
    t = s;
  }
  return false;
}

export const Chibi: React.FC<ChibiProps> = (p) => {
  const frame = useCurrentFrame();
  const {
    outfit, hair = 'curto', cap = null, glasses = false, skin = '#F2C39B', expression = 'sereno', arms = 'down',
    walk = 0, eyesClosed = false, gaze = 0, number, seed = 'c', shake = 0, x = 0, y = 0, h = 300, flip, halo = 0, opacity = 1,
  } = p;
  const s = h / 300;
  const bob = walk ? Math.abs(Math.sin(walk)) * -6 : Math.sin(frame / 22 + seed.length) * 1.5;
  const sh = shake ? Math.sin(frame * 1.3) * shake : 0;
  const leg = walk ? Math.sin(walk) * 14 : 0;
  const closed = eyesClosed || blink(frame, seed);
  const shade = '#D9996F';
  const cloth = {habito: '#3A2F2A', listrado: '#DCD6C6', guarda: '#5A604F', civil: '#6B4A35'}[outfit];
  const clothShade = {habito: '#28201C', listrado: '#B9B2A1', guarda: '#464B3D', civil: '#523726'}[outfit];
  const stripe = '#56677D';
  const ex = gaze * 4;
  const mouth = {
    sereno: 'M90,128 Q100,134 110,128', gentil: 'M88,126 Q100,138 112,126', determinado: 'M90,130 L110,130',
    triste: 'M90,132 Q100,126 110,132', choro: 'M88,134 Q100,122 112,134', serio: 'M91,131 Q100,129 109,131',
  }[expression];
  const brow = expression === 'triste' || expression === 'choro' ? 'sad' : expression === 'determinado' || expression === 'serio' ? 'flat' : 'soft';
  const id = `ch${seed}`;

  const Arm = ({side}: {side: 1 | -1}) => {
    const sx = 100 + side * 50;
    const swing = walk ? -side * Math.sin(walk) * 16 : 0;
    let d: string, hand: [number, number];
    if (arms === 'pray') { d = `M${sx},178 Q${100 + side * 40},215 ${100 + side * 8},200`; hand = [100 + side * 6, 198]; }
    else if (arms === 'face') { d = `M${sx},178 Q${100 + side * 56},150 ${100 + side * 26},118`; hand = [100 + side * 24, 114]; }
    else if (arms === 'open') { d = `M${sx},178 Q${100 + side * 78},200 ${100 + side * 82},222`; hand = [100 + side * 82, 226]; }
    else if (arms === 'point' && side === 1) { d = `M${sx},178 Q${180},176 ${196},170`; hand = [198, 170]; }
    else { d = `M${sx},178 Q${100 + side * 60 + swing * 0.3},210 ${100 + side * 58 + swing},236`; hand = [100 + side * 58 + swing, 240]; }
    return (
      <g>
        <path d={d} stroke={OUT} strokeWidth={22} fill="none" strokeLinecap="round" />
        <path d={d} stroke={outfit === 'listrado' ? '#CFC8B6' : cloth} strokeWidth={13} fill="none" strokeLinecap="round" />
        <circle cx={hand[0]} cy={hand[1]} r={10} fill={skin} stroke={OUT} strokeWidth={4} />
      </g>
    );
  };

  return (
    <g transform={`translate(${x + sh} ${y}) scale(${flip ? -s : s} ${s}) translate(-100 -300)`} opacity={opacity}>
      <defs>
        <pattern id={`${id}st`} width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill={cloth} /><rect width="9" height="22" fill={stripe} /></pattern>
        <clipPath id={`${id}headc`}><ellipse cx={100} cy={92} rx={62} ry={58} /></clipPath>
      </defs>
      {halo > 0 && (
        <g opacity={halo}>
          <circle cx={100} cy={88} r={84} fill="#FFE29A" opacity={0.35} />
          <circle cx={100} cy={88} r={78} fill="none" stroke="#E9B44C" strokeWidth={7} />
          <circle cx={100} cy={88} r={78} fill="none" stroke={OUT} strokeWidth={2} opacity={0.6} />
        </g>
      )}
      {/* sombra no chão */}
      <ellipse cx={100} cy={298} rx={52} ry={7} fill="#000" opacity={0.18} />
      <g transform={`translate(0 ${bob})`}>
        {/* pernas */}
        {outfit !== 'habito' ? (
          <g>
            <path d={`M82,250 L${80 + leg},290`} stroke={OUT} strokeWidth={22} strokeLinecap="round" />
            <path d={`M118,250 L${120 - leg},290`} stroke={OUT} strokeWidth={22} strokeLinecap="round" />
            <path d={`M82,250 L${80 + leg},288`} stroke={outfit === 'listrado' ? `url(#${id}st)` : clothShade} strokeWidth={13} strokeLinecap="round" />
            <path d={`M118,250 L${120 - leg},288`} stroke={outfit === 'listrado' ? `url(#${id}st)` : clothShade} strokeWidth={13} strokeLinecap="round" />
            <ellipse cx={78 + leg} cy={294} rx={14} ry={7} fill={outfit === 'guarda' ? '#1E1E1C' : '#6A4A32'} stroke={OUT} strokeWidth={4} />
            <ellipse cx={122 - leg} cy={294} rx={14} ry={7} fill={outfit === 'guarda' ? '#1E1E1C' : '#6A4A32'} stroke={OUT} strokeWidth={4} />
          </g>
        ) : (
          <g>
            <ellipse cx={84 + leg * 0.6} cy={294} rx={13} ry={6} fill="#8A5A3A" stroke={OUT} strokeWidth={4} />
            <ellipse cx={116 - leg * 0.6} cy={294} rx={13} ry={6} fill="#8A5A3A" stroke={OUT} strokeWidth={4} />
          </g>
        )}
        {/* tronco */}
        <path d={outfit === 'habito' ? 'M58,170 Q100,150 142,170 L152,290 Q100,298 48,290 Z' : 'M56,170 Q100,152 144,170 L148,258 Q100,266 52,258 Z'}
          fill={outfit === 'listrado' ? `url(#${id}st)` : cloth} stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
        <path d={outfit === 'habito' ? 'M128,176 L138,288 Q120,292 112,292 Z' : 'M130,176 L136,256 Q124,260 116,260 Z'} fill={clothShade} opacity={0.6} />
        {outfit === 'habito' && (
          <g>
            {/* capuz/mozeta */}
            <path d="M54,176 Q100,146 146,176 Q150,206 100,212 Q50,206 54,176 Z" fill="#2E2521" stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
            {/* cordão branco com 3 nós */}
            <path d="M60,236 Q100,246 140,236" stroke="#F1E9D8" strokeWidth={6} fill="none" />
            <path d="M126,240 L130,286" stroke="#F1E9D8" strokeWidth={6} />
            {[254, 266, 278].map((yy) => <circle key={yy} cx={128 + (yy - 240) * 0.08} cy={yy} r={5} fill="#F1E9D8" stroke={OUT} strokeWidth={2} />)}
          </g>
        )}
        {outfit === 'listrado' && (
          <g>
            <path d="M84,166 L100,186 L116,166" fill="none" stroke={OUT} strokeWidth={4} strokeLinejoin="round" />
            {number && (
              <g transform="translate(110 192)">
                <polygon points="0,0 16,0 8,14" fill="#B5352A" stroke={OUT} strokeWidth={2} />
                <rect x={-2} y={17} width={30} height={11} fill="#F4F0E6" stroke={OUT} strokeWidth={2} />
                <text x={13} y={26} fontSize={8} fontWeight={700} textAnchor="middle" fontFamily="Liberation Sans, sans-serif" fill={OUT}>{number}</text>
              </g>
            )}
          </g>
        )}
        {outfit === 'guarda' && <path d="M56,222 L146,222" stroke={OUT} strokeWidth={8} />}
        <Arm side={-1} />
        <Arm side={1} />
        {/* cabeça */}
        <g>
          <circle cx={38} cy={100} r={12} fill={skin} stroke={OUT} strokeWidth={4} />
          <circle cx={162} cy={100} r={12} fill={skin} stroke={OUT} strokeWidth={4} />
          <ellipse cx={100} cy={92} rx={62} ry={58} fill={skin} />
          <g clipPath={`url(#${id}headc)`}>
            <ellipse cx={128} cy={118} rx={46} ry={40} fill={shade} opacity={0.45} />
            {hair === 'raspado' && <path d="M38,92 Q40,30 100,30 Q160,30 162,92 Q150,58 100,56 Q50,58 38,92 Z" fill="#8B6A55" opacity={0.35} />}
          </g>
          <ellipse cx={100} cy={92} rx={62} ry={58} fill="none" stroke={OUT} strokeWidth={SW} />
          {hair === 'kolbe' && (
            <path d="M38,96 Q30,40 92,30 Q150,24 164,88 Q156,62 132,56 Q110,52 92,58 Q70,48 56,62 Q44,74 38,96 Z" fill="#4A2E1F" stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
          )}
          {hair === 'curto' && (
            <path d="M38,92 Q36,34 100,30 Q164,34 162,92 Q150,60 100,58 Q50,60 38,92 Z" fill="#3D2A1E" stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
          )}
          {cap === 'listrado' && (
            <g><path d="M40,72 Q44,26 100,24 Q156,26 160,72 Z" fill={`url(#${id}st)`} stroke={OUT} strokeWidth={SW} strokeLinejoin="round" /></g>
          )}
          {cap === 'capacete' && (
            <path d="M30,80 Q34,16 100,14 Q166,16 170,80 L180,86 Q100,74 20,86 Z" fill="#4A5040" stroke={OUT} strokeWidth={SW} strokeLinejoin="round" />
          )}
          {/* sobrancelhas */}
          {brow === 'sad' && <g stroke={OUT} strokeWidth={4} strokeLinecap="round"><path d="M70,80 L86,74" /><path d="M114,74 L130,80" /></g>}
          {brow === 'flat' && <g stroke={OUT} strokeWidth={4.5} strokeLinecap="round"><path d="M70,77 L88,78" /><path d="M112,78 L130,77" /></g>}
          {brow === 'soft' && <g stroke={OUT} strokeWidth={4} strokeLinecap="round" fill="none"><path d="M70,78 Q78,72 87,76" /><path d="M113,76 Q122,72 130,78" /></g>}
          {/* olhos */}
          {closed ? (
            <g stroke={OUT} strokeWidth={4} strokeLinecap="round" fill="none"><path d="M70,98 Q78,104 86,98" /><path d="M114,98 Q122,104 130,98" /></g>
          ) : (
            <g>
              <ellipse cx={78 + ex} cy={98} rx={6} ry={8} fill={OUT} />
              <ellipse cx={122 + ex} cy={98} rx={6} ry={8} fill={OUT} />
              <circle cx={80 + ex} cy={95} r={2.2} fill="#fff" />
              <circle cx={124 + ex} cy={95} r={2.2} fill="#fff" />
            </g>
          )}
          {expression === 'choro' && !closed && (
            <g fill="#8FC3E8" stroke={OUT} strokeWidth={2}>
              <path d={`M74,${110 + (frame % 30) * 0.8} q4,8 0,12 q-4,-4 0,-12 Z`} />
              <path d={`M126,${110 + ((frame + 15) % 30) * 0.8} q4,8 0,12 q-4,-4 0,-12 Z`} />
            </g>
          )}
          {/* óculos redondos */}
          {glasses && (
            <g fill="#ffffff" fillOpacity={0.12} stroke={OUT} strokeWidth={3.5}>
              <circle cx={78} cy={98} r={16} />
              <circle cx={122} cy={98} r={16} />
              <path d="M94,97 Q100,92 106,97" fill="none" />
              <path d="M62,96 L44,92 M138,96 L156,92" fill="none" />
            </g>
          )}
          {/* nariz, bochechas, boca */}
          <path d="M100,106 Q104,114 99,116" stroke={OUT} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7} />
          <ellipse cx={66} cy={118} rx={9} ry={5} fill="#E8846A" opacity={0.35} />
          <ellipse cx={134} cy={118} rx={9} ry={5} fill="#E8846A" opacity={0.35} />
          <path d={mouth} stroke={OUT} strokeWidth={4} fill="none" strokeLinecap="round" />
        </g>
      </g>
    </g>
  );
};

/** Brilho de 4 pontas (assinatura visual para coisas sagradas/preciosas). */
export const Sparkle: React.FC<{x: number; y: number; r: number; phase?: number}> = ({x, y, r, phase = 0}) => {
  const frame = useCurrentFrame();
  const k = Math.max(0, Math.sin(frame / 9 + phase));
  if (k < 0.05) return null;
  const R = r * k;
  return (
    <path transform={`translate(${x} ${y}) rotate(${frame * 2 + phase * 40})`}
      d={`M0,${-R} Q${R * 0.15},${-R * 0.15} ${R},0 Q${R * 0.15},${R * 0.15} 0,${R} Q${-R * 0.15},${R * 0.15} ${-R},0 Q${-R * 0.15},${-R * 0.15} 0,${-R} Z`}
      fill="#FFFFFF" />
  );
};
