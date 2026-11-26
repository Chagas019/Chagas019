/**
 * S03 — Energia em Revezamento (frames 465–719, Drop 1). docs/02 §S03.
 * Íris electric abre do branco; ENERGIA explode (480); a fita corre em diagonal; JUNTOS + pilha-eco
 * (540); dois braços em câmera baixa passam a fita como bastão (600); pilha rítmica
 * UNIR/CUIDAR/COMPARTILHAR (660/675/690); whip-pan (705) deixando só a fita esticada.
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { COLORS, SHADOWS } from '../design/tokens';
import { FitaPath, SpeedLines, mixHex, type Pt } from '../design/elements';
import { FONT_CONDENSED } from '../design/fonts';
import {
  EXPO_IN,
  EXPO_OUT,
  FLUID,
  KineticText,
  POP,
  TransitionWrap,
  anticipate,
  mix,
  onTwos,
  prog,
  springAt,
  squashAt,
  toSceneFrame,
  transitionProgress,
  whipPan,
  wiggle,
} from '../motion';
import { FONT_DISPLAY } from '../design/fonts';
import { S03 } from '../cues';
import { TEXT } from '../content';
import { EM_PER_CHAR, useLayout, type SceneProps } from '../layout';
import {
  Backdrop,
  BigArm,
  Camera,
  HeadReveal,
  ImpactRings,
  SplashAt,
  centeredAt,
  cometTrim,
  condensedStyle,
  headLength,
  knotLength,
  makeRoute,
  pointAt,
  useSceneFrame,
  type Route,
  type RouteKey,
} from './shared';

const toLocal = (abs: number) => toSceneFrame('S03', abs);
/** contorno das palavras-eco: electricLight clareado para ler sobre o electric. */
const OUTLINE = mixHex(COLORS.electricLight, COLORS.cream, 0.45);

/** Fita em corrida com 2 cópias-fantasma (motion blur simulado, docs/01 §4.3). */
const RaceRibbon: React.FC<{ route: Route; keys: RouteKey[]; frame: number; comet: number; width: number }> = ({
  route,
  keys,
  frame,
  comet,
  width,
}) => {
  const layers = [
    { d: 2, op: 0.15 },
    { d: 1, op: 0.35 },
    { d: 0, op: 1 },
  ];
  return (
    <>
      {layers.map(({ d, op }) => {
        const h = headLength(frame - d, route, keys);
        if (h <= 0 || h - comet >= route.total) return null;
        const t = cometTrim(route, h, comet);
        return <FitaPath key={d} d={route.d} start={t.start} end={t.end} width={width} glow={d === 0 ? 0.7 : 0} opacity={op} shadow={d === 0} highlight={d === 0} />;
      })}
    </>
  );
};

export const S03Energia: React.FC<SceneProps> = ({ layout }) => {
  const f = useSceneFrame('S03');
  const { fps } = useVideoConfig();
  const L = useLayout(layout);
  const { W, H, cx, cy, isV } = L;
  const diag = Math.hypot(W, H);

  // ── geometria por layout ──
  const geo = isV
    ? {
        energiaSize: L.fit(TEXT.energia, 150),
        juntosSize: L.fit(TEXT.juntos, 240),
        juntosTopY: 420,
        meet: { x: cx, y: 1060 },
        armA: { angle: 125, len: 1100, thick: 150 },
        armB: { angle: -55, len: 1000, thick: 120 },
        stackX: L.safe.left,
        stackY: [700, 900, 1100],
        stackSize: L.fit(TEXT.compartilhar, 150, EM_PER_CHAR.condensed),
      }
    : {
        energiaSize: 220,
        juntosSize: 240,
        juntosTopY: 180,
        meet: { x: cx, y: 640 },
        armA: { angle: 152, len: 1200, thick: 170 },
        armB: { angle: 24, len: 1100, thick: 130 },
        stackX: 200,
        stackY: [320, 540, 760],
        stackSize: 190,
      };

  // ── rotas da fita ──
  const routes = useMemo(() => {
    const off = 320;
    // 3 diagonais de corrida (ligadas fora de quadro)
    const race = makeRoute(
      isV
        ? [
            { x: -off, y: 1500 },
            { x: W + off, y: 500 },
            { x: W + off * 2, y: 900 },
            { x: W + off, y: 1400 },
            { x: -off, y: 600 },
            { x: -off * 2, y: 1000 },
            { x: -off, y: 1250 },
            { x: W + off, y: 350 },
          ]
        : [
            { x: -off, y: 980 },
            { x: W + off, y: 120 },
            { x: W + off * 2, y: 500 },
            { x: W + off, y: 920 },
            { x: -off, y: 160 },
            { x: -off * 2, y: 500 },
            { x: -off, y: 760 },
            { x: W + off, y: -40 },
          ],
    );
    // bastão → mão B dispara → embrulha JUNTOS → sai
    const m = geo.meet;
    const jy = geo.juntosTopY;
    const rx = isV ? 470 : 560;
    const ry = isV ? 120 : 110;
    const wrapPts: Pt[] = [m, { x: m.x + (isV ? 300 : 600), y: m.y - 60 }, { x: W - 60, y: (m.y + jy) / 2 }];
    const kWrapStart = wrapPts.length;
    for (let i = 0; i <= 18; i++) {
      const t = (i / 14) * Math.PI * 2;
      wrapPts.push({ x: cx + Math.cos(t) * rx, y: jy - Math.sin(t) * ry + 8 * i });
    }
    wrapPts.push({ x: -off, y: jy + 260 });
    const wrap = makeRoute(wrapPts);
    // passadas horizontais da pilha (uma por palavra) + linha final esticada
    const pass = geo.stackY.map((y) => makeRoute([{ x: -off, y: y + 40 }, { x: W / 2, y: y + 56 }, { x: W + off, y: y + 40 }, { x: W + off + 1400, y: y + 30 }]));
    const finalLine = makeRoute([{ x: -40, y: cy }, { x: W / 2, y: cy }, { x: W + 40, y: cy }]);
    return { race, wrap, kWrapStart, kWrapEnd: wrapPts.length - 2, pass, finalLine };
  }, [isV, W, H]); // eslint-disable-line react-hooks/exhaustive-deps

  const [p1, p2, p3] = S03.racePasses;
  const raceKeys: RouteKey[] = [
    [p1, 0],
    [p1 + S03.raceDur, 1],
    [p2, 3],
    [p2 + S03.raceDur, 4],
    [p3, 6],
    [p3 + S03.raceDur, 7],
  ];
  const wrapKeys: RouteKey[] = [
    [S03.handoff, 0],
    [S03.handoff + 12, 2],
    [S03.wrap + 30, routes.kWrapEnd],
    [S03.juntosOut + 4, routes.kWrapEnd + 1],
  ];

  // ── íris de abertura (do branco do S02) ──
  const iris = prog(f, S03.irisStart, S03.energia + 6, EXPO_OUT);
  const irisClip = iris >= 1 ? undefined : `circle(${iris * diag * 0.6}px at ${cx}px ${cy}px)`;

  // ── speed lines (on twos) ──
  const tw = onTwos(f);
  const inverted = f >= S03.handoff;
  const density = prog(f, S03.irisStart, S03.energia, EXPO_OUT);
  const focal = { x: cx + wiggle('s03-focal-x', tw, 120, 0.02), y: cy + wiggle('s03-focal-y', tw, 70, 0.02) };

  // ── ENERGIA (treme on twos) ──
  const tremble = f >= S03.energia && f < S03.energiaOut ? { x: wiggle('s03-tr-x', tw, 2, 0.9, true), y: wiggle('s03-tr-y', tw, 2, 0.9, true) } : { x: 0, y: 0 };

  // ── JUNTOS ──
  const juntosIn = anticipate(f, S03.juntos - 9, 3, S03.juntos, H * 0.7, 0, 0.06, EXPO_OUT);
  const juntosSq = squashAt(f, fps, S03.juntos, 0.8, POP);
  const up = prog(f, S03.juntosUp, S03.juntosUp + 18, EXPO_OUT);
  const juntosY = mix(cy, geo.juntosTopY, up) + (f < S03.juntos ? juntosIn : 0);
  const juntosScale = mix(1, 0.6, up);
  const juntosExit = prog(f, S03.juntosOut, S03.juntosOut + 7, EXPO_IN);
  const echoCollapse = prog(f, S03.juntosUp, S03.juntosUp + 12, EXPO_IN);

  // ── braços ──
  const armProg = (a: { angle: number }, dist: number, start: number) =>
    anticipate(f, start, 5, S03.handoff, dist, 0, 0.06, EXPO_OUT);
  const armVis = f >= S03.armsIn && f < S03.armsOut + 12;
  const out = prog(f, S03.armsOut, S03.armsOut + 10, EXPO_IN);
  const dA = armProg(geo.armA, 1500, S03.armsIn) + 1500 * out;
  const dB = armProg(geo.armB, 1500, S03.armsIn + 4);
  const rad = (d: number) => (d * Math.PI) / 180;
  const meetOffset = isV ? 70 : 80;
  const handA = {
    x: geo.meet.x - meetOffset * Math.abs(Math.cos(rad(geo.armA.angle))) + Math.cos(rad(geo.armA.angle)) * dA,
    y: geo.meet.y + (isV ? meetOffset * 0.6 : 10) + Math.sin(rad(geo.armA.angle)) * dA,
  };
  const dashB = prog(f, S03.handoff, S03.handoff + 12, EXPO_IN) * (isV ? 1400 : 2000);
  const handB = {
    x: geo.meet.x + meetOffset * Math.abs(Math.cos(rad(geo.armB.angle))) + Math.cos(rad(geo.armB.angle)) * dB + dashB,
    y: geo.meet.y - (isV ? meetOffset * 0.6 : 10) + Math.sin(rad(geo.armB.angle)) * dB,
  };
  // bastão: fita curta presa na mão A (antes do revezamento)
  const baton = `M${handA.x} ${handA.y} q ${-160} ${-140} ${-360} ${-120} t ${-320} ${40}`;

  // ── pilha rítmica ──
  const stackWords = [TEXT.unir, TEXT.cuidar, TEXT.compartilhar];
  const passKey = (cue: number): RouteKey[] => [
    [cue - 9, 0],
    [cue + 5, 2],
    [cue + 12, 3], // a cauda sai de quadro
  ];

  // ── whip ──
  const whip = transitionProgress(f, S03.whip, S03.whipDur);
  const finalHead = headLength(f, routes.finalLine, [
    [S03.finalLine, 0],
    [S03.whip, 2],
  ]);

  const content = (
    <AbsoluteFill style={{ clipPath: irisClip, WebkitClipPath: irisClip }}>
      <Backdrop variant="electric" frame={f} width={W} height={H} blobs={0.35} blobColor={COLORS.electricLight} />
      <Camera frame={f} scale={mix(1, 1.05, prog(f, S03.scene.from, S03.scene.to, FLUID))} x={mix(-20, 20, prog(f, S03.scene.from, S03.scene.to, FLUID))}>
        <SpeedLines
          width={W}
          height={H}
          cx={focal.x}
          cy={focal.y}
          seed={`s03-${tw}`}
          count={isV ? 52 : 60}
          progress={inverted ? 0.52 : 0.42}
          innerRadius={isV ? 200 : 240}
          outerRadius={L.long * 0.75}
          opacity={0.25 + 0.55 * density}
          thickness={9}
        />

        {/* ENERGIA */}
        <div style={{ ...centeredAt(cx + tremble.x, cy + tremble.y) }}>
          <div style={{ transform: `scale(${mix(2.2, 1, springAt(f, fps, S03.energia - 3, POP))})` }}>
          <KineticText
            text={TEXT.energia}
            mode="stagger-scale"
            startFrame={toLocal(S03.energia - 4)}
            stagger={1}
            staggerFrom="center"
            fontFamily={FONT_DISPLAY}
            fontSize={geo.energiaSize}
            exitFrame={toLocal(S03.energiaOut)}
            exit="whip-up"
            exitDuration={8}
            exitStagger={0}
            seed="s03-energia"
          />
          </div>
        </div>
        <SplashAt frame={f} at={S03.energia} x={cx} y={cy} count={14} spread={isV ? 460 : 620} dropSize={20} gravity={160} seed="s03-energia" canvas={1600} />

        {/* fita em corrida */}
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {f < S03.juntos && <RaceRibbon route={routes.race} keys={raceKeys} frame={f} comet={600} width={32} />}
        </svg>

        {/* JUNTOS + pilha-eco */}
        {f >= S03.juntos - 9 && juntosExit < 1 && (
          <div
            style={{
              ...centeredAt(cx, juntosY - 900 * juntosExit),
              transform: `translate(-50%, -50%) scale(${juntosScale * juntosSq.scaleX}, ${juntosScale * juntosSq.scaleY})`,
              transformOrigin: '50% 80%',
            }}
          >
            {[4, 3, 2, 1].map((k) => {
              const appear = prog(f, S03.juntos + k * 2, S03.juntos + k * 2 + 6, EXPO_OUT);
              const op = [0, 0.6, 0.4, 0.25, 0.1][k] * appear * (1 - echoCollapse);
              if (op <= 0.01) return null;
              return (
                <div
                  key={k}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, calc(-50% - ${k * geo.juntosSize * 0.62 * appear * (1 - echoCollapse)}px))`,
                    fontFamily: FONT_CONDENSED,
                    fontSize: geo.juntosSize * 1.25,
                    letterSpacing: '0.04em',
                    lineHeight: 1,
                    color: 'transparent',
                    WebkitTextStroke: `4px ${OUTLINE}`,
                    opacity: op,
                    whiteSpace: 'pre',
                  }}
                >
                  {TEXT.juntos}
                </div>
              );
            })}
            <div
              style={{
                position: 'relative',
                fontFamily: FONT_DISPLAY,
                fontWeight: 900,
                fontSize: geo.juntosSize,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                color: COLORS.cream,
                textShadow: SHADOWS.textLarge,
                whiteSpace: 'pre',
              }}
            >
              {TEXT.juntos}
            </div>
          </div>
        )}

        {/* braços (câmera baixa) + bastão */}
        {armVis && (
          <>
            <BigArm x={handB.x} y={handB.y} angle={geo.armB.angle} length={geo.armB.len} thickness={geo.armB.thick} variant="B" grip={f < S03.handoff ? 'open' : 'closed'} bend={-8} />
            {f < S03.handoff && (
              <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                <FitaPath d={baton} start={0} end={1} width={30} glow={0.5} taper={false} />
              </svg>
            )}
            <BigArm x={handA.x} y={handA.y} angle={geo.armA.angle} length={geo.armA.len} thickness={geo.armA.thick} variant="A" grip="closed" bend={10} />
          </>
        )}
        <ImpactRings frame={f} at={S03.handoff} x={geo.meet.x} y={geo.meet.y} radius={520} colors={[COLORS.tealLight, COLORS.amber, COLORS.white]} />
        <SplashAt frame={f} at={S03.handoff} x={geo.meet.x} y={geo.meet.y} count={10} spread={420} dropSize={18} seed="s03-hand-t" colors={[COLORS.teal, COLORS.tealLight]} canvas={1200} />
        <SplashAt frame={f} at={S03.handoff} x={geo.meet.x} y={geo.meet.y} count={10} spread={480} dropSize={18} seed="s03-hand-o" canvas={1200} direction={-60} />

        {/* rastro largo: mão B dispara e embrulha JUNTOS */}
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {f >= S03.handoff && f < S03.juntosOut + 6 && (() => {
            const h = headLength(f, routes.wrap, wrapKeys);
            const t = cometTrim(routes.wrap, h, 1500);
            return <FitaPath d={routes.wrap.d} start={t.start} end={t.end} width={48} glow={0.6} />;
          })()}
        </svg>

        {/* pilha UNIR / CUIDAR / COMPARTILHAR */}
        {stackWords.map((word, i) => {
          const cue = S03.stack[i];
          const r = routes.pass[i];
          const h = headLength(f, r, passKey(cue));
          if (f < cue - 9) return null;
          const head = pointAt(r, h);
          const passed = h >= knotLength(r, 2);
          const pass = passed ? 1 : Math.max(0, Math.min(1, (head.x + 1) / (W + 1)));
          const outlined = i < 2 && f >= S03.stack[i + 1];
          const sq = squashAt(f, fps, cue, 0.45);
          const st = condensedStyle(geo.stackSize);
          return (
            <React.Fragment key={word}>
              <HeadReveal headX={head.x} pass={passed ? 1 : pass > 0 ? 0.5 : 0} width={W}>
                <div
                  style={{
                    position: 'absolute',
                    left: geo.stackX,
                    top: geo.stackY[i] - geo.stackSize * 0.6,
                    transform: `scale(${sq.scaleX * mix(1, 1.03, prog(f, cue, S03.whip, FLUID))}, ${sq.scaleY})`,
                    transformOrigin: '0% 90%',
                    ...st,
                    ...(outlined
                      ? { color: 'transparent', WebkitTextStroke: `3px ${OUTLINE}`, textShadow: 'none' }
                      : {}),
                  }}
                >
                  {word}
                </div>
              </HeadReveal>
              <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                {h > 0 && h - 900 < r.total && (() => {
                  const t = cometTrim(r, h, 900);
                  return <FitaPath d={r.d} start={t.start} end={t.end} width={30} glow={0.6} />;
                })()}
              </svg>
            </React.Fragment>
          );
        })}
      </Camera>
    </AbsoluteFill>
  );

  const finalTrim = cometTrim(routes.finalLine, finalHead, routes.finalLine.total);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {iris < 1 && f >= S03.irisStart && <AbsoluteFill style={{ background: COLORS.white }} />}
      <TransitionWrap presentation={whipPan({ direction: isV ? 'up' : 'left' })} progress={whip} role="exiting">
        {content}
      </TransitionWrap>
      {/* a fita esticada é o único elemento que "sobrevive" ao whip */}
      {f >= S03.finalLine && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <FitaPath d={routes.finalLine.d} start={finalTrim.start} end={finalTrim.end} width={28} glow={0.7} taper={false} />
        </svg>
      )}
    </AbsoluteFill>
  );
};

export default S03Energia;
