/**
 * S05 — Dez (frames 828–959, Drop 2). docs/02 §S05.
 * Impacto máximo (840): "10ª" dourado cai em escala 3→1 (PESO), sunburst + speed lines;
 * "EDIÇÃO" sobe letra a letra (870); giro 360° em Y com espessura (900); o "0" centraliza e a
 * câmera mergulha no miolo dele (930–959) — a S06 nasce de dentro do "0".
 */
import React from 'react';
import { AbsoluteFill, Easing, useVideoConfig } from 'remotion';
import { COLORS, GRADIENTS, TRACKING } from '../design/tokens';
import { FONT_DISPLAY, FONT_SANS } from '../design/fonts';
import { Sparkle, SpeedLines } from '../design/elements';
import {
  EXPO_IN,
  EXPO_OUT,
  FLUID,
  KineticText,
  PESO,
  SNAP,
  mix,
  onTwos,
  prog,
  springAt,
  toSceneFrame,
  useBeatPulse,
} from '../motion';
import { S05 } from '../cues';
import { TEXT } from '../content';
import { useLayout, type SceneProps } from '../layout';
import { Backdrop, Camera, ImpactRings, SplashAt, centeredAt, useSceneFrame } from './shared';

/** Escala máxima do mergulho — a mesma usada no zoomDive de entrada da S06 (PafiesFilme). */
export const DIVE_MAX_SCALE = 18;
/** Raio do miolo do "0" (fração do fontSize) — buraco por onde a S06 aparece. */
export const ZERO_HOLE = 0.15;
/** Âncora do "0" (centro do miolo) no fim da S05, por layout — usada pelo zoomDive da S06. */
export const zeroAnchor = (isV: boolean, W: number, H: number) => (isV ? { x: W / 2, y: 860 } : { x: W / 2, y: H / 2 });
export const dezSize = (isV: boolean) => (isV ? 300 : 360);

/** Vertical: deslocamento do centro da caixa do glifo até o centro visual do "0" (fração do fontSize). */
const ZERO_Y_FIX = 0.005;
/** Distância do centro do "0" até o centro óptico de "10ª" (o "1" é mais largo que o "ª"). */
const GROUP_SHIFT = 0.085;
const DEPTH_LAYERS = 6;
/** QA: giro arranca NO hit (900) e desacelera — o SNAP simétrico só girava em 904–910 (pico 7 f depois do hit). */
const SPIN_EASE = Easing.bezier(0.25, 0.55, 0.3, 1);

const SUNBURST_SLICES = 24;
const SUNBURST_DEG_PER_FRAME = 10 / 30; // 10°/s

const Sunburst: React.FC<{ x: number; y: number; r: number; rot: number }> = ({ x, y, r, rot }) => {
  const step = 360 / SUNBURST_SLICES;
  const wedges = [];
  for (let i = 0; i < SUNBURST_SLICES; i += 2) {
    const a0 = (i * step * Math.PI) / 180;
    const a1 = ((i + 1) * step * Math.PI) / 180;
    wedges.push(<path key={i} d={`M0 0 L${Math.cos(a0) * r} ${Math.sin(a0) * r} L${Math.cos(a1) * r} ${Math.sin(a1) * r} Z`} fill={COLORS.navySoft} />);
  }
  return (
    <svg width={r * 2} height={r * 2} viewBox={`${-r} ${-r} ${r * 2} ${r * 2}`} style={{ position: 'absolute', left: x - r, top: y - r, opacity: 0.75 }}>
      <g transform={`rotate(${rot})`}>{wedges}</g>
    </svg>
  );
};

/** "10ª" com o "0" como âncora (centro do span = centro do "0"). */
const DezGlyphs: React.FC<{ size: number; spin: number; depth: number }> = ({ size, spin, depth }) => {
  const base: React.CSSProperties = {
    fontFamily: FONT_DISPLAY,
    fontWeight: 900,
    fontSize: size,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    whiteSpace: 'pre',
  };
  const face = (paint: React.CSSProperties, key: string, z: number, dy = 0) => (
    <div key={key} style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(0, ${dy}px, ${z}px)` }}>
      <span style={{ position: 'relative', display: 'inline-block', ...base }}>
        <span style={{ position: 'absolute', right: '96%', top: 0, ...paint }}>{TEXT.dez[0]}</span>
        <span style={paint}>{TEXT.dez[1]}</span>
        <span style={{ position: 'absolute', left: '104%', top: size * 0.04, fontSize: size * 0.42, ...paint }}>
          {TEXT.ordinal}
          {/* traço sublinhado do ordinal (docs/01 §3) */}
          <span style={{ position: 'absolute', left: '8%', right: '8%', top: '84%', height: size * 0.035, borderRadius: size * 0.02, background: paint.color === 'transparent' ? GRADIENTS.gold : paint.color, opacity: paint.opacity }} />
        </span>
      </span>
    </div>
  );
  const gold: React.CSSProperties = {
    backgroundImage: GRADIENTS.gold,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  };
  // contorno goldDeep atrás da face (WebkitTextStroke na frente mostra contornos internos sobrepostos do "1")
  const outline: React.CSSProperties = { color: COLORS.goldDeep, WebkitTextStroke: `8px ${COLORS.goldDeep}` };
  return (
    <div style={{ position: 'relative', transformStyle: 'preserve-3d', transform: `rotateY(${spin}deg)` }}>
      {/* sombra sólida (esmalte) */}
      {face({ color: COLORS.navyNight }, 'shadow', -DEPTH_LAYERS * 2 - 1, 10)}
      {/* espessura: camadas goldDeep empilhadas em Z (aparecem no giro) */}
      {Array.from({ length: DEPTH_LAYERS }, (_, i) => face({ color: COLORS.goldDeep, opacity: depth }, `d${i}`, -(i + 1) * 2))}
      {face(outline, 'outline', -0.5)}
      {face(gold, 'front', 0)}
      {/* caixa invisível para o tamanho (o "0") */}
      <span style={{ ...base, visibility: 'hidden' }}>{TEXT.dez[1]}</span>
    </div>
  );
};

export const S05Dez: React.FC<SceneProps> = ({ layout }) => {
  const f = useSceneFrame('S05');
  const { fps } = useVideoConfig();
  const L = useLayout(layout);
  const { W, H, cx, isV } = L;
  if (f < S05.dez) return null; // 828–839: overlap com o colapso do S04 (S04 aparece)

  const size = dezSize(isV);
  const anchor = zeroAnchor(isV, W, H);
  const restY = isV ? anchor.y : 470;
  const center = prog(f, S05.edicaoOut, S05.dive, SNAP);
  const zx = anchor.x + GROUP_SHIFT * size * (1 - center);
  const zy = mix(restY, anchor.y, center);
  const edicaoY = isV ? 1120 : 760;

  // pouso 3.0 → 1.0 com PESO (pico no 840, assenta ~846)
  const land = springAt(f, fps, S05.dez, PESO, { durationInFrames: 22 });
  const kick = useBeatPulse(f, 'kick', { decay: 10 });
  const scale = mix(3, 1, land) * (1 + 0.03 * kick);

  // antecipação (892–899) e giro 360° (900–918): começa no hit, desacelera (SPIN_EASE)
  const antic = prog(f, S05.spinAntic, S05.spin, EXPO_OUT);
  const spinT = prog(f, S05.spin, S05.spin + S05.spinDur, SPIN_EASE);
  const spin = -20 * antic * (1 - spinT) + 360 * spinT;
  const depth = Math.min(1, Math.abs(Math.sin((spin * Math.PI) / 180)) * 3);

  // mergulho no "0"
  const dive = prog(f, S05.dive, S05.diveEnd, EXPO_IN);
  const camScale = mix(1, DIVE_MAX_SCALE, dive) * mix(1, 1.03, prog(f, S05.dez, S05.dive, FLUID));

  const tw = onTwos(f);
  const sparkAt = S05.spin + S05.spinDur;
  const sparkPts = [
    { x: -0.9, y: -0.55 },
    { x: 1.05, y: -0.45 },
    { x: -0.75, y: 0.5 },
    { x: 0.95, y: 0.55 },
  ];

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Backdrop variant="navy" frame={f} width={W} height={H} blobs={0} />
      <Camera frame={f} scale={camScale} originX={anchor.x} originY={anchor.y} shakeScale={1}>
        <Sunburst x={zx} y={zy} r={L.long} rot={(f - S05.dez) * SUNBURST_DEG_PER_FRAME} />
        <SpeedLines
          width={W}
          height={H}
          cx={zx}
          cy={zy}
          seed={`s05-${tw}`}
          count={56}
          progress={0.45}
          innerRadius={size * 0.85}
          outerRadius={L.long * 0.8}
          colors={[COLORS.white, COLORS.electricLight, COLORS.white]}
          opacity={mix(1, 0.55, prog(f, S05.dez + 30, S05.edicao, FLUID))}
          thickness={9}
        />
        <ImpactRings frame={f} at={S05.dez} x={zx} y={zy} radius={700} dur={16} colors={[COLORS.goldLight, COLORS.gold, COLORS.goldLight]} stroke={8} />
        <SplashAt frame={f} at={S05.dez} x={zx} y={zy} count={14} spread={560} dropSize={20} seed="s05-dez" colors={[COLORS.orange, COLORS.amber, COLORS.gold, COLORS.goldLight]} canvas={1600} />

        <div style={{ ...centeredAt(zx, zy + ZERO_Y_FIX * size), perspective: 1200 }}>
          <div style={{ transform: `scale(${scale})`, transformStyle: 'preserve-3d' }}>
            <DezGlyphs size={size} spin={spin} depth={depth} />
          </div>
        </div>

        {sparkPts.map((p, i) => {
          const t = prog(tw, sparkAt + i, sparkAt + i + 10);
          if (t <= 0 || t >= 1) return null;
          return (
            <Sparkle
              key={i}
              size={size * 0.22}
              scale={Math.sin(Math.PI * t)}
              rotation={45 * t}
              color={i % 2 ? COLORS.white : COLORS.goldLight}
              style={{ ...centeredAt(zx + p.x * size, zy + p.y * size) }}
            />
          );
        })}

        <div style={{ ...centeredAt(cx, edicaoY) }}>
          <KineticText
            text={TEXT.edicao}
            mode="rise"
            startFrame={toSceneFrame('S05', S05.edicao)}
            stagger={2}
            fontFamily={FONT_SANS}
            fontWeight={600}
            fontSize={isV ? 72 : 80}
            letterSpacing={TRACKING.edicao}
            shadow={`0 4px 0 ${COLORS.navyNight}`}
            exitFrame={toSceneFrame('S05', S05.edicaoOut)}
            exit="down"
            exitDuration={8}
            seed="s05-edicao"
            style={{ paddingLeft: TRACKING.edicao }}
          />
        </div>
      </Camera>
    </AbsoluteFill>
  );
};

export default S05Dez;
