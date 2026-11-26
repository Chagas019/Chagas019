/**
 * S06 — O Encontro (Selo) (frames 945–1139, Finale/Outro). docs/02 §S06.
 * A borda dourada vinda do "0" vira o selo ondulado (960); uma gota turquesa vira o coração (990);
 * duas pessoas atrás do coração estendem os braços e a fita amarra as mãos num laço (1020);
 * lockup GINCANA / Solidária / PAFIES / 10ª EDIÇÃO; hit final (1080) e hold vivo até 1139.
 *
 * Tudo é desenhado no "espaço do selo" (base 1920×1080, centro do selo na origem) e, no vertical,
 * reposicionado/escalado para R = 470 em (540, 900) — tipografia interna proporcional ao R.
 */
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { COLORS, GRADIENTS, TRACKING } from '../design/tokens';
import { FONT_DISPLAY, FONT_SANS } from '../design/fonts';
import { Coracao, FitaPath, Pessoa, Selo, Sparkle, pessoaHandPosition } from '../design/elements';
import {
  EXPO_IN,
  EXPO_OUT,
  FLUID,
  GELATINA,
  KineticText,
  PESO,
  anticipate,
  breathe,
  mix,
  onTwos,
  prog,
  springAt,
  toSceneFrame,
  useBeatPulse,
} from '../motion';
import { S06 } from '../cues';
import { TEXT } from '../content';
import { useLayout, type SceneProps } from '../layout';
import { Backdrop, Camera, ImpactRings, ScriptWriteOn, StitchLine, centeredAt, cometTrim, headLength, makeRoute, sansStyle, useSceneFrame } from './shared';

// ── layout do selo (espaço do selo, px na base 1920×1080; origem = centro do selo) ──
const SEAL_R = 460;
const SEAL_R_V = 470;
const SEAL_SIZE = (SEAL_R * 2) / 0.903; // <Selo>: contorno externo ≈ 0,903 × size/2
const HEART = { x: 0, y: -230, w: 380 };
const MEET = { x: 0, y: -318 }; // mãos se encontram sobre o vão do coração (pessoas abraçam o coração pela frente)
const PERSON_SIZE = 400;
const PERSON_REACH = 1;
const TYPE = {
  gincana: { y: -15, size: 124 },
  solidaria: { y: 100, size: 150 },
  pafies: { y: 225, size: 72 },
  edicao: { y: 305, size: 44 },
};
const local = (abs: number) => toSceneFrame('S06', abs);

/** Laço da fita em volta das mãos (dois olhos + duas pontas pendentes). */
const Bow: React.FC<{ frame: number }> = ({ frame }) => {
  const draw = prog(frame, S06.meet, S06.meet + 10, EXPO_OUT);
  if (draw <= 0) return null;
  const decay = Math.exp(-(frame - S06.meet) / 40);
  const swing = 14 * Math.sin((frame - S06.meet) * 0.22) * decay + 3 * breathe(frame, 60);
  const { x, y } = MEET;
  const loopL = `M${x} ${y} C${x - 30} ${y - 60} ${x - 110} ${y - 40} ${x - 90} ${y + 4} C${x - 70} ${y + 40} ${x - 20} ${y + 16} ${x} ${y}`;
  const loopR = `M${x} ${y} C${x + 30} ${y - 60} ${x + 110} ${y - 40} ${x + 90} ${y + 4} C${x + 70} ${y + 40} ${x + 20} ${y + 16} ${x} ${y}`;
  const tail = (side: number) => {
    const a = ((swing * side + 12 * side) * Math.PI) / 180;
    const ex = x + Math.sin(a) * 120;
    const ey = y + Math.cos(a) * 120;
    return `M${x} ${y} Q ${x + side * 30} ${y + 60} ${ex} ${ey}`;
  };
  return (
    <g>
      <FitaPath d={tail(-1)} start={0} end={draw} width={18} glow={0.3} taper={false} />
      <FitaPath d={tail(1)} start={0} end={draw} width={18} glow={0.3} taper={false} />
      <FitaPath d={loopL} start={0} end={draw} width={20} glow={0.4} taper={false} />
      <FitaPath d={loopR} start={0} end={draw} width={20} glow={0.4} taper={false} />
      <circle cx={x} cy={y} r={14 * draw} fill={COLORS.orange} stroke={COLORS.navyNight} strokeWidth={3} />
    </g>
  );
};

/** Conteúdo do selo, desenhado com a origem no centro do selo. */
const SealContent: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  // selo: draw-on 948→1000 girando −30°→0°
  const draw = prog(f, S06.sealDrawStart, S06.sealDrawEnd, EXPO_OUT);
  const rot = mix(-30, 0, draw);
  const shimmer = f >= S06.shimmerStart && f <= S06.shimmerEnd ? prog(f, S06.shimmerStart, S06.shimmerEnd, FLUID) : undefined;

  // coração: gota cai (975→984), espalha e assenta no bloop (990)
  const fall = prog(f, S06.dropFall, S06.heartSettle - 6, EXPO_IN);
  const splat = springAt(f, fps, S06.heartSettle - 6, GELATINA);
  const morph = prog(f, S06.heartSettle - 6, S06.heartSettle, EXPO_OUT);
  const meetPulse = useBeatPulse(f, 'chime', { decay: 14 }) * (f >= S06.meet ? 1 : 0);
  const heartY = mix(-700, HEART.y, fall);
  const heartScale = f < S06.heartSettle - 6 ? 0.28 : mix(0.28, 1, splat);

  // pessoas: deslizam das laterais (antecipação 4 f) e erguem os braços
  const slide = anticipate(f, S06.peopleIn - 4, 4, S06.armsUp, 400, 0, 0.06, EXPO_OUT);
  const reach = mix(0, PERSON_REACH, prog(f, S06.armsUp, S06.meet, EXPO_OUT));
  const hand = pessoaHandPosition(PERSON_SIZE, PERSON_REACH);
  const pw = (PERSON_SIZE * 200) / 240;
  const personTop = MEET.y - hand.y;
  const leftA = MEET.x - hand.x + 6;
  const leftB = MEET.x + hand.x - pw - 6;

  // fita: entra pela esquerda, contorna o selo por dentro e chega às mãos
  const ribbonRoute = React.useMemo(() => {
    const pts = [{ x: -1100, y: 160 }, { x: -520, y: 40 }];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (1.02 + (i / 8) * 0.38);
      pts.push({ x: Math.cos(a) * 395, y: Math.sin(a) * 395 });
    }
    pts.push({ x: -110, y: -420 }, MEET);
    return makeRoute(pts);
  }, []);
  const head = headLength(f, ribbonRoute, [
    [S06.ribbonIn - 8, 0],
    [S06.meet - 1, ribbonRoute.knots.length - 1],
  ]);
  const tailRetract = prog(f, S06.meet - 2, S06.meet + 8, EXPO_IN);
  const trim = cometTrim(ribbonRoute, head, 900 * (1 - tailRetract));

  const persons = (
    <>
      <Pessoa size={PERSON_SIZE} reach={reach} variant="A" lean={2 * breathe(f, 60)} style={{ position: 'absolute', left: leftA - slide, top: personTop }} />
      <Pessoa size={PERSON_SIZE} reach={reach} variant="B" flip lean={-2 * breathe(f, 60, 15)} style={{ position: 'absolute', left: leftB + slide, top: personTop }} />
    </>
  );

  return (
    <>
      <div style={{ ...centeredAt(0, 0), transform: `translate(-50%, -50%) rotate(${rot}deg)` }}>
        <Selo size={SEAL_SIZE} draw={draw} fill={1} wobble={0.3 * breathe(f, 120)} shimmer={shimmer} />
      </div>

      {f >= S06.dropFall && (
        <div style={{ ...centeredAt(HEART.x, heartY), transform: `translate(-50%, -50%) scale(${heartScale})` }}>
          <Coracao
            size={HEART.w}
            morph={morph}
            wave={f / 9}
            pulse={0.08 * meetPulse + 0.025 * (0.5 + 0.5 * breathe(f, 60))}
            seed="s06-heart"
            blobPhase={f / 60}
          />
        </div>
      )}

      {/* pessoas à frente do coração, abraçando-o (adaptação: atrás dele os braços sumiriam) */}
      {f >= S06.peopleIn - 4 && persons}

      <svg width={1} height={1} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        {f >= S06.ribbonIn - 8 && trim.end > trim.start && f < S06.meet + 8 && (
          <FitaPath d={ribbonRoute.d} start={trim.start} end={trim.end} width={24} glow={0.6} />
        )}
        <Bow frame={f} />
      </svg>
      <ImpactRings frame={f} at={S06.meet} x={MEET.x} y={MEET.y} radius={220} colors={[COLORS.teal, COLORS.orange]} stroke={5} />

      {/* tipografia do lockup */}
      <div style={{ ...centeredAt(0, TYPE.gincana.y) }}>
        <KineticText
          text={TEXT.gincana}
          mode="slam"
          startFrame={local(S06.gincana)}
          stagger={2}
          slamScale={1.8}
          slamFrames={5}
          fontFamily={FONT_DISPLAY}
          fontSize={TYPE.gincana.size}
          seed="s06-gincana"
        />
      </div>
      <div style={{ ...centeredAt(0, TYPE.solidaria.y) }}>
        <ScriptWriteOn text={TEXT.solidariaScript} frame={f} start={S06.solidaria} end={S06.solidaria + 30} fontSize={TYPE.solidaria.size} />
      </div>
      {f >= S06.pafies && (
        <div
          style={{
            ...centeredAt(0, TYPE.pafies.y + 30 * (1 - prog(f, S06.pafies, S06.pafies + 10, EXPO_OUT))),
            clipPath: `inset(${100 * (1 - prog(f, S06.pafies, S06.pafies + 10, EXPO_OUT))}% -10% -20% -10%)`,
          }}
        >
          <div style={{ ...sansStyle(TYPE.pafies.size, 800, TRACKING.pafies), textShadow: `0 4px 0 ${COLORS.navyNight}`, paddingLeft: '0.12em' }}>{TEXT.pafies}</div>
        </div>
      )}
      <div style={{ ...centeredAt(0, TYPE.edicao.y) }}>
        <KineticText
          text={TEXT.dezEdicao}
          mode="wipe"
          startFrame={local(S06.dezEdicao)}
          duration={8}
          fontFamily={FONT_SANS}
          fontWeight={600}
          fontSize={TYPE.edicao.size}
          letterSpacing={TRACKING.edicaoSeal}
          gradient={GRADIENTS.gold}
          shadow={false}
          seed="s06-edicao"
        />
      </div>
    </>
  );
};

export const S06Encontro: React.FC<SceneProps> = ({ layout }) => {
  const f = useSceneFrame('S06');
  const { fps } = useVideoConfig();
  const L = useLayout(layout);
  const { W, H, cx, isV } = L;
  const center = isV ? { x: cx, y: 900 } : { x: cx, y: H / 2 };
  const k = isV ? SEAL_R_V / SEAL_R : 1;
  const tw = onTwos(f);

  // câmera: pull-out 1.06→1.00 (946–1080) e depois drift ±4 px
  const pull = mix(1.06, 1, prog(f, S06.scene.from + 1, S06.stamp, FLUID));
  const float = 4 * breathe(f, 60) * prog(f, S06.stamp, S06.stamp + 20, FLUID);

  // stamp do hit final
  const d = f - S06.stamp;
  const stamp = d < 0 ? 0 : d < 2 ? 1 : Math.exp(-(d - 2) / 4); // pico exato no hit, volta em ~12 f
  const sealScale = k * (1 + 0.045 * stamp);

  // sparkles: 8 na borda no hit + 3 ocasionais no hold
  const rimSparkles = Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * Math.PI * 2 + 0.2, at: S06.stamp + (i % 4) }));
  const holdSparkles = S06.holdSparkles.map((at, i) => ({ a: [-2.3, -0.6, 2.4][i], at }));
  const R = (isV ? SEAL_R_V : SEAL_R) + 6;

  const stitchCircle = (r: number) => `M${center.x - r} ${center.y} a ${r} ${r} 0 1 1 ${r * 2} 0 a ${r} ${r} 0 1 1 ${-r * 2} 0`;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Backdrop variant="navy" frame={f} width={W} height={H} blobs={0.3} />
      <Camera frame={f} scale={pull} y={float} originX={center.x} originY={center.y}>
        <StitchLine d={stitchCircle(R + 34)} width={W} height={H} progress={prog(f, S06.sealClose, S06.meet, FLUID)} opacity={0.8} />
        {isV && (
          <>
            <StitchLine d={`M${L.safe.left} 300 Q ${cx} 250 ${W - L.safe.right} 300`} width={W} height={H} progress={prog(f, S06.meet, S06.stamp, FLUID)} opacity={0.8} />
            <StitchLine d={`M${L.safe.left} 1560 Q ${cx} 1610 ${W - L.safe.right} 1560`} width={W} height={H} progress={prog(f, S06.meet, S06.stamp, FLUID)} opacity={0.8} />
            {[300, 1560].map((y, i) => (
              <Sparkle key={y} size={56} scale={springAt(f, fps, S06.stamp + i * 2, PESO)} rotation={45 * breathe(f, 90)} color={COLORS.goldLight} style={{ ...centeredAt(cx, y + (i ? 25 : -25)) }} />
            ))}
          </>
        )}
        <ImpactRings frame={f} at={S06.stamp} x={center.x} y={center.y} radius={R * 1.55} dur={18} colors={[COLORS.goldLight, COLORS.gold]} stroke={8} />
        <div style={{ position: 'absolute', left: center.x, top: center.y, width: 0, height: 0, transform: `scale(${sealScale})` }}>
          <SealContent f={f} fps={fps} />
        </div>
        {[...rimSparkles, ...holdSparkles].map((s, i) => {
          const t = prog(tw, s.at, s.at + 10);
          if (t <= 0 || t >= 1) return null;
          return (
            <Sparkle
              key={i}
              size={i < 8 ? 54 : 40}
              scale={Math.sin(Math.PI * t)}
              rotation={45 * t}
              color={i % 2 ? COLORS.white : COLORS.goldLight}
              style={{ ...centeredAt(center.x + Math.cos(s.a) * R * 1.02, center.y + Math.sin(s.a) * R * 1.02) }}
            />
          );
        })}
      </Camera>
    </AbsoluteFill>
  );
};

export default S06Encontro;
