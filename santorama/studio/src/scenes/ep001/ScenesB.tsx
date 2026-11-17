// EP001 — cenas 6 a 10.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, F} from '../../brand/tokens';
import {Emblem, Wordmark} from '../../brand/Logo';
import {Camera, easeOut, FilmFinish, Fog, H, Layer, LightRays, Particles, W} from '../../core/cinema';
import {Kolbe} from '../../characters/Kolbe';
import {Figure} from '../../characters/Figures';
import type {SceneProps} from './ScenesA';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/* =================== CENA 6 — O SACRIFÍCIO =================== */
export const S6Sacrificio: React.FC<SceneProps> = ({dur, ev, fps}) => {
  const frame = useCurrentFrame();
  const sf = Math.round(ev.stepForward * fps);
  const walkEnd = sf + Math.round(2.4 * fps);
  const cut = walkEnd + 4;
  const k = interpolate(frame, [sf, walkEnd], [0, 1], {...clamp, easing: easeOut});
  const walk = frame > sf && frame < walkEnd ? (frame - sf) * 0.26 : 0;
  const closeO = interpolate(frame, [cut - 6, cut + 6], [0, 1], clamp);
  const warm = interpolate(frame, [cut, dur], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: 1 - closeO}}>
        <Camera kf={[{f: 0, x: 0, y: 140, z: 1.12}, {f: sf, x: 0, y: 160, z: 1.18}, {f: walkEnd, x: 0, y: 300, z: 1.4}]}>
          <Layer depth={0.05}><AbsoluteFill style={{background: 'linear-gradient(180deg, #a9a090 0%, #7c7466 50%, #3a352f 100%)'}} /></Layer>
          <Layer depth={0.2}><svg width={W} height={H} style={{position: 'absolute'}}><rect x={-200} y={600} width={1480} height={480} fill="#4f3c30" /><rect x={-200} y={1080} width={1480} height={900} fill="#6e6355" /></svg></Layer>
          <Layer depth={0.3}><LightRays x={540} y={-300} angle={0} spread={10} count={4} color="#fff2d0" opacity={0.18 + 0.25 * k} /></Layer>
          <Layer depth={0.6}>
            <svg width={W} height={H} style={{position: 'absolute'}}>
              {Array.from({length: 11}, (_, i) => i).filter((i) => i !== 5).map((i) => (
                <Figure key={i} kind={i === 6 ? 'pai' : 'prisioneiro'} x={-110 + i * 130} y={1300} h={520} seed={i + 40} grief={i === 6 ? 0.8 : 0} rim="#fff1d6" />
              ))}
              <Figure kind="kolbe" x={540} y={1300 + 230 * k} h={520 + 200 * k} walk={walk} seed={99} rim="#ffe2a0" glint={interpolate(frame, [walkEnd - 10, walkEnd, walkEnd + 10], [0, 1, 0], clamp)} />
            </svg>
          </Layer>
          <Layer depth={1.3}>
            <svg width={W} height={H} style={{position: 'absolute'}}>
              <Figure kind="guarda" x={90} y={2200} h={980} seed={7} rim="#fff1d6" />
              <Figure kind="guarda" x={1000} y={2230} h={1000} seed={8} flip rim="#fff1d6" />
            </svg>
          </Layer>
          <Layer depth={1}><Particles n={40} seed="d6" color="#fff1d6" size={[1, 3]} speed={0.3} glow={false} opacity={0.5} /></Layer>
        </Camera>
        <FilmFinish vignette={0.85} tint="rgba(150,110,70,0.25)" />
      </AbsoluteFill>
      <AbsoluteFill style={{opacity: closeO}}>
        <Camera kf={[{f: cut, x: 0, y: -40, z: 1.45}, {f: dur, x: 0, y: -70, z: 1.6}]} shake={0.6}>
          <Layer depth={0.1}><AbsoluteFill style={{background: `radial-gradient(ellipse at 70% 20%, rgba(212,162,76,${0.15 + 0.35 * warm}), #10131a 65%)`}} /></Layer>
          <Layer depth={0.3}><LightRays x={900} y={-100} angle={30} spread={16} count={5} opacity={0.15 + 0.3 * warm} /></Layer>
          <Layer depth={1}>
            <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end'}}>
              <Kolbe width={1000} variant="prisioneiro" expression="determinado" gaze={[0.15, -0.1]} tilt={1} light="ouro" rim={0.5 + 0.5 * warm} blinkSeed="s6" style={{marginBottom: 120}} />
            </AbsoluteFill>
          </Layer>
          <Layer depth={1.2}><Particles n={35} seed="g6" size={[1.5, 4]} speed={0.4} opacity={0.4 + 0.4 * warm} /></Layer>
        </Camera>
        <FilmFinish vignette={0.85} tint={`rgba(${Math.round(80 + 120 * warm)},${Math.round(110 + 20 * warm)},${Math.round(150 - 90 * warm)},0.25)`} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =================== CENA 7 — A ÚLTIMA PROVA =================== */
export const S7UltimaProva: React.FC<SceneProps> = ({dur, ev, fps}) => {
  const frame = useCurrentFrame();
  const dc = Math.round(ev.doorClose * fps);
  const outside = interpolate(frame, [dc - 34, dc - 24], [0, 1], clamp);
  const swing = interpolate(frame, [dc - 24, dc], [0, 1], {...clamp, easing: (t) => t * t * t});
  const after = interpolate(frame, [dc + 10, dc + 40], [0, 1], clamp);
  const white = interpolate(frame, [dur - 18, dur], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {/* interior do bunker: oração */}
      <AbsoluteFill style={{opacity: 1 - outside}}>
        <Camera kf={[{f: 0, x: 0, y: 40, z: 1.25}, {f: dc - 24, x: -20, y: 30, z: 1.4}]}>
          <Layer depth={0.1}>
            <svg width={W} height={H} style={{position: 'absolute'}}>
              <rect width={W} height={H} fill="#0d0f12" />
              {Array.from({length: 14}, (_, i) => <rect key={i} x={0} y={i * 140} width={W} height={2} fill="#1b1e22" />)}
              <rect x={760} y={360} width={140} height={90} fill="#5d6f86" opacity={0.85} />
              {[790, 830, 870].map((x) => <rect key={x} x={x} y={360} width={8} height={90} fill="#0d0f12" />)}
            </svg>
          </Layer>
          <Layer depth={0.2}><LightRays x={830} y={400} angle={32} spread={10} count={4} color="#b9cce2" opacity={0.3} /></Layer>
          <Layer depth={0.55}>
            <svg width={W} height={H} style={{position: 'absolute', opacity: 0.85}}>
              {[120, 280, 820, 960].map((x, i) => <Figure key={x} kind="prisioneiro" x={x} y={1700} h={640} seed={i + 60} tone="#14171c" rim="#7f93ab" sway={0.4} />)}
            </svg>
          </Layer>
          <Layer depth={1}>
            <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end'}}>
              <Kolbe width={900} variant="prisioneiro" expression="sereno" eyesClosed={1} tilt={4} light="ouro" rim={1} blinkSeed="s7" style={{marginBottom: 150}} />
            </AbsoluteFill>
          </Layer>
          <Layer depth={0.8}><Particles n={45} seed="pray" size={[2, 5]} speed={0.6} opacity={0.75} area={[200, 300, 700, 1300]} /></Layer>
        </Camera>
        <FilmFinish vignette={0.95} tint="rgba(60,80,120,0.3)" />
      </AbsoluteFill>
      {/* exterior: a porta de ferro se fecha sobre a luz */}
      <AbsoluteFill style={{opacity: outside * (1 - after * 0.0)}}>
        <svg width={W} height={H} style={{position: 'absolute'}}>
          <defs>
            <linearGradient id="slit" x1="0" x2="1"><stop offset="0" stopColor="#FFD58A" stopOpacity={0} /><stop offset="0.5" stopColor="#FFE7B8" /><stop offset="1" stopColor="#FFD58A" stopOpacity={0} /></linearGradient>
          </defs>
          <rect width={W} height={H} fill="#07080a" />
          <rect x={250} y={420} width={580} height={1180} fill="#14161a" />
          {/* luz que escapa pela fresta */}
          <rect x={540 - 290 * (1 - swing)} y={440} width={580 * (1 - swing) + 4} height={1140} fill="#E9B865" opacity={0.9 * (1 - swing)} />
          <rect x={300} y={440} width={480} height={1140} fill="url(#slit)" opacity={(1 - swing) * 0.6} />
          {/* porta */}
          <g transform={`translate(830 0) scale(${-Math.max(0.02, swing)} 1) translate(-830 0)`}>
            <rect x={250} y={440} width={580} height={1140} fill="#262a30" stroke="#0b0c0e" strokeWidth={10} />
            {[560, 1010, 1460].map((y) => <rect key={y} x={250} y={y} width={580} height={22} fill="#1a1d22" />)}
            {Array.from({length: 18}, (_, i) => <circle key={i} cx={280 + (i % 6) * 104} cy={560 + Math.floor(i / 6) * 450} r={7} fill="#3b4048" />)}
          </g>
          <rect x={232} y={420} width={20} height={1180} fill="#0b0c0e" />
          <rect x={828} y={420} width={20} height={1180} fill="#0b0c0e" />
        </svg>
        <AbsoluteFill style={{alignItems: 'center', top: 700, opacity: after}}>
          <div style={{fontFamily: F.serifa, fontStyle: 'italic', fontSize: 46, color: C.ouroClaro}}>Bunker da fome · Bloco 11</div>
          <div style={{fontFamily: F.titulo, fontWeight: 700, fontSize: 92, color: C.pergaminho, letterSpacing: 6, marginTop: 20}}>14 · VIII · 1941</div>
          <div style={{width: 300 * after, height: 1.5, background: C.ouro, marginTop: 26}} />
        </AbsoluteFill>
        <Particles n={30} seed="up7" size={[1.5, 4]} speed={0.5} opacity={0.6 * after} area={[300, 400, 480, 1200]} />
        <FilmFinish vignette={0.95} />
      </AbsoluteFill>
      <AbsoluteFill style={{background: '#FFF3D6', opacity: white}} />
    </AbsoluteFill>
  );
};

/* =================== CENA 8 — A MENSAGEM =================== */
const Crown: React.FC<{color: string; edge: string; x: number; y: number; s?: number}> = ({color, edge, x, y, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={0} cy={40} rx={80} ry={16} fill={edge} />
    <path d="M-80,40 L-80,-10 L-50,10 L-26,-40 L0,4 L26,-40 L50,10 L80,-10 L80,40 Z" fill={color} stroke={edge} strokeWidth={4} />
    {[-26, 26, 0].map((cx) => <circle key={cx} cx={cx} cy={cx ? -44 : 0} r={8} fill="#FFE7B0" />)}
  </g>
);

export const S8Mensagem: React.FC<SceneProps> = ({dur}) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [0, 30], [0, 1], {...clamp, easing: easeOut});
  const crowns = interpolate(frame, [30, 70], [0, 1], {...clamp, easing: easeOut});
  const label = interpolate(frame, [70, 100], [0, 1], clamp);
  const bob = Math.sin(frame / 25) * 10;
  return (
    <AbsoluteFill>
      <Camera kf={[{f: 0, x: 0, y: -60, z: 1.25}, {f: dur, x: 0, y: 40, z: 1.06}]} shake={0.5}>
        <Layer depth={0.05}><AbsoluteFill style={{background: `radial-gradient(circle at 50% 38%, #FFE3A3 0%, ${C.ouro} 22%, ${C.terra} 55%, ${C.carvao} 90%)`}} /></Layer>
        <Layer depth={0.15}>
          <svg width={W} height={H} style={{position: 'absolute', opacity: 0.35 * inP}}>
            {Array.from({length: 48}, (_, i) => {
              const a = (i / 48) * Math.PI * 2 + frame * 0.002;
              return <line key={i} x1={540} y1={720} x2={540 + Math.cos(a) * 1600} y2={720 + Math.sin(a) * 1600} stroke="#FFF1CC" strokeWidth={i % 2 ? 2 : 6} />;
            })}
          </svg>
        </Layer>
        <Layer depth={0.5}>
          <svg width={W} height={H} style={{position: 'absolute'}}>
            <circle cx={540} cy={705} r={300 * inP} fill="none" stroke="#FFF3D0" strokeWidth={10} opacity={0.9} />
            <circle cx={540} cy={705} r={280 * inP} fill="#FFE7B0" opacity={0.25} />
          </svg>
        </Layer>
        <Layer depth={1}>
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end'}}>
            <Kolbe width={940} expression="gentil" gaze={[0, -0.2]} light="ouro" rim={1} blinkSeed="s8" style={{marginBottom: 350}} />
          </AbsoluteFill>
        </Layer>
        <Layer depth={1.1}>
          <svg width={W} height={H} style={{position: 'absolute', opacity: crowns}}>
            <Crown color="#F6F0E2" edge="#C9B68E" x={300} y={330 + bob - 80 * (1 - crowns)} s={0.9} />
            <Crown color="#A3332A" edge="#5e1712" x={780} y={330 - bob - 80 * (1 - crowns)} s={0.9} />
          </svg>
        </Layer>
        <Layer depth={1.3}><Particles n={70} seed="gold8" size={[2, 6]} speed={0.5} opacity={0.85} /></Layer>
      </Camera>
      <AbsoluteFill style={{top: 1560, alignItems: 'center', opacity: label}}>
        <div style={{fontFamily: F.titulo, fontWeight: 700, fontSize: 54, color: C.pergaminho, letterSpacing: 10, textShadow: '0 4px 20px #000'}}>MÁRTIR DA CARIDADE</div>
        <div style={{fontFamily: F.serifa, fontStyle: 'italic', fontWeight: 600, fontSize: 36, color: C.ouroClaro, marginTop: 6, textShadow: '0 2px 10px #000'}}>canonizado por São João Paulo II · 10/10/1982</div>
      </AbsoluteFill>
      <FilmFinish vignette={0.7} tint="rgba(220,160,70,0.15)" />
    </AbsoluteFill>
  );
};

/* =================== CENA 9 — VERSÍCULO =================== */
export const S9Versiculo: React.FC<SceneProps & {cue?: {words: {w: string; start: number}[]; start: number}; sceneStart?: number}> = ({dur, cue, sceneStart = 0, fps}) => {
  const frame = useCurrentFrame();
  const t = frame / fps + sceneStart;
  const words = (cue?.words ?? []).map((w) => ({...w, w: w.w.replace(/[“”]/g, '')}));
  const ref = interpolate(frame, [dur - 70, dur - 40], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Camera kf={[{f: 0, x: 0, y: 0, z: 1.0}, {f: dur, x: 0, y: 0, z: 1.08}]} shake={0.4}>
        <Layer depth={0.2}><AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 40%, ${C.sepia}, ${C.carvao} 75%)`}} /></Layer>
        <Layer depth={0.4}><LightRays x={540} y={-200} angle={0} spread={30} count={7} opacity={0.18} /></Layer>
        <Layer depth={0.8}><Particles n={50} seed="v9" size={[1.5, 4]} speed={0.3} opacity={0.6} /></Layer>
      </Camera>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 90}}>
        <div style={{fontFamily: F.titulo, fontSize: 120, color: C.ouro, lineHeight: 0.6, opacity: 0.7}}>“</div>
        <div style={{fontFamily: F.serifa, fontStyle: 'italic', fontWeight: 600, fontSize: 76, lineHeight: 1.25, color: C.pergaminho, textAlign: 'center', textShadow: '0 4px 24px #000'}}>
          {words.map((w, i) => {
            const k = interpolate(t, [w.start - 0.1, w.start + 0.3], [0, 1], clamp);
            const gold = ['amor', 'maior', 'vida', 'amigos.'].includes(w.w);
            return <span key={i} style={{display: 'inline-block', marginRight: 18, opacity: k, filter: `blur(${(1 - k) * 8}px)`, color: gold ? C.ouroClaro : undefined}}>{w.w}</span>;
          })}
        </div>
        <div style={{marginTop: 50, opacity: ref, textAlign: 'center'}}>
          <div style={{width: 160, height: 1.5, background: C.ouro, margin: '0 auto 22px'}} />
          <div style={{fontFamily: F.titulo, fontWeight: 600, fontSize: 44, letterSpacing: 8, color: C.ouro}}>JOÃO 15,13</div>
        </div>
      </AbsoluteFill>
      <FilmFinish vignette={0.8} />
    </AbsoluteFill>
  );
};

/* =================== CENA 10 — ENCERRAMENTO =================== */
export const S10Final: React.FC<SceneProps> = ({dur, fps}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [4, 70], [0, 1], {...clamp, easing: easeOut});
  const cta = interpolate(frame, [80, 105], [0, 1], clamp);
  const end = interpolate(frame, [dur - 18, dur], [1, 0], clamp);
  return (
    <AbsoluteFill style={{background: C.carvao, opacity: end}}>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 36%, rgba(212,162,76,${0.28 * p}), transparent 55%)`}} />
      <LightRays x={540} y={-160} angle={0} spread={22} count={6} opacity={0.14 * p} />
      <Particles n={45} seed="end" size={[1.5, 4]} speed={0.3} opacity={0.6} />
      <AbsoluteFill style={{alignItems: 'center', top: 330}}>
        <Emblem size={300} p={p} glow={0.8 + 0.2 * Math.sin(frame / 12)} />
        <div style={{marginTop: 60}}><Wordmark size={100} p={p} /></div>
      </AbsoluteFill>
      <AbsoluteFill style={{top: 1440, alignItems: 'center', opacity: cta, padding: '0 90px'}}>
        <div style={{fontFamily: F.legenda, fontWeight: 700, fontSize: 40, lineHeight: 1.3, color: C.pergaminho, textAlign: 'center'}}>
          Compartilhe essa história com alguém que precisa conhecer esse testemunho.
        </div>
        <div style={{marginTop: 30, fontFamily: F.serifa, fontStyle: 'italic', fontWeight: 600, fontSize: 38, color: C.ouroClaro}}>São Maximiliano Kolbe, rogai por nós!</div>
      </AbsoluteFill>
      <FilmFinish vignette={0.7} paper={0.1} />
    </AbsoluteFill>
  );
};
