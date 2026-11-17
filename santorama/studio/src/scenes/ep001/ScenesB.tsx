// EP001 v2 — cenas 6 a 10 na linguagem flat/chibi.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C, F} from '../../brand/tokens';
import {Emblem, Wordmark} from '../../brand/Logo';
import {Camera, easeOut, Layer, Particles} from '../../core/cinema';
import {FlatFinish, PlaceTag} from '../../core/flat';
import {Chibi, KOLBE_HABITO, KOLBE_PRISIONEIRO, OUT, Sparkle} from '../../characters/Chibi';
import {Note, Sunburst, SW} from './Props';
import {clamp, fadeIn, Row, SceneProps, Svg, Yard} from './ScenesA';

/* ============ CENA 6 — O SACRIFÍCIO ============ */
export const S6Sacrificio: React.FC<SceneProps> = ({dur, ev, fps}) => {
  const frame = useCurrentFrame();
  const sf = Math.round(ev.stepForward * fps);
  const walkEnd = sf + Math.round(2.2 * fps);
  const cut = walkEnd + 4;
  const k = interpolate(frame, [sf, walkEnd], [0, 1], {...clamp, easing: easeOut});
  const walk = frame > sf && frame < walkEnd ? (frame - sf) * 0.32 : 0;
  const close = fadeIn(frame, cut - 6, cut + 6);
  const glow = fadeIn(frame, cut, dur);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: 1 - close}}>
        <Camera kf={[{f: 0, x: 0, y: 260, z: 1.3}, {f: sf, x: 0, y: 280, z: 1.35}, {f: walkEnd, x: 0, y: 420, z: 1.6}]} shake={0.5}>
          <Layer depth={0.2}><Yard /></Layer>
          <Layer depth={0.75}><Svg><Row y={1380} h={350} n={12} x0={-330} gap={160} seed="r2" /></Svg></Layer>
          <Layer depth={0.95}><Svg>
            <Row y={1540} h={410} n={11} x0={-360} gap={180} seed="r3" skip={[4]} pai={5} grief={1} />
            <Chibi {...KOLBE_PRISIONEIRO} x={360 + 180 * k} y={1540 + 200 * k} h={410 + 120 * k} walk={walk}
              expression={k > 0.95 ? 'determinado' : 'sereno'} seed="k6" />
          </Svg></Layer>
          <Layer depth={1.3}><Svg>
            <Chibi outfit="guarda" hair="none" cap="capacete" x={60} y={2160} h={700} expression="serio" seed="g1" />
            <Chibi outfit="guarda" hair="none" cap="capacete" x={1030} y={2180} h={720} expression="serio" seed="g2" flip />
          </Svg></Layer>
        </Camera>
        <PlaceTag text="BLOCO 14 · 29 JUL 1941" />
      </AbsoluteFill>
      <AbsoluteFill style={{opacity: close}}>
        <Camera kf={[{f: cut, x: 0, y: 0, z: 1.0}, {f: dur, x: 0, y: -40, z: 1.1}]} shake={0.4}>
          <Layer depth={0.2}><Svg>
            <Sunburst cx={540} cy={760} a="#5E7088" b="#6B7E98" n={20} />
            <circle cx={540} cy={760} r={420 * glow} fill="#FFE29A" opacity={0.55 * glow} />
          </Svg></Layer>
          <Layer depth={1}><Svg>
            <Chibi {...KOLBE_PRISIONEIRO} x={540} y={2050} h={1650} expression="determinado" seed="k6c" />
            <Sparkle x={250} y={480} r={40} /><Sparkle x={830} y={560} r={30} phase={2} />
          </Svg></Layer>
        </Camera>
      </AbsoluteFill>
      <FlatFinish />
    </AbsoluteFill>
  );
};

/* ============ CENA 7 — A ÚLTIMA PROVA ============ */
export const S7UltimaProva: React.FC<SceneProps> = ({dur, ev, fps}) => {
  const frame = useCurrentFrame();
  const dc = Math.round(ev.doorClose * fps);
  const outside = fadeIn(frame, dc - 34, dc - 24);
  const slide = interpolate(frame, [dc - 24, dc], [0, 1], {...clamp, easing: (t) => t * t});
  const after = fadeIn(frame, dc + 10, dc + 38);
  const white = fadeIn(frame, dur - 16, dur);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{opacity: 1 - outside}}>
        <Camera kf={[{f: 0, x: 0, y: 160, z: 1.05}, {f: dc - 24, x: 0, y: 220, z: 1.25}]} shake={0.4}>
          <Layer depth={0.2}><Svg>
            <rect x={-300} y={-300} width={1680} height={2600} fill="#3A3E47" />
            {Array.from({length: 9}, (_, i) => <rect key={i} x={-300} y={200 + i * 150} width={1680} height={4} fill="#2E3139" />)}
            <rect x={700} y={420} width={170} height={110} fill="#9FB7D6" stroke={OUT} strokeWidth={SW} />
            {[740, 785, 830].map((x) => <rect key={x} x={x} y={420} width={10} height={110} fill={OUT} />)}
            <polygon points="700,530 870,530 620,1500 120,1500" fill="#C9D9EE" opacity={0.18} />
            <rect x={-300} y={1500} width={1680} height={900} fill="#2B2E35" stroke={OUT} strokeWidth={SW} />
          </Svg></Layer>
          <Layer depth={0.6}><Svg>
            <Chibi outfit="listrado" hair="curto" x={120} y={1640} h={420} expression="triste" eyesClosed seed="b1" opacity={0.85} />
            <Chibi outfit="listrado" hair="curto" x={960} y={1650} h={430} expression="triste" seed="b2" opacity={0.85} flip />
          </Svg></Layer>
          <Layer depth={0.9}><Svg>
            <circle cx={540} cy={1180} r={330} fill="#FFE29A" opacity={0.22} />
            <Chibi {...KOLBE_PRISIONEIRO} x={540} y={1760} h={760} arms="pray" eyesClosed expression="sereno" seed="k7" />
            {Array.from({length: 6}, (_, i) => {
              const t = (frame + i * 22) % 130;
              return <Note key={i} x={380 + (i % 3) * 150 + Math.sin(t / 15 + i) * 30} y={1000 - t * 4} s={1.1} o={Math.sin((t / 130) * Math.PI)} />;
            })}
          </Svg></Layer>
        </Camera>
        <PlaceTag text="BLOCO 11 · BUNKER" />
      </AbsoluteFill>
      <AbsoluteFill style={{opacity: outside}}>
        <Svg>
          <rect x={0} y={0} width={1080} height={1920} fill="#23252B" />
          <rect x={260} y={560} width={560} height={1060} fill="#FFE29A" stroke={OUT} strokeWidth={SW} />
          <Chibi {...KOLBE_PRISIONEIRO} x={540} y={1560} h={520} arms="pray" eyesClosed seed="k7b" opacity={0.9} />
          <g transform={`translate(${-560 + 560 * slide} 0)`}>
            <rect x={260} y={560} width={560} height={1060} fill="#5B616C" stroke={OUT} strokeWidth={SW} />
            {[700, 1060, 1420].map((y) => <rect key={y} x={260} y={y} width={560} height={26} fill="#474C55" stroke={OUT} strokeWidth={4} />)}
            {Array.from({length: 12}, (_, i) => <circle key={i} cx={300 + (i % 6) * 96} cy={713 + Math.floor(i / 6) * 720} r={7} fill={OUT} />)}
            <rect x={720} y={1060} width={60} height={110} rx={10} fill="#3A3E47" stroke={OUT} strokeWidth={4} />
          </g>
          <rect x={0} y={540} width={262} height={1100} fill="#23252B" />
          <rect x={818} y={540} width={262} height={1100} fill="#23252B" />
          <rect x={250} y={550} width={580} height={1080} fill="none" stroke={OUT} strokeWidth={14} />
        </Svg>
        <AbsoluteFill style={{top: 820, alignItems: 'center', opacity: after}}>
          <div style={{background: '#F4F0E6', border: `6px solid ${OUT}`, borderRadius: 10, padding: '14px 36px', boxShadow: `0 10px 0 ${OUT}`, transform: `rotate(-2deg) scale(${0.9 + 0.1 * after})`}}>
            <div style={{fontFamily: F.titulo, fontWeight: 700, fontSize: 84, color: OUT, letterSpacing: 4}}>14 · VIII · 1941</div>
          </div>
        </AbsoluteFill>
        <PlaceTag text="AUSCHWITZ · BLOCO 11" />
      </AbsoluteFill>
      <AbsoluteFill style={{background: '#FFF3D6', opacity: white}} />
      <FlatFinish />
    </AbsoluteFill>
  );
};

/* ============ CENA 8 — A MENSAGEM ============ */
const Crown: React.FC<{color: string; x: number; y: number; s?: number}> = ({color, x, y, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-80,40 L-80,-10 L-50,10 L-26,-40 L0,4 L26,-40 L50,10 L80,-10 L80,40 Z" fill={color} stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
    <rect x={-84} y={34} width={168} height={22} rx={6} fill={color} stroke={OUT} strokeWidth={6} />
    {[-26, 26].map((cx) => <circle key={cx} cx={cx} cy={-44} r={9} fill="#FFE29A" stroke={OUT} strokeWidth={4} />)}
  </g>
);

export const S8Mensagem: React.FC<SceneProps> = ({dur}) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [0, 26], [0, 1], {...clamp, easing: easeOut});
  const crowns = interpolate(frame, [28, 60], [0, 1], {...clamp, easing: easeOut});
  const label = fadeIn(frame, 64, 88);
  const bob = Math.sin(frame / 18) * 12;
  return (
    <AbsoluteFill>
      <Camera kf={[{f: 0, x: 0, y: 0, z: 1.2}, {f: dur, x: 0, y: 30, z: 1.04}]} shake={0.3}>
        <Layer depth={0.1}><Svg><Sunburst cx={540} cy={820} a="#E9B44C" b="#F2C766" n={22} speed={0.4} /></Svg></Layer>
        <Layer depth={1}><Svg>
          <Chibi {...KOLBE_HABITO} x={540} y={1620} h={1020 * (0.85 + 0.15 * inP)} arms="open" expression="gentil" halo={inP} seed="k8" />
        </Svg></Layer>
        <Layer depth={1.1}><Svg>
          <g opacity={crowns}>
            <Crown color="#F6F2E8" x={230} y={560 + bob - 120 * (1 - crowns)} s={0.95} />
            <Crown color="#B5352A" x={850} y={560 - bob - 120 * (1 - crowns)} s={0.95} />
            <Sparkle x={320} y={500} r={34} /><Sparkle x={770} y={490} r={34} phase={1.5} />
          </g>
        </Svg></Layer>
        <Layer depth={1.2}><Particles n={30} seed="g8" color="#FFF6DA" size={[3, 6]} speed={0.5} glow={false} opacity={0.8} /></Layer>
      </Camera>
      <AbsoluteFill style={{top: 1680, alignItems: 'center', opacity: label}}>
        <div style={{background: C.martirio, border: `6px solid ${OUT}`, borderRadius: 10, padding: '14px 34px', boxShadow: `0 8px 0 ${OUT}`, transform: `scale(${0.9 + 0.1 * label})`}}>
          <div style={{fontFamily: F.titulo, fontWeight: 700, fontSize: 48, color: '#F6EFD9', letterSpacing: 6}}>MÁRTIR DA CARIDADE</div>
        </div>
        <div style={{fontFamily: F.serifa, fontStyle: 'italic', fontWeight: 700, fontSize: 32, color: OUT, marginTop: 16}}>canonizado por São João Paulo II · 1982</div>
      </AbsoluteFill>
      <FlatFinish vignette={0.2} />
    </AbsoluteFill>
  );
};

/* ============ CENA 9 — VERSÍCULO ============ */
export const S9Versiculo: React.FC<SceneProps & {cue?: {words: {w: string; start: number}[]}; sceneStart?: number}> = ({dur, cue, sceneStart = 0, fps}) => {
  const frame = useCurrentFrame();
  const t = frame / fps + sceneStart;
  const words = (cue?.words ?? []).map((w) => ({...w, w: w.w.replace(/[“”]/g, '')}));
  const card = interpolate(frame, [0, 16], [0, 1], {...clamp, easing: easeOut});
  const ref = fadeIn(frame, dur - 70, dur - 45);
  return (
    <AbsoluteFill>
      <Svg><Sunburst cx={540} cy={960} a="#3B2A1E" b="#47332A" n={20} speed={0.2} /></Svg>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{width: 880, background: '#F4EAD4', border: `7px solid ${OUT}`, borderRadius: 18, boxShadow: `0 14px 0 ${OUT}`, transform: `scale(${0.8 + 0.2 * card}) rotate(${-1.5 * card}deg)`, opacity: card, overflow: 'hidden'}}>
          <div style={{height: 70, background: C.martirio, borderBottom: `6px solid ${OUT}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <svg width={24} height={34} viewBox="0 0 18 24"><rect x={7} y={0} width={4} height={24} fill="#F6EFD9" /><rect x={0} y={6} width={18} height={4} fill="#F6EFD9" /></svg>
          </div>
          <div style={{padding: '50px 56px 46px', textAlign: 'center'}}>
            <div style={{fontFamily: F.serifa, fontStyle: 'italic', fontWeight: 700, fontSize: 70, lineHeight: 1.18, color: OUT}}>
              {words.map((w, i) => {
                const k = interpolate(t, [w.start - 0.1, w.start + 0.2], [0, 1], clamp);
                const gold = ['amor', 'maior', 'vida', 'amigos.'].includes(w.w);
                return <span key={i} style={{display: 'inline-block', marginRight: 16, opacity: k, transform: `translateY(${(1 - k) * 12}px)`, color: gold ? C.martirio : undefined}}>{w.w}</span>;
              })}
            </div>
            <div style={{marginTop: 30, opacity: ref, fontFamily: F.titulo, fontWeight: 700, fontSize: 40, letterSpacing: 6, color: C.terra}}>JOÃO 15,13</div>
          </div>
        </div>
      </AbsoluteFill>
      <FlatFinish />
    </AbsoluteFill>
  );
};

/* ============ CENA 10 — ENCERRAMENTO ============ */
export const S10Final: React.FC<SceneProps> = ({dur}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [4, 70], [0, 1], {...clamp, easing: easeOut});
  const cta = fadeIn(frame, 80, 105);
  const end = interpolate(frame, [dur - 18, dur], [1, 0], clamp);
  return (
    <AbsoluteFill style={{background: C.carvao, opacity: end}}>
      <Svg><Sunburst cx={540} cy={640} a="#15100C" b="#1E1712" n={24} speed={0.2} /></Svg>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 33%, rgba(212,162,76,${0.25 * p}), transparent 50%)`}} />
      <AbsoluteFill style={{alignItems: 'center', top: 330}}>
        <Emblem size={300} p={p} glow={0.8 + 0.2 * Math.sin(frame / 12)} />
        <div style={{marginTop: 60}}><Wordmark size={100} p={p} /></div>
      </AbsoluteFill>
      <AbsoluteFill style={{top: 1400, alignItems: 'center', opacity: cta, padding: '0 90px'}}>
        <div style={{fontFamily: F.legenda, fontWeight: 800, fontSize: 42, lineHeight: 1.3, color: C.pergaminho, textAlign: 'center'}}>
          Compartilhe essa história com alguém que precisa conhecer esse testemunho.
        </div>
        <div style={{marginTop: 30, fontFamily: F.serifa, fontStyle: 'italic', fontWeight: 600, fontSize: 38, color: C.ouroClaro}}>São Maximiliano Kolbe, rogai por nós!</div>
      </AbsoluteFill>
      <FlatFinish vignette={0.4} />
    </AbsoluteFill>
  );
};
