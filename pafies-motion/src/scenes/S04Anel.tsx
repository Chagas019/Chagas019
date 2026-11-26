/**
 * S04 — O Anel Solidário (frames 705–839, Break). docs/02 §S04.
 * Chega do whip com a fita esticada vibrando como corda; no heartbeat (720) a fita encolhe e
 * vira de frente → é o anel 3D visto de perfil, que inclina e gira com "SOLIDÁRIA ✦".
 * "Solidária" se escreve no centro (750–795); sparkles (780); colapso numa faísca dourada (828–839).
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../design/tokens';
import { AnelTexto, FitaPath, Sparkle } from '../design/elements';
import {
  EXPO_IN,
  EXPO_OUT,
  FLUID,
  PESO,
  TransitionWrap,
  mix,
  onTwos,
  prog,
  rand,
  springAt,
  transitionProgress,
  whipPan,
} from '../motion';
import { useVideoConfig } from 'remotion';
import { S03, S04 } from '../cues';
import { TEXT } from '../content';
import { useLayout, type SceneProps } from '../layout';
import { Backdrop, Camera, ScriptWriteOn, Spark, centeredAt, useSceneFrame } from './shared';

const RING_FONT = 110;
const PARTICLES = 18;

export const S04Anel: React.FC<SceneProps> = ({ layout }) => {
  const f = useSceneFrame('S04');
  const { fps } = useVideoConfig();
  const L = useLayout(layout);
  const { W, H, cx, cy, isV } = L;

  const ringR = isV ? 400 : 520;
  const ringFont = isV ? 96 : RING_FONT;
  const tiltX = isV ? -24 : -18;
  const scriptSize = isV ? 170 : 230;
  const bandH = ringFont * 1.18;

  // ── fita esticada vibrando (705–720), encolhe até o diâmetro do anel e "vira de frente" ──
  const settle = prog(f, S04.whipIn, S04.ringClose, FLUID);
  const vib = Math.sin((f - S04.whipIn) * 1.9) * 26 * (1 - settle) ** 1.5;
  const fold = prog(f, S04.ringClose - 8, S04.ringClose, EXPO_IN);
  const halfLen = mix(W / 2 + 60, ringR, fold);
  const lineW = mix(28, bandH, fold);
  const lineD = `M${cx - halfLen} ${cy} Q ${cx} ${cy + vib * 2} ${cx + halfLen} ${cy}`;

  // ── anel: começa de perfil (rotateX 0 = faixa reta) e inclina com PESO ──
  const ringOn = f >= S04.ringClose;
  const tilt = springAt(f, fps, S04.ringClose, PESO);
  const spinBase = prog(f, S04.ringClose, S04.collapse, FLUID) * 170;
  const spinAccel = prog(f, S04.collapse - 20, S04.collapse, EXPO_IN) * 30;
  const collapse = prog(f, S04.collapse, S04.freeze, EXPO_IN);
  const spinY = spinBase + spinAccel + collapse * 120;
  const ringScale = 1 - collapse;
  const rotZ = (isV ? -6 : -8) + collapse * 180;

  // ── Solidária ──
  const scriptDrift = mix(1, 1.05, prog(f, S04.accelerate, S04.collapse, FLUID));
  const scriptScale = scriptDrift * (1 - collapse);

  // câmera: zoom lento 1.00→1.08
  const zoom = mix(1, 1.08, prog(f, S04.ringClose, S04.collapse, FLUID));
  const whip = transitionProgress(f, S03.whip, S03.whipDur);

  const ringProps = {
    text: TEXT.ringText,
    radius: ringR,
    rotateX: mix(0, tiltX, tilt),
    rotateY: spinY,
    rotateZ: rotZ,
    fontSize: ringFont,
    perspective: 1400,
    width: W,
    height: H,
  };
  // metade da frente do anel (parte de baixo da elipse) desenhada por cima da palavra
  const ang = (rotZ * Math.PI) / 180;
  const frontClip = `polygon(0 ${cy + 4 + Math.tan(ang) * cx}px, ${W}px ${cy + 4 - Math.tan(ang) * cx}px, ${W}px ${H}px, 0 ${H}px)`;

  const tw = onTwos(f);
  const sparkPts = isV
    ? [
        { x: cx - 360, y: cy - 150 },
        { x: cx + 380, y: cy - 90 },
        { x: cx + 60, y: cy + 170 },
      ]
    : [
        { x: cx - 520, y: cy - 150 },
        { x: cx + 540, y: cy - 110 },
        { x: cx + 120, y: cy + 180 },
      ];

  const ring = (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${ringScale})`, transformOrigin: `${cx}px ${cy}px` }}>
      <AnelTexto {...ringProps} />
    </div>
  );

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <TransitionWrap presentation={whipPan({ direction: isV ? 'up' : 'left' })} progress={whip} role="entering">
        <Backdrop variant="night" frame={f} width={W} height={H} blobs={0.35} />
      </TransitionWrap>
      <Camera frame={f} scale={zoom}>
        {!ringOn && (
          <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <FitaPath d={lineD} start={0} end={1} width={lineW} glow={0.7} taper={false} />
          </svg>
        )}
        {ringOn && collapse < 1 && ring}

        {/* partículas âmbar sugadas para o centro */}
        {f >= S04.accelerate &&
          f < S04.freeze &&
          Array.from({ length: PARTICLES }, (_, i) => {
            const start = S04.accelerate + rand(`s04-p${i}`, 0, 22);
            const t = prog(tw, start, start + 14, EXPO_IN);
            if (t <= 0 || t >= 1) return null;
            const a = rand(`s04-a${i}`, 0, Math.PI * 2);
            const d = mix(rand(`s04-d${i}`, 380, 760), 0, t);
            return (
              <div
                key={i}
                style={{
                  ...centeredAt(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.6),
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: COLORS.amber,
                  opacity: 0.9,
                }}
              />
            );
          })}

        {collapse < 1 && (
          <div style={{ ...centeredAt(cx, cy), transform: `translate(-50%, -50%) scale(${scriptScale}) rotate(${collapse * 90}deg)` }}>
            <ScriptWriteOn text={TEXT.solidariaScript} frame={f} start={S04.writeOn} end={S04.writeOnEnd} fontSize={scriptSize} />
          </div>
        )}

        {ringOn && collapse < 1 && <div style={{ position: 'absolute', inset: 0, clipPath: frontClip, WebkitClipPath: frontClip }}>{ring}</div>}

        {/* sparkles dourados (on twos) */}
        {sparkPts.map((p, i) => {
          const at = S04.sparkles + i * 4;
          const t = prog(tw, at, at + 10);
          if (t <= 0 || t >= 1 || collapse > 0) return null;
          return <Sparkle key={i} size={isV ? 56 : 70} scale={Math.sin(Math.PI * t)} rotation={45 * t} color={i === 1 ? COLORS.white : COLORS.goldLight} style={{ ...centeredAt(p.x, p.y) }} />;
        })}

        {/* faísca dourada final (congelada 836–839) */}
        {collapse > 0.6 && <Spark x={cx} y={cy} scale={mix(0.4, 1, prog(f, S04.collapse + 4, S04.freeze, EXPO_OUT))} core={COLORS.goldLight} halo={COLORS.gold} coreRadius={6} />}
      </Camera>
    </AbsoluteFill>
  );
};

export default S04Anel;
