// EP001 v2 — cenas 1 a 5 na linguagem flat/chibi da referência.
// Cada cena é independente: recebe a duração (frames) e eventos sincronizados com o áudio (s, relativos à cena).
import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {C, F} from '../../brand/tokens';
import {Camera, easeOut, H, Layer, Particles, W} from '../../core/cinema';
import {FlatFinish, PlaceTag} from '../../core/flat';
import {Chibi, KOLBE_HABITO, KOLBE_PRISIONEIRO, OUT, Sparkle} from '../../characters/Chibi';
import {BarbedWire, Barrack, Bricks, FencePost, Stars, SW, Tower} from './Props';

export type SceneProps = {dur: number; ev: Record<string, number>; fps: number};
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const Svg: React.FC<{children: React.ReactNode}> = ({children}) => <svg width={W} height={H} style={{position: 'absolute', overflow: 'visible'}}>{children}</svg>;
export const fadeIn = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], clamp);

/* ============ CENA 1 — O GANCHO: o campo à noite ============ */
export const S1Gancho: React.FC<SceneProps> = ({dur}) => {
  const frame = useCurrentFrame();
  const beam = Math.sin(frame / 50) * 0.5;
  return (
    <AbsoluteFill style={{background: '#16203A'}}>
      <Camera kf={[{f: 0, x: 0, y: -380, z: 1.0}, {f: dur * 0.55, x: 0, y: 40, z: 1.12}, {f: dur, x: 30, y: 120, z: 1.32}]} shake={0.5}>
        <Layer depth={0.1}><Svg>
          <rect x={-300} y={-600} width={1680} height={3000} fill="#1B2647" />
          <rect x={-300} y={700} width={1680} height={700} fill="#24315A" />
          <Stars n={90} h={1100} />
          <circle cx={820} cy={300} r={70} fill="#F6EFD9" stroke={OUT} strokeWidth={SW} />
          <circle cx={845} cy={285} r={56} fill="#1B2647" />
        </Svg></Layer>
        <Layer depth={0.3}><Svg>
          <Tower x={170} y={1170} s={0.9} beam={beam} />
          <Barrack x={330} y={1000} w={560} h={190} lit />
          <Tower x={980} y={1180} s={0.75} />
          <rect x={-300} y={1180} width={1680} height={900} fill="#2C2622" />
        </Svg></Layer>
        <Layer depth={0.65}><Svg>
          {[-60, 200, 460, 720, 980, 1240].map((x, i) => <FencePost key={x} x={x} y={1500} s={0.95} side={i % 2 ? -1 : 1} />)}
          {[1210, 1280, 1350, 1420].map((y) => <BarbedWire key={y} x1={-200} x2={1300} y={y} sag={14} />)}
          <rect x={-300} y={1500} width={1680} height={700} fill="#3A322C" stroke={OUT} strokeWidth={SW} />
        </Svg></Layer>
        <Layer depth={1.0}><Particles n={45} seed="ash" color="#E8E4DA" size={[2, 4]} rise={false} speed={0.7} glow={false} opacity={0.55} drift={40} /></Layer>
      </Camera>
      <PlaceTag text="AUSCHWITZ · 1941" o={fadeIn(frame, 20, 40)} />
      <AbsoluteFill style={{top: 1640, alignItems: 'center', opacity: fadeIn(frame, 30, 55) * interpolate(frame, [dur - 30, dur - 10], [1, 0], clamp)}}>
        <div style={{fontFamily: F.titulo, fontWeight: 700, fontSize: 28, letterSpacing: 10, color: C.ouro}}>SANTORAMA · EPISÓDIO 001</div>
      </AbsoluteFill>
      <FlatFinish vignette={0.5} />
    </AbsoluteFill>
  );
};

/* ============ CENA 2 — QUEM ERA ELE? ============ */
const Cloister: React.FC = () => (
  <Svg>
    <rect x={-300} y={-300} width={1680} height={2600} fill="#E6D5B5" />
    {[150, 540, 930].map((x) => (
      <g key={x}>
        <path d={`M${x - 120},1150 L${x - 120},620 Q${x - 120},470 ${x},460 Q${x + 120},470 ${x + 120},620 L${x + 120},1150 Z`} fill="#F4C96B" stroke={OUT} strokeWidth={SW} />
        <path d={`M${x},466 L${x},1150 M${x - 120},820 L${x + 120},820`} stroke={OUT} strokeWidth={6} />
        <path d={`M${x - 160},1170 L${x - 160},600 Q${x - 160},420 ${x},405 Q${x + 160},420 ${x + 160},600 L${x + 160},1170`} stroke="#A3412F" strokeWidth={26} fill="none" />
        <path d={`M${x - 173},1170 L${x - 173},600 Q${x - 173},408 ${x},392 Q${x + 173},408 ${x + 173},600 L${x + 173},1170`} stroke={OUT} strokeWidth={5} fill="none" />
      </g>
    ))}
    <rect x={-300} y={1170} width={1680} height={1200} fill="#8C5A3C" stroke={OUT} strokeWidth={SW} />
    {Array.from({length: 14}, (_, i) => <line key={i} x1={-300 + i * 130} y1={1170} x2={-600 + i * 190} y2={2100} stroke="#6E4630" strokeWidth={4} />)}
  </Svg>
);

export const S2Quem: React.FC<SceneProps> = ({dur}) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 40], [380, 0], {...clamp, easing: easeOut});
  const walk = frame < 40 ? frame * 0.35 : 0;
  const name = fadeIn(frame, 50, 72);
  return (
    <AbsoluteFill>
      <Camera kf={[{f: 0, x: 0, y: 120, z: 1.0}, {f: dur, x: 0, y: 40, z: 1.14}]} shake={0.4}>
        <Layer depth={0.3}><Cloister /></Layer>
        <Layer depth={0.5}><Particles n={30} seed="d2" color="#FFF4D2" size={[2, 4]} speed={0.3} glow={false} opacity={0.7} area={[0, 400, 1080, 900]} /></Layer>
        <Layer depth={1}><Svg>
          <Chibi {...KOLBE_HABITO} x={540 + enter} y={1640} h={980} walk={walk} expression="gentil" gaze={frame < 40 ? -0.4 : 0} />
        </Svg></Layer>
      </Camera>
      <PlaceTag text="POLÔNIA · 1894" o={fadeIn(frame, 10, 30)} />
      <AbsoluteFill style={{top: 1660, alignItems: 'center', opacity: name}}>
        <div style={{transform: `scale(${0.9 + 0.1 * name})`, background: C.martirio, border: `5px solid ${OUT}`, borderRadius: 10, padding: '14px 34px', boxShadow: `0 8px 0 ${OUT}`}}>
          <div style={{fontFamily: F.titulo, fontWeight: 700, fontSize: 44, color: '#F6EFD9', letterSpacing: 4}}>MAXIMILIANO KOLBE</div>
        </div>
        <div style={{fontFamily: F.serifa, fontStyle: 'italic', fontWeight: 700, fontSize: 34, color: '#F6EFD9', marginTop: 18, textShadow: `0 2px 0 ${OUT}`}}>frade franciscano · 1894–1941</div>
      </AbsoluteFill>
      <FlatFinish />
    </AbsoluteFill>
  );
};

/* ============ CENA 3 — SUA MISSÃO ============ */
const Magazine: React.FC<{x: number; y: number; r?: number; s?: number}> = ({x, y, r = 0, s = 1}) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <rect x={-60} y={-80} width={120} height={160} fill="#F6EFD9" stroke={OUT} strokeWidth={5} />
    <rect x={-60} y={-80} width={120} height={34} fill="#A3412F" stroke={OUT} strokeWidth={5} />
    <text x={0} y={-58} fontSize={11} fontWeight={700} fontFamily="Liberation Serif" textAnchor="middle" fill="#F6EFD9">RYCERZ</text>
    <circle cx={0} cy={0} r={22} fill="#5B86B0" stroke={OUT} strokeWidth={4} />
    {[36, 50, 64].map((yy) => <rect key={yy} x={-44} y={yy} width={88} height={6} rx={3} fill="#9C8B70" />)}
  </g>
);

const Press: React.FC = () => {
  const frame = useCurrentFrame();
  const Roll = ({x, y, r}: {x: number; y: number; r: number}) => (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill="#6E4A33" stroke={OUT} strokeWidth={SW} />
      <g transform={`rotate(${frame * 5})`}>{[0, 60, 120].map((a) => <rect key={a} x={-r + 14} y={-6} width={(r - 14) * 2} height={12} fill="#4A3123" transform={`rotate(${a})`} />)}</g>
      <circle r={r * 0.25} fill="#E9B44C" stroke={OUT} strokeWidth={4} />
    </g>
  );
  return (
    <Svg>
      <rect x={-300} y={-300} width={1680} height={2600} fill="#3B2A1E" />
      <Bricks x={-300} y={300} w={1680} h={800} fill="#5A3A28" line="#47301F" />
      <rect x={-300} y={1100} width={1680} height={1200} fill="#2A1E16" stroke={OUT} strokeWidth={SW} />
      <rect x={130} y={720} width={820} height={420} rx={18} fill="#4F5A52" stroke={OUT} strokeWidth={SW} />
      <Roll x={340} y={880} r={130} /><Roll x={740} y={880} r={130} />
      <path d="M150,1060 L930,1060" stroke="#F6EFD9" strokeWidth={26} strokeDasharray="60 12" strokeDashoffset={-frame * 12} />
      {[0, 1, 2, 3].map((i) => <Magazine key={i} x={860 + i * 6} y={1180 - i * 14} r={-4 + i * 3} s={0.8} />)}
    </Svg>
  );
};

const Pin: React.FC<{x: number; y: number; label: string; ly: number; o: number}> = ({x, y, label, ly, o}) => (
  <g opacity={o}>
    <path d={`M${x},${y} m0,-50 c-26,0 -40,20 -40,38 c0,26 40,62 40,62 c0,0 40,-36 40,-62 c0,-18 -14,-38 -40,-38 z`} fill="#B5352A" stroke={OUT} strokeWidth={5} />
    <circle cx={x} cy={y - 36} r={12} fill="#F6EFD9" />
    <text x={x} y={ly} fontFamily={F.titulo} fontWeight={700} fontSize={36} textAnchor="middle" fill="#F6EFD9" stroke={OUT} strokeWidth={8} paintOrder="stroke">{label}</text>
  </g>
);

const Globe: React.FC<{p: number}> = ({p}) => {
  const frame = useCurrentFrame();
  const rot = frame * 0.6;
  const route = 'M300,820 C420,560 700,540 790,900';
  return (
    <Svg>
      <rect x={-300} y={-300} width={1680} height={2600} fill="#1B2647" />
      <Stars n={60} h={1900} />
      <circle cx={540} cy={1000} r={430} fill="#4C7BA6" stroke={OUT} strokeWidth={SW} />
      <clipPath id="gl"><circle cx={540} cy={1000} r={427} /></clipPath>
      <g clipPath="url(#gl)">
        {[0, 1, 2].map((k) => {
          const ox = ((rot + k * 600) % 1800) - 600;
          return (
            <g key={k} transform={`translate(${ox} 0)`} fill="#D9C79F" stroke={OUT} strokeWidth={5}>
              <path d="M120,720 Q220,640 330,700 Q400,760 360,860 Q300,940 200,900 Q110,840 120,720 Z" />
              <path d="M380,980 Q470,940 520,1040 Q500,1180 420,1220 Q360,1120 380,980 Z" />
              <path d="M560,700 Q700,640 820,720 Q880,820 800,880 Q700,900 640,840 Q560,780 560,700 Z" />
            </g>
          );
        })}
      </g>
      <path d={route} stroke="#B5352A" strokeWidth={9} fill="none" strokeDasharray="1000" strokeDashoffset={1000 * (1 - p)} strokeLinecap="round" />
      <Pin x={300} y={820} label="NIEPOKALANÓW" ly={700} o={fadeIn(p, 0, 0.1)} />
      <Pin x={790} y={900} label="NAGASAKI" ly={1010} o={fadeIn(p, 0.85, 1)} />
    </Svg>
  );
};

export const S3Missao: React.FC<SceneProps> = ({dur}) => {
  const frame = useCurrentFrame();
  const split = Math.round(dur * 0.52);
  const b = fadeIn(frame, split - 8, split + 8);
  const p = interpolate(frame, [split, dur - 12], [0, 1], {...clamp, easing: easeOut});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: 1 - b}}>
        <Camera kf={[{f: 0, x: 80, y: 60, z: 1.1}, {f: split, x: -60, y: 0, z: 1.2}]} shake={0.4}>
          <Layer depth={0.4}><Press /></Layer>
          <Layer depth={0.8}><Svg>
            {Array.from({length: 7}, (_, i) => {
              const t = frame + i * 23;
              return <Magazine key={i} x={-150 + ((t * 9 + i * 170) % 1400)} y={1100 - ((t * 4 + i * 90) % 900)} r={(t * 3) % 360} s={0.9} />;
            })}
          </Svg></Layer>
          <Layer depth={1}><Svg>
            <Chibi {...KOLBE_HABITO} x={250} y={1760} h={760} arms="point" expression="gentil" gaze={1} />
            <Sparkle x={420} y={1190} r={26} />
          </Svg></Layer>
        </Camera>
        <PlaceTag text="NIEPOKALANÓW · 1927" />
      </AbsoluteFill>
      <AbsoluteFill style={{opacity: b}}>
        <Camera kf={[{f: split, x: 0, y: -60, z: 1.1}, {f: dur, x: 0, y: -150, z: 1.0}]} shake={0.3}>
          <Layer depth={0.6}><Globe p={p} /></Layer>
          <Layer depth={0.8}><Svg>
            <Chibi {...KOLBE_HABITO} x={540} y={588} h={260} walk={frame * 0.3} expression="gentil" seed="kg" />
          </Svg></Layer>
        </Camera>
        <PlaceTag text="NAGASAKI · 1930" />
      </AbsoluteFill>
      <FlatFinish />
    </AbsoluteFill>
  );
};

/* ============ CENA 4 — A GUERRA ============ */
export const S4Guerra: React.FC<SceneProps> = ({dur, ev, fps}) => {
  const frame = useCurrentFrame();
  const split = Math.round(dur * 0.42);
  const stamp = Math.round(ev.numberStamp * fps);
  const b = fadeIn(frame, split - 8, split + 6);
  const plate = interpolate(frame, [stamp, stamp + 5], [2.2, 1], {...clamp, easing: easeOut});
  const plateO = interpolate(frame, [stamp - 1, stamp], [0, 1], clamp);
  const flash = interpolate(frame, [stamp, stamp + 2, stamp + 12], [0, 0.6, 0], clamp);
  const yr = interpolate(frame, [10, 28], [0, 1], {...clamp, easing: easeOut});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: 1 - b}}>
        <Camera kf={[{f: 0, x: -40, y: 0, z: 1.05}, {f: split, x: 40, y: -30, z: 1.15}]} shake={0.6}>
          <Layer depth={0.1}><Svg>
            <rect x={-300} y={-300} width={1680} height={2600} fill="#8E3324" />
            <rect x={-300} y={700} width={1680} height={600} fill="#B5532F" />
            <circle cx={540} cy={1180} r={260} fill="#E58A3A" stroke={OUT} strokeWidth={SW} />
          </Svg></Layer>
          <Layer depth={0.3}><Svg>
            {Array.from({length: 7}, (_, i) => {
              const px = ((i * 190 + frame * 2) % 1500) - 200, s = 0.6 + random(`sm${i}`) * 0.7;
              return <circle key={i} cx={px} cy={760 + random(`sy${i}`) * 260} r={110 * s} fill="#5E2A22" stroke={OUT} strokeWidth={5} opacity={0.8} />;
            })}
            <Tower x={150} y={1320} s={1} />
            <rect x={-300} y={1300} width={1680} height={900} fill="#3B231C" stroke={OUT} strokeWidth={SW} />
          </Svg></Layer>
          <Layer depth={0.6}><Svg>
            <g transform={`translate(${1300 - frame * 8} 1290)`}>
              <path d="M0,0 L0,-170 L60,-230 L170,-230 L170,-120 L240,-120 L240,0 Z" fill="#2B1B14" />
              <rect x={30} y={-300} width={40} height={80} fill="#2B1B14" />
              {Array.from({length: 6}, (_, i) => (
                <g key={i} transform={`translate(${260 + i * 300} 0)`}>
                  <rect x={0} y={-220} width={280} height={200} rx={8} fill="#4A2E22" stroke={OUT} strokeWidth={SW} />
                  <rect x={110} y={-180} width={60} height={120} fill="#2B1B14" />
                  <circle cx={50} cy={-14} r={26} fill="#2B1B14" /><circle cx={230} cy={-14} r={26} fill="#2B1B14" />
                </g>
              ))}
              {[0, 1, 2].map((k) => <circle key={k} cx={50 - k * 60 + frame * 1.5} cy={-330 - k * 70 - (frame % 30)} r={40 + k * 18} fill="#D8C9B4" stroke={OUT} strokeWidth={5} opacity={0.85 - k * 0.2} />)}
            </g>
          </Svg></Layer>
        </Camera>
        <AbsoluteFill style={{top: 560, alignItems: 'center'}}>
          <div style={{fontFamily: F.titulo, fontWeight: 700, fontSize: 230, color: '#F6EFD9', WebkitTextStroke: `8px ${OUT}`, paintOrder: 'stroke fill', transform: `scale(${0.6 + 0.4 * yr}) rotate(${-3 * (1 - yr)}deg)`, opacity: yr * interpolate(frame, [split - 20, split - 6], [1, 0], clamp), textShadow: `0 10px 0 ${OUT}`}}>1941</div>
        </AbsoluteFill>
        <PlaceTag text="POLÔNIA OCUPADA" />
      </AbsoluteFill>
      <AbsoluteFill style={{opacity: b, background: '#5E7088'}}>
        <Camera kf={[{f: split, x: 0, y: -120, z: 1.0}, {f: stamp - 3, x: 0, y: -60, z: 1.06}, {f: stamp + 5, x: 190, y: 380, z: 1.9}, {f: dur, x: 200, y: 390, z: 1.95}]} shake={0.5}>
          <Layer depth={0.2}><Svg>
            <rect x={-300} y={-300} width={1680} height={2600} fill="#5E7088" />
            <Bricks x={-300} y={200} w={1680} h={1300} fill="#6E7F96" line="#5B6B80" bw={90} bh={40} />
          </Svg></Layer>
          <Layer depth={1}><Svg>
            <Chibi {...KOLBE_PRISIONEIRO} x={540} y={2080} h={1600} expression="sereno" gaze={0} />
          </Svg></Layer>
        </Camera>
        <AbsoluteFill style={{top: 1180, alignItems: 'center', opacity: plateO}}>
          <div style={{transform: `scale(${plate}) rotate(-4deg)`, background: '#F4F0E6', border: `8px solid ${OUT}`, borderRadius: 12, padding: '6px 40px', boxShadow: `0 12px 0 ${OUT}`}}>
            <div style={{fontFamily: F.legenda, fontWeight: 800, fontSize: 130, color: OUT, letterSpacing: 6}}>16670</div>
          </div>
        </AbsoluteFill>
        <AbsoluteFill style={{background: '#fff', opacity: flash}} />
        <PlaceTag text="AUSCHWITZ · 28 MAI 1941" />
      </AbsoluteFill>
      <FlatFinish />
    </AbsoluteFill>
  );
};

/* ============ CENA 5 — A ESCOLHA: a chamada ============ */
export const Yard: React.FC = () => (
  <Svg>
    <rect x={-400} y={-300} width={1880} height={2600} fill="#EAD9B8" />
    <circle cx={880} cy={300} r={90} fill="#FFF1C2" stroke={OUT} strokeWidth={SW} />
    <Barrack x={-380} y={700} w={760} h={360} />
    <Barrack x={460} y={720} w={900} h={340} />
    <rect x={-400} y={1060} width={1880} height={1300} fill="#BFA27C" stroke={OUT} strokeWidth={SW} />
  </Svg>
);

export const Row: React.FC<{y: number; h: number; n: number; x0: number; gap: number; seed: string; skip?: number[]; pai?: number; grief?: number}> = ({y, h, n, x0, gap, seed, skip = [], pai, grief = 0}) => (
  <>
    {Array.from({length: n}, (_, i) => i).filter((i) => !skip.includes(i)).map((i) => {
      const isPai = i === pai;
      return <Chibi key={i} outfit="listrado" hair="curto" cap="listrado" skin={random(`${seed}${i}`) > 0.5 ? '#F2C39B' : '#E7B48A'}
        x={x0 + i * gap} y={y} h={h} seed={`${seed}${i}`} expression={isPai && grief > 0.3 ? 'choro' : random(`${seed}e${i}`) > 0.5 ? 'triste' : 'serio'}
        arms={isPai && grief > 0.3 ? 'face' : 'down'} shake={isPai ? grief * 2.5 : 0} />;
    })}
  </>
);

export const S5Escolha: React.FC<SceneProps> = ({dur}) => {
  const frame = useCurrentFrame();
  const split = Math.round(dur * 0.45);
  const grief = fadeIn(frame, split - 30, split);
  return (
    <AbsoluteFill>
      <Camera kf={[{f: 0, x: -300, y: 60, z: 1.15}, {f: split, x: 200, y: 60, z: 1.15}, {f: split + 1, x: 30, y: 300, z: 1.55}, {f: dur, x: 30, y: 360, z: 1.75}]} shake={0.5}>
        <Layer depth={0.2}><Yard /></Layer>
        <Layer depth={0.55}><Svg><Row y={1240} h={300} n={13} x0={-300} gap={140} seed="r1" /></Svg></Layer>
        <Layer depth={0.75}><Svg><Row y={1380} h={350} n={12} x0={-330} gap={160} seed="r2" /></Svg></Layer>
        <Layer depth={0.95}><Svg><Row y={1540} h={410} n={11} x0={-360} gap={180} seed="r3" pai={5} grief={grief} /></Svg></Layer>
        <Layer depth={1.3}><Svg>
          <Chibi outfit="guarda" hair="none" cap="capacete" x={30} y={2120} h={700} expression="serio" seed="g1" />
          <Chibi outfit="guarda" hair="none" cap="capacete" x={1060} y={2140} h={720} expression="serio" seed="g2" flip />
        </Svg></Layer>
      </Camera>
      <PlaceTag text="BLOCO 14 · 29 JUL 1941" />
      <FlatFinish />
    </AbsoluteFill>
  );
};
