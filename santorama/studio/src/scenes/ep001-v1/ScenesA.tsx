// EP001 — cenas 1 a 5. Cada cena é um componente independente que recebe a própria duração
// (em frames) e eventos sincronizados com o som (segundos, relativos ao início da cena).
import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {C, F} from '../../brand/tokens';
import {Camera, easeOut, FilmFinish, Fog, H, Layer, LightRays, Particles, W} from '../../core/cinema';
import {Kolbe} from '../../characters/Kolbe';
import {Figure} from '../../characters/Figures';

export type SceneProps = {dur: number; ev: Record<string, number>; fps: number};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/* ---------- elementos de cenário compartilhados ---------- */
const NightSky: React.FC<{top?: string; bottom?: string; glow?: string}> = ({top = '#05070b', bottom = '#1d2530', glow = 'rgba(160,180,200,0.18)'}) => (
  <AbsoluteFill style={{background: `linear-gradient(180deg, ${top} 0%, ${bottom} 62%, #0b0d10 100%)`}}>
    <AbsoluteFill style={{background: `radial-gradient(ellipse 60% 22% at 50% 60%, ${glow}, transparent 70%)`}} />
  </AbsoluteFill>
);

/** Corredor de cercas: postes de concreto curvos com arame farpado em perspectiva. */
const FenceCorridor: React.FC<{lampOn?: number; cold?: boolean}> = ({lampOn = 1, cold = true}) => {
  const frame = useCurrentFrame();
  const hz = 1080, cx = W / 2;
  const posts = Array.from({length: 11}, (_, i) => i);
  const P = (i: number, side: number) => {
    const d = 1 / (1 + i * 0.42);
    return {x: cx + side * (560 * d + 40), base: hz + 820 * d, top: hz - 760 * d, d};
  };
  return (
    <svg width={W} height={H} style={{position: 'absolute'}}>
      <defs>
        <radialGradient id="lamp"><stop offset="0" stopColor="#FFE9B8" /><stop offset="0.25" stopColor="#F4C76E" stopOpacity={0.55} /><stop offset="1" stopColor="#F4C76E" stopOpacity={0} /></radialGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#151a20" /><stop offset="1" stopColor="#06080a" /></linearGradient>
      </defs>
      <path d={`M0,${hz} L${W},${hz} L${W},${H} L0,${H} Z`} fill="url(#ground)" />
      <path d={`M${cx - 30},${hz} L${cx + 30},${hz} L${W * 0.95},${H} L${W * 0.05},${H} Z`} fill="#1e242b" opacity={0.6} />
      {[-1, 1].map((side) => (
        <g key={side}>
          {[0.18, 0.36, 0.54, 0.72].map((h, k) => (
            <path key={k} d={posts.map((i, j) => { const p = P(i, side); const yy = p.base - (p.base - p.top) * h; return `${j ? 'L' : 'M'}${p.x},${yy}`; }).join(' ')}
              stroke="#4d545c" strokeWidth={2} fill="none" strokeDasharray="10 5" opacity={0.85} />
          ))}
          {posts.slice().reverse().map((i) => {
            const p = P(i, side), w = 34 * p.d, curl = 90 * p.d;
            const flick = 0.85 + 0.15 * Math.sin(frame / 3 + i * 7 + side);
            return (
              <g key={i}>
                <path d={`M${p.x - w / 2},${p.base} L${p.x - w / 2},${p.top} Q${p.x - w / 2},${p.top - curl} ${p.x - side * curl},${p.top - curl * 0.8} L${p.x - side * curl},${p.top - curl * 0.8 + w * 0.8} Q${p.x + w / 2},${p.top - curl * 0.5} ${p.x + w / 2},${p.top} L${p.x + w / 2},${p.base} Z`}
                  fill={cold ? '#2a3038' : '#2d2621'} />
                <path d={`M${p.x + side * -w / 2},${p.base} L${p.x + side * -w / 2},${p.top}`} stroke={cold ? '#8fa4b8' : '#c49a5a'} strokeWidth={3 * p.d} opacity={0.5} />
                <circle cx={p.x - side * curl} cy={p.top - curl * 0.8 + w * 1.4} r={120 * p.d} fill="url(#lamp)" opacity={lampOn * flick} />
                <circle cx={p.x - side * curl} cy={p.top - curl * 0.8 + w * 1.1} r={7 * p.d} fill="#FFF3D0" opacity={lampOn} />
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
};

const WatchTower: React.FC<{x: number; y: number; s?: number; beam?: number}> = ({x, y, s = 1, beam = 0}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {beam !== 0 && <polygon points={`0,-170 ${-520 + beam * 900},900 ${-260 + beam * 900},900`} fill="#d7e3ee" opacity={0.10} />}
    <path d="M-60,-150 L60,-150 L40,-120 L-40,-120 Z M-48,-120 L48,-120 L48,-60 L-48,-60 Z" fill="#11151a" />
    <path d="M-80,-160 L0,-210 L80,-160 Z" fill="#0c0f12" />
    <path d="M-40,-60 L-70,300 M40,-60 L70,300 M-55,60 L55,140 M55,60 L-55,140" stroke="#0e1216" strokeWidth={12} />
    <circle cx={0} cy={-150} r={10} fill="#e6eef6" />
  </g>
);

/* =================== CENA 1 — O GANCHO =================== */
export const S1Gancho: React.FC<SceneProps> = ({dur, fps}) => {
  const frame = useCurrentFrame();
  const beam = Math.sin(frame / 55) * 0.5;
  const tag = interpolate(frame, [8, 30, dur - 50, dur - 25], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <Camera kf={[{f: 0, x: 0, y: 40, z: 1.0}, {f: dur, x: 0, y: -10, z: 1.42}]} shake={1.2}>
        <Layer depth={0.05}><NightSky /></Layer>
        <Layer depth={0.15}>
          <svg width={W} height={H} style={{position: 'absolute'}}>
            <WatchTower x={250} y={1000} s={0.9} beam={beam} />
            <WatchTower x={860} y={990} s={0.7} />
          </svg>
        </Layer>
        <Layer depth={0.35}><Fog color="#8b9aab" opacity={0.22} y={1050} seed={1} /></Layer>
        <Layer depth={0.7}><FenceCorridor /></Layer>
        <Layer depth={0.9}><Fog color="#a9b6c4" opacity={0.18} y={1500} seed={2} speed={1.1} /></Layer>
        <Layer depth={1.2}><Particles n={70} seed="ash" color="#cfd6de" size={[1.5, 4]} rise={false} speed={0.9} glow={false} opacity={0.55} drift={50} /></Layer>
        <Layer depth={1.6} style={{opacity: 0.8}}>
          <svg width={W} height={H} style={{position: 'absolute'}}>
            {[0, 1].map((k) => (
              <path key={k} d={`M-40,${1720 + k * 70} ${Array.from({length: 13}, (_, i) => `L${i * 95},${1720 + k * 70 + (i % 2 ? 8 : -8)} l10,-16 l-10,16 l10,16 l-10,-16`).join(' ')}`} stroke="#2a3138" strokeWidth={6} fill="none" />
            ))}
          </svg>
        </Layer>
      </Camera>
      <AbsoluteFill style={{alignItems: 'center', top: 160, opacity: tag}}>
        <div style={{fontFamily: F.titulo, color: C.ouro, fontSize: 30, letterSpacing: 12}}>SANTORAMA · EPISÓDIO 001</div>
        <div style={{width: 120, height: 1.5, background: C.ouro, marginTop: 18, opacity: 0.7}} />
      </AbsoluteFill>
      <FilmFinish vignette={0.85} tint="rgba(70,100,140,0.25)" />
    </AbsoluteFill>
  );
};

/* =================== CENA 2 — QUEM ERA ELE? =================== */
const Cloister: React.FC = () => (
  <svg width={W} height={H} style={{position: 'absolute'}}>
    <defs>
      <linearGradient id="wall" x1="0" x2="1"><stop offset="0" stopColor="#24170f" /><stop offset="0.6" stopColor="#4a2f1c" /><stop offset="1" stopColor="#2a1a10" /></linearGradient>
      <radialGradient id="win" cx="0.5" cy="0.4"><stop offset="0" stopColor="#FFE7B0" /><stop offset="0.6" stopColor="#E8A85A" /><stop offset="1" stopColor="#7A4E2D" /></radialGradient>
    </defs>
    <rect width={W} height={H} fill="url(#wall)" />
    {[180, 540, 900].map((x, i) => (
      <g key={x} opacity={i === 1 ? 1 : 0.85}>
        <path d={`M${x - 120},1300 L${x - 120},620 Q${x - 120},440 ${x},420 Q${x + 120},440 ${x + 120},620 L${x + 120},1300 Z`} fill="url(#win)" />
        <path d={`M${x},430 L${x},1300 M${x - 120},860 L${x + 120},860`} stroke="#2a1a10" strokeWidth={10} />
        <path d={`M${x - 150},1320 L${x - 150},610 Q${x - 150},400 ${x},388 Q${x + 150},400 ${x + 150},610 L${x + 150},1320`} stroke="#1a100a" strokeWidth={34} fill="none" />
      </g>
    ))}
    <rect x={0} y={1320} width={W} height={600} fill="#1a110b" />
  </svg>
);

export const S2Quem: React.FC<SceneProps> = ({dur}) => {
  const frame = useCurrentFrame();
  const name = interpolate(frame, [40, 70], [0, 1], clamp);
  const gaze = interpolate(frame, [0, 70, 110], [0.7, 0.7, 0], clamp);
  return (
    <AbsoluteFill>
      <Camera kf={[{f: 0, x: -40, y: 60, z: 1.08}, {f: dur, x: 30, y: -40, z: 1.25}]}>
        <Layer depth={0.2}><Cloister /><AbsoluteFill style={{background: 'rgba(20,12,6,0.25)'}} /></Layer>
        <Layer depth={0.3}><LightRays x={540} y={420} angle={-12} spread={40} opacity={0.32} /></Layer>
        <Layer depth={0.5}><Particles n={55} seed="dust2" size={[1.5, 4.5]} speed={0.35} opacity={0.7} area={[100, 300, 900, 1400]} /></Layer>
        <Layer depth={1}>
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end'}}>
            <Kolbe width={980} expression="gentil" gaze={[0, gaze]} tilt={-2} light="quente" style={{marginBottom: 120}} />
          </AbsoluteFill>
        </Layer>
        <Layer depth={1.4}><Particles n={10} seed="bokeh2" size={[14, 30]} speed={0.2} opacity={0.18} glow={false} /></Layer>
      </Camera>
      <AbsoluteFill style={{top: 1600, alignItems: 'center', opacity: name}}>
        <div style={{width: 520 * name, height: 2, background: `linear-gradient(90deg, transparent, ${C.ouro}, transparent)`}} />
        <div style={{fontFamily: F.titulo, fontWeight: 700, fontSize: 46, color: C.pergaminho, letterSpacing: 6, marginTop: 14, textShadow: '0 4px 16px #000'}}>MAXIMILIANO MARIA KOLBE</div>
        <div style={{fontFamily: F.serifa, fontStyle: 'italic', fontWeight: 600, fontSize: 36, color: C.ouroClaro, marginTop: 4}}>frade franciscano · Polônia, 1894 – 1941</div>
      </AbsoluteFill>
      <FilmFinish tint="rgba(200,130,60,0.18)" />
    </AbsoluteFill>
  );
};

/* =================== CENA 3 — SUA MISSÃO =================== */
const Press: React.FC = () => {
  const frame = useCurrentFrame();
  const rot = frame * 6;
  const Cyl = ({x, y, r}: {x: number; y: number; r: number}) => (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="#3a2a1d" stroke="#1a120c" strokeWidth={10} />
      <g transform={`rotate(${rot * (100 / r)})`}>
        {Array.from({length: 6}, (_, i) => <rect key={i} x={-4} y={-r + 10} width={8} height={r - 20} fill="#6b4a2c" transform={`rotate(${i * 60})`} />)}
      </g>
      <circle r={r * 0.22} fill="#c08a46" />
      <path d={`M${-r * 0.7},${-r * 0.7} A${r},${r} 0 0 1 ${r * 0.7},${-r * 0.7}`} stroke="#E8B868" strokeWidth={5} fill="none" opacity={0.5} />
    </g>
  );
  return (
    <svg width={W} height={H} style={{position: 'absolute'}}>
      <rect width={W} height={H} fill="#1b130d" />
      <rect x={0} y={1180} width={W} height={740} fill="#120c08" />
      <path d="M90,1180 L90,600 L990,600 L990,1180" stroke="#2c1f15" strokeWidth={40} fill="none" />
      <Cyl x={330} y={900} r={210} />
      <Cyl x={750} y={900} r={210} />
      <Cyl x={540} y={1130} r={110} />
      {/* fita de papel correndo */}
      <path d="M120,1060 C330,1130 750,1130 960,1060" stroke="#EADFC4" strokeWidth={26} fill="none" strokeDasharray="70 14" strokeDashoffset={-frame * 14} />
    </svg>
  );
};

const Sheet: React.FC<{i: number; t: number}> = ({i, t}) => {
  const x = -300 + ((t * (7 + (i % 4)) + i * 260) % 1700);
  const y = 1300 - ((t * 2.2 + i * 140) % 1300) - Math.sin(t / 20 + i) * 60;
  const r = (t * (1.5 + (i % 3))) % 360;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) skewX(${Math.sin(t / 15 + i) * 12})`}>
      <rect x={-70} y={-95} width={140} height={190} fill="#EFE3C8" stroke="#bfae8c" strokeWidth={2} />
      <rect x={-56} y={-82} width={112} height={18} fill="#8E2A20" />
      <text x={0} y={-68} fontSize={11} fontFamily="Liberation Serif" textAnchor="middle" fill="#EFE3C8" fontWeight={700}>RYCERZ NIEPOKALANEJ</text>
      <circle cx={0} cy={-18} r={26} fill="#3B6EA8" opacity={0.75} />
      {[18, 32, 46, 60, 74].map((yy) => <rect key={yy} x={-56} y={yy} width={112 - (yy % 3) * 14} height={5} fill="#8a7a62" />)}
    </g>
  );
};

const Route: React.FC<{p: number}> = ({p}) => {
  const path = 'M250,760 C420,520 720,560 860,980';
  return (
    <svg width={W} height={H} style={{position: 'absolute'}}>
      <defs>
        <radialGradient id="parch" cx="0.5" cy="0.45" r="0.8"><stop offset="0" stopColor="#E9D6AE" /><stop offset="0.7" stopColor="#C9A66E" /><stop offset="1" stopColor="#6E4A2A" /></radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#parch)" />
      {/* globo estilizado */}
      <circle cx={540} cy={820} r={460} fill="none" stroke="#7A4E2D" strokeWidth={3} opacity={0.6} />
      {[-300, -150, 0, 150, 300].map((o) => <ellipse key={o} cx={540} cy={820} rx={Math.abs(460 - Math.abs(o) * 1.4) || 10} ry={460} fill="none" stroke="#7A4E2D" strokeWidth={1.5} opacity={0.35} />)}
      {[-300, -150, 0, 150, 300].map((o) => <path key={`l${o}`} d={`M${540 - Math.sqrt(460 * 460 - o * o)},${820 + o} L${540 + Math.sqrt(460 * 460 - o * o)},${820 + o}`} stroke="#7A4E2D" strokeWidth={1.5} opacity={0.35} />)}
      <path d={path} stroke="#8E2A20" strokeWidth={7} fill="none" strokeDasharray="1600" strokeDashoffset={1600 * (1 - p)} strokeLinecap="round" />
      <path d={path} stroke="#8E2A20" strokeWidth={3} fill="none" strokeDasharray="4 18" opacity={0.5} />
      <g opacity={Math.min(1, p * 4)}>
        <circle cx={250} cy={760} r={14} fill="#8E2A20" /><circle cx={250} cy={760} r={28} fill="none" stroke="#8E2A20" strokeWidth={3} />
        <text x={250} y={700} fontFamily={F.titulo} fontWeight={700} fontSize={38} textAnchor="middle" fill="#3B2A1E">NIEPOKALANÓW</text>
        <text x={250} y={830} fontFamily={F.serifa} fontStyle="italic" fontSize={34} textAnchor="middle" fill="#3B2A1E">Polônia · 1927</text>
      </g>
      <g opacity={interpolate(p, [0.85, 1], [0, 1], clamp)}>
        <circle cx={860} cy={980} r={14} fill="#8E2A20" /><circle cx={860} cy={980} r={28} fill="none" stroke="#8E2A20" strokeWidth={3} />
        <text x={860} y={1060} fontFamily={F.titulo} fontWeight={700} fontSize={38} textAnchor="middle" fill="#3B2A1E">NAGASAKI</text>
        <text x={860} y={1104} fontFamily={F.serifa} fontStyle="italic" fontSize={34} textAnchor="middle" fill="#3B2A1E">Japão · 1930</text>
      </g>
    </svg>
  );
};

export const S3Missao: React.FC<SceneProps> = ({dur}) => {
  const frame = useCurrentFrame();
  const split = Math.round(dur * 0.55);
  const mapIn = interpolate(frame, [split - 8, split + 8], [0, 1], clamp);
  const p = interpolate(frame, [split, dur - 10], [0, 1], {...clamp, easing: easeOut});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: 1 - mapIn}}>
        <Camera kf={[{f: 0, x: 60, y: 0, z: 1.15}, {f: split, x: -60, y: -30, z: 1.3}]}>
          <Layer depth={0.3}><Press /></Layer>
          <Layer depth={0.35}><LightRays x={880} y={120} angle={25} spread={18} count={5} opacity={0.25} /></Layer>
          <Layer depth={0.8}>
            <svg width={W} height={H} style={{position: 'absolute'}}>{Array.from({length: 9}, (_, i) => <Sheet key={i} i={i} t={frame} />)}</svg>
          </Layer>
          <Layer depth={1.05}>
            <div style={{position: 'absolute', left: -170, bottom: -60}}>
              <Kolbe width={820} expression="sereno" gaze={[0.9, -0.3]} tilt={3} light="quente" blinkSeed="s3" />
            </div>
          </Layer>
          <Layer depth={1.3}><Particles n={30} seed="ink" size={[1, 3]} speed={0.6} opacity={0.6} color="#E8B868" /></Layer>
        </Camera>
        <FilmFinish tint="rgba(190,120,50,0.2)" />
      </AbsoluteFill>
      <AbsoluteFill style={{opacity: mapIn}}>
        <Camera kf={[{f: split, x: -120, y: 40, z: 1.25}, {f: dur, x: 80, y: 40, z: 1.12}]} shake={0.6}>
          <Layer depth={0.6}><Route p={p} /></Layer>
          <Layer depth={1.2}>
            <svg width={W} height={H} style={{position: 'absolute'}}>{Array.from({length: 4}, (_, i) => <Sheet key={i} i={i + 20} t={frame * 0.6} />)}</svg>
          </Layer>
        </Camera>
        <FilmFinish vignette={0.9} paper={0.3} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =================== CENA 4 — A GUERRA =================== */
const Train: React.FC<{t: number}> = ({t}) => (
  <g transform={`translate(${1400 - t * 9} 1240)`}>
    {Array.from({length: 7}, (_, i) => (
      <g key={i} transform={`translate(${i * 330} 0)`}>
        <rect x={0} y={-230} width={310} height={210} fill="#120f0d" />
        <rect x={20} y={-200} width={60} height={30} fill="#3a2c22" opacity={0.6} />
        <circle cx={60} cy={-10} r={28} fill="#0a0807" /><circle cx={250} cy={-10} r={28} fill="#0a0807" />
      </g>
    ))}
  </g>
);

export const S4Guerra: React.FC<SceneProps> = ({dur, ev, fps}) => {
  const frame = useCurrentFrame();
  const split = Math.round(dur * 0.42);
  const stamp = Math.round(ev.numberStamp * fps);
  const bIn = interpolate(frame, [split - 10, split + 6], [0, 1], clamp);
  const yr = interpolate(frame, [12, 40, split - 20, split], [0, 1, 1, 0], clamp);
  const flash = interpolate(frame, [stamp, stamp + 2, stamp + 14], [0, 0.55, 0], clamp);
  const big = interpolate(frame, [stamp, stamp + 6], [1.6, 1], {...clamp, easing: easeOut});
  const bigO = interpolate(frame, [stamp - 1, stamp, dur - 12, dur], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: 1 - bIn}}>
        <Camera kf={[{f: 0, x: 0, y: 0, z: 1.05}, {f: split, x: 40, y: -40, z: 1.2}]}>
          <Layer depth={0.05}><NightSky top="#0b0605" bottom="#4a1e12" glow="rgba(200,90,40,0.25)" /></Layer>
          <Layer depth={0.2}><Fog color="#2a1712" opacity={0.6} y={700} seed={3} speed={0.8} /></Layer>
          <Layer depth={0.35}>
            <svg width={W} height={H} style={{position: 'absolute'}}>
              <WatchTower x={160} y={1060} s={1.1} />
              <rect x={0} y={1240} width={W} height={700} fill="#0b0807" />
              <path d="M0,1180 L1080,1150" stroke="#2c2420" strokeWidth={3} strokeDasharray="12 6" />
            </svg>
          </Layer>
          <Layer depth={0.6}><svg width={W} height={H} style={{position: 'absolute'}}><Train t={frame} /></svg></Layer>
          <Layer depth={0.8}><Fog color="#5a3a2c" opacity={0.35} y={1150} seed={4} speed={1.4} /></Layer>
          <Layer depth={1.1}><Particles n={60} seed="emb4" color="#FF9A4A" size={[1.5, 3.5]} speed={1.1} opacity={0.7} /></Layer>
        </Camera>
        <AbsoluteFill style={{alignItems: 'center', top: 420, opacity: yr}}>
          <div style={{fontFamily: F.titulo, fontWeight: 700, fontSize: 210, color: 'transparent', WebkitTextStroke: `2px ${C.ouro}`, letterSpacing: 18, transform: `scale(${1 + frame * 0.0009})`}}>1941</div>
          <div style={{fontFamily: F.serifa, fontStyle: 'italic', fontSize: 40, color: C.pergaminho, marginTop: -10}}>Polônia ocupada · Segunda Guerra Mundial</div>
        </AbsoluteFill>
        <FilmFinish vignette={0.9} tint="rgba(160,60,20,0.18)" />
      </AbsoluteFill>
      <AbsoluteFill style={{opacity: bIn}}>
        <Camera kf={[{f: split, x: 0, y: -40, z: 1.05}, {f: stamp - 4, x: 40, y: 40, z: 1.15}, {f: stamp + 6, x: 280, y: 860, z: 1.75}, {f: dur, x: 290, y: 890, z: 1.8}]} shake={0.8}>
          <Layer depth={0.2}><AbsoluteFill style={{background: 'radial-gradient(ellipse at 40% 30%, #2f3944, #0b0e12 70%)'}} /></Layer>
          <Layer depth={0.3}><LightRays x={150} y={0} angle={-25} spread={14} count={4} color="#b8cde0" opacity={0.25} /></Layer>
          <Layer depth={1}>
            <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end'}}>
              <Kolbe width={1000} variant="prisioneiro" expression="sereno" gaze={[-0.2, 0.2]} light="frio" blinkSeed="s4" style={{marginBottom: 120}} />
            </AbsoluteFill>
          </Layer>
          <Layer depth={1.2}><Particles n={40} seed="snow4" color="#dfe7ef" size={[1.5, 4]} rise={false} speed={0.7} glow={false} opacity={0.5} /></Layer>
        </Camera>
        <AbsoluteFill style={{alignItems: 'center', top: 330, opacity: bigO}}>
          <div style={{fontFamily: F.titulo, fontWeight: 700, fontSize: 190, color: C.pergaminho, letterSpacing: 10, transform: `scale(${big})`, textShadow: '0 10px 40px #000'}}>16670</div>
          <div style={{fontFamily: F.serifa, fontStyle: 'italic', fontSize: 40, color: C.ouroClaro}}>Auschwitz · 28 de maio de 1941</div>
        </AbsoluteFill>
        <AbsoluteFill style={{background: '#fff', opacity: flash}} />
        <FilmFinish vignette={0.9} tint="rgba(80,110,150,0.3)" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =================== CENA 5 — A ESCOLHA =================== */
export const S5Escolha: React.FC<SceneProps> = ({dur}) => {
  const frame = useCurrentFrame();
  const split = Math.round(dur * 0.45);
  const close = interpolate(frame, [split - 8, split + 8], [0, 1], clamp);
  const rows = [0, 1, 2];
  return (
    <AbsoluteFill>
      <Camera kf={[{f: 0, x: -260, y: 0, z: 1.1}, {f: split, x: 120, y: 0, z: 1.15}, {f: split + 1, x: 30, y: 220, z: 1.6}, {f: dur, x: 10, y: 380, z: 1.85}]} shake={1}>
        <Layer depth={0.05}><AbsoluteFill style={{background: 'linear-gradient(180deg, #b9b0a0 0%, #8c8476 45%, #4a453e 100%)'}} /></Layer>
        <Layer depth={0.15}>
          <svg width={W} height={H} style={{position: 'absolute'}}>
            <rect x={-200} y={640} width={1480} height={420} fill="#5a4436" />
            {Array.from({length: 16}, (_, i) => <rect key={i} x={-180 + i * 95} y={700} width={40} height={60} fill="#2b201a" opacity={0.7} />)}
            <path d="M-200,640 L1280,640 L1240,600 L-160,600 Z" fill="#3d2d24" />
            <rect x={-200} y={1060} width={1480} height={900} fill="#776b5c" />
          </svg>
        </Layer>
        <Layer depth={0.3}><LightRays x={900} y={-200} angle={18} spread={30} color="#fff4dc" opacity={0.2} /></Layer>
        {rows.map((r) => (
          <Layer key={r} depth={0.45 + r * 0.22}>
            <svg width={W} height={H} style={{position: 'absolute'}}>
              {Array.from({length: 13}, (_, i) => {
                const seed = r * 20 + i;
                const isPai = r === 2 && i === 6;
                return <Figure key={i} kind={isPai ? 'pai' : 'prisioneiro'} x={-240 + i * 130 + (r % 2) * 60 + random(`x${seed}`) * 20} y={1150 + r * 150} h={360 + r * 110}
                  seed={seed} grief={isPai ? interpolate(frame, [split - 40, split], [0, 1], clamp) : 0} rim="#fff1d6" tone={r === 2 ? '#3a3f47' : '#4a4f57'} opacity={1 - r * 0.0} />;
              })}
            </svg>
          </Layer>
        ))}
        <Layer depth={1.25}>
          <svg width={W} height={H} style={{position: 'absolute'}}>
            <Figure kind="guarda" x={150} y={2060} h={820} seed={3} rim="#fff1d6" />
            <Figure kind="guarda" x={980} y={2080} h={860} seed={5} flip rim="#fff1d6" />
          </svg>
        </Layer>
        <Layer depth={1.1}><Particles n={50} seed="dust5" color="#fff1d6" size={[1, 3]} speed={0.3} glow={false} opacity={0.5} /></Layer>
      </Camera>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 55%, transparent 30%, rgba(20,10,5,0.7) 85%)', opacity: close}} />
      <FilmFinish vignette={0.8} tint="rgba(150,110,70,0.25)" />
    </AbsoluteFill>
  );
};
