/**
 * S02 — Gotas que se Encontram (frames 225–479, Build). docs/02 §S02.
 * A gota laranja estala e vira fita, que costura dois blobs líquidos em ∞; "GINCANA" cai letra a
 * letra nos plucks; os blobs se fundem no coração líquido (bloop 420) e a câmera mergulha no reflexo.
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { COLORS, GRADIENT_STOPS, GRADIENTS, SHADOWS } from '../design/tokens';
import { Coracao, FitaPath, blobPath, useSvgId, type Pt } from '../design/elements';
import {
  EXPO_IN,
  EXPO_OUT,
  FLUID,
  GELATINA,
  POP,
  anticipate,
  breathe,
  mix,
  prog,
  springAt,
  squashAt,
  useBeatPulse,
} from '../motion';
import { S02 } from '../cues';
import { TEXT } from '../content';
import { useLayout, type SceneProps } from '../layout';
import {
  Backdrop,
  Camera,
  ImpactRings,
  SplashAt,
  cometTrim,
  displayStyle,
  headLength,
  makeRoute,
  useSceneFrame,
  type Route,
  type RouteKey,
} from './shared';

const HEART_REFLECTION = { x: -72, y: -22 }; // vírgula branca no viewBox -100..100 do <Coracao>
const LEMNISCATE_LOOPS = 2;
const PTS_PER_LOOP = 18;

type Geo = {
  heart: Pt;
  heartW: number;
  blobA: Pt; // posição de repouso
  blobB: Pt;
  rA: number;
  rB: number;
  enterA: Pt; // fora de quadro
  enterB: Pt;
  wordY: number;
  wordSize: number;
  vertical: boolean;
};

/** Rota única: gota → ∞ (2 voltas) → sublinhado de GINCANA → órbita do coração. */
const buildRoute = (g: Geo, drop: Pt, wordHalf: number) => {
  const pts: Pt[] = [drop];
  const a = g.vertical ? Math.abs(g.blobB.y - g.blobA.y) * 0.95 : Math.abs(g.blobB.x - g.blobA.x) * 0.86;
  const sy = 1.3;
  const c = g.heart;
  const N = LEMNISCATE_LOOPS * PTS_PER_LOOP;
  for (let i = 0; i <= N; i++) {
    const t = Math.PI / 2 + (i / PTS_PER_LOOP) * Math.PI * 2;
    const d = 1 + Math.sin(t) ** 2;
    const u = (a * Math.cos(t)) / d;
    const v = ((a * Math.sin(t) * Math.cos(t)) / d) * sy;
    pts.push(g.vertical ? { x: c.x + v, y: c.y + u } : { x: c.x + u, y: c.y + v });
  }
  const kLoopEnd = pts.length - 1;
  const uy = g.wordY + g.wordSize * 0.62;
  pts.push({ x: c.x - wordHalf - 120, y: uy - 40 });
  const kUnderStart = pts.length;
  pts.push({ x: c.x - wordHalf - 30, y: uy });
  pts.push({ x: c.x, y: uy + 6 });
  pts.push({ x: c.x + wordHalf + 30, y: uy });
  const kUnderEnd = pts.length - 1;
  // órbita elíptica do coração (1,5 volta)
  const rx = g.heartW * 0.78;
  const ry = g.heartW * 0.3;
  const kOrbitStart = pts.length;
  const ORBIT_PTS = 30;
  for (let i = 0; i <= ORBIT_PTS; i++) {
    const t = (i / 20) * Math.PI * 2;
    pts.push({ x: c.x + Math.cos(t) * rx, y: c.y + g.heartW * 0.12 + Math.sin(t) * ry });
  }
  return { route: makeRoute(pts), kLoopEnd, kUnderStart, kUnderEnd, kOrbitStart, kOrbitEnd: pts.length - 1 };
};

/** Grupo líquido com filtro "goo" (docs/01 §5.3). */
const Goo: React.FC<{ children: React.ReactNode; std?: number }> = ({ children, std = 18 }) => {
  const id = useSvgId('goo');
  return (
    <g>
      <defs>
        <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={std} result="b" />
          <feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
      <g filter={`url(#${id})`}>{children}</g>
    </g>
  );
};

type BlobState = { x: number; y: number; r: number; sx: number; sy: number; phase: number };

const LiquidBlob: React.FC<{ b: BlobState; seed: string; fill: string; satellites: number; frame: number; sat: string[] }> = ({
  b,
  seed,
  fill,
  satellites,
  frame,
  sat,
}) => (
  <Goo>
    <path d={blobPath(b.r, seed, b.phase, 0.14)} fill={fill} transform={`translate(${b.x} ${b.y}) scale(${b.sx} ${b.sy})`} />
    {Array.from({ length: satellites }, (_, i) => {
      // satélites orbitam e "respiram" para dentro/fora do blob (fundem e soltam via goo)
      const ang = (i / satellites) * Math.PI * 2 + frame * 0.012 * (i % 2 ? 1 : -1);
      const dist = b.r * (1.02 + 0.32 * (0.5 + 0.5 * breathe(frame, 90, i * 23)));
      const rr = b.r * (0.07 + 0.05 * ((i * 37) % 5) / 4) * Math.min(b.sx, 1);
      return <circle key={i} cx={b.x + Math.cos(ang) * dist} cy={b.y + Math.sin(ang) * dist} r={rr} fill={sat[i % sat.length]} />;
    })}
  </Goo>
);

export const S02Gotas: React.FC<SceneProps> = ({ layout }) => {
  const f = useSceneFrame('S02');
  const { fps } = useVideoConfig();
  const L = useLayout(layout);
  const { W, H, cx, cy, isV } = L;
  const gradA = useSvgId('blobA');
  const gradB = useSvgId('blobB');

  const g: Geo = isV
    ? {
        heart: { x: cx, y: 860 },
        heartW: 400,
        blobA: { x: cx, y: 860 - 300 },
        blobB: { x: cx, y: 860 + 280 },
        rA: 180,
        rB: 160,
        enterA: { x: cx, y: -260 },
        enterB: { x: cx, y: H + 260 },
        wordY: 1440,
        wordSize: L.fit(TEXT.gincana, 150),
        vertical: true,
      }
    : {
        heart: { x: cx, y: 370 },
        heartW: 420,
        blobA: { x: cx - 360, y: 350 },
        blobB: { x: cx + 360, y: 350 },
        rA: 200,
        rB: 185,
        enterA: { x: -300, y: 350 },
        enterB: { x: W + 300, y: 350 },
        wordY: 740,
        wordSize: 220,
        vertical: false,
      };
  const letters = Array.from(TEXT.gincana);
  const letterW = g.wordSize * 0.9;
  const wordHalf = (letters.length * letterW) / 2;

  const R = useMemo(() => buildRoute(g, { x: cx, y: cy }, wordHalf), [isV, W, H]); // eslint-disable-line react-hooks/exhaustive-deps
  const route: Route = R.route;
  const keys: RouteKey[] = [
    [S02.dropPop, 0],
    [S02.letters[S02.letters.length - 1] - 4, R.kUnderStart],
    [S02.underline + 12, R.kUnderEnd],
    [S02.orbitStart, R.kOrbitStart],
    [S02.diveWhite + 5, R.kOrbitEnd],
  ];
  const head = headLength(f, route, keys);
  const trim = cometTrim(route, head, 950);

  // ── blobs ──
  const kick = useBeatPulse(f, 'kick', { decay: 12 });
  const fuse = springAt(f, fps, S02.fuseStart, GELATINA); // 0→1 colisão
  const vanish = prog(f, S02.fuseStart + 6, S02.heartClose, EXPO_IN);
  const blobState = (rest: Pt, enter: Pt, r: number, sign: number, phase: number): BlobState => {
    const ex = anticipate(f, S02.blobsIn, 4, S02.dropPop, enter.x, rest.x, 30 / Math.max(1, Math.abs(rest.x - enter.x) || 1));
    const ey = anticipate(f, S02.blobsIn, 4, S02.dropPop, enter.y, rest.y, 30 / Math.max(1, Math.abs(rest.y - enter.y) || 1));
    const sway = 46 * breathe(f, 90, phase) - 30 * prog(f, S02.dropPop, S02.fuseStart, FLUID); // flutuam um em direção ao outro
    const bx = isV ? ex + 18 * breathe(f, 120, phase) : ex - sign * sway;
    const by = isV ? ey - sign * sway : ey + 18 * breathe(f, 120, phase);
    const x = mix(bx, g.heart.x, fuse);
    const y = mix(by, g.heart.y, fuse);
    const squash = 0.04 * kick;
    const s = 1 - 0.55 * vanish;
    return { x, y, r: r * s, sx: 1 + squash, sy: 1 - squash, phase: f / 70 + phase };
  };
  const A = blobState(g.blobA, g.enterA, g.rA, -1, 0);
  const B = blobState(g.blobB, g.enterB, g.rB, 1, 30);
  const showBlobs = f < S02.heartClose + 2;

  // ── coração ──
  const heartOn = f >= S02.fuseStart + 6;
  const morph = prog(f, S02.fuseStart + 6, S02.heartClose, EXPO_OUT);
  const heartPop = springAt(f, fps, S02.fuseStart + 6, GELATINA);
  const heartSq = squashAt(f, fps, S02.heartClose, 0.35, GELATINA);
  const heartBreath = 0.025 * (0.5 + 0.5 * breathe(f, 60));

  // ── gota inicial ──
  const dropVisible = f < S02.dropPop;
  const dropStretch = prog(f, S02.dropPop - 4, S02.dropPop, EXPO_IN);

  // ── câmera: pan 30 px + zoom 1.05; mergulho no reflexo (1→14) ──
  const reflection = {
    x: g.heart.x + (HEART_REFLECTION.x / 200) * g.heartW,
    y: g.heart.y + (HEART_REFLECTION.y / 200) * g.heartW,
  };
  const drift = prog(f, S02.scene.from, S02.diveStart, FLUID);
  const dive = prog(f, S02.diveStart, S02.scene.to, EXPO_IN);
  const camScale = mix(1, 1.05, drift) * mix(1, 14, dive);
  const camX = (isV ? 0 : 30) * drift;
  const camY = (isV ? 30 : 0) * drift;
  const white = prog(f, S02.diveStart, S02.diveWhite, EXPO_IN);

  // ── GINCANA ──
  const rise = prog(f, S02.heartClose, S02.heartClose + 20, EXPO_OUT);
  const fan = prog(f, S02.diveStart, S02.diveWhite + 2, EXPO_IN);
  const wordScale = mix(1, 0.85, rise);
  const wordLift = -40 * rise;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Backdrop variant="navy" frame={f} width={W} height={H} parallax={{ x: -camX * 4, y: -camY * 4 }} />
      <Camera frame={f} scale={camScale} x={camX} y={camY} originX={reflection.x} originY={reflection.y}>
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <defs>
            <radialGradient id={gradA} cx="0.38" cy="0.32" r="0.75">
              {GRADIENT_STOPS.heart.map((s) => (
                <stop key={s.offset} offset={s.offset} stopColor={s.color} />
              ))}
            </radialGradient>
            <radialGradient id={gradB} cx="0.38" cy="0.32" r="0.8">
              <stop offset={0} stopColor={COLORS.electricLight} />
              <stop offset={0.55} stopColor={COLORS.electric} />
              <stop offset={1} stopColor={COLORS.navySoft} />
            </radialGradient>
          </defs>
          {/* camada A: fita passa POR CIMA de A */}
          {showBlobs && <LiquidBlob b={A} seed="s02-a" fill={`url(#${gradA})`} satellites={6} frame={f} sat={[COLORS.teal, COLORS.tealLight]} />}
          {f >= S02.dropPop && <FitaPath d={route.d} start={trim.start} end={trim.end} width={28} glow={0.6} />}
          {/* camada B: fita passa POR BAIXO de B */}
          {showBlobs && <LiquidBlob b={B} seed="s02-b" fill={`url(#${gradB})`} satellites={4} frame={f} sat={[COLORS.electric, COLORS.teal]} />}
          {showBlobs && (
            <g opacity={0.4 * (1 - vanish)}>
              <path d={`M${A.x - A.r * 0.6} ${A.y - A.r * 0.15} q ${A.r * 0.05} ${-A.r * 0.4} ${A.r * 0.42} ${-A.r * 0.5}`} fill="none" stroke={COLORS.white} strokeWidth={A.r * 0.08} strokeLinecap="round" />
            </g>
          )}
        </svg>

        {heartOn && (
          <div
            style={{
              position: 'absolute',
              left: g.heart.x - g.heartW / 2,
              top: g.heart.y - g.heartW / 2,
              transform: `scale(${heartPop * heartSq.scaleX * (1 + heartBreath)}, ${heartPop * heartSq.scaleY * (1 + heartBreath)})`,
            }}
          >
            <Coracao size={g.heartW} morph={morph} wave={f / 9} pulse={0} seed="s02-heart" blobPhase={f / 70} />
          </div>
        )}

        {dropVisible && (
          <div
            style={{
              position: 'absolute',
              left: cx - 20,
              top: cy - 20,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: GRADIENTS.ribbon,
              boxShadow: `0 0 40px ${COLORS.orange}99, inset -6px -8px 0 ${COLORS.hotOrange}`,
              transform: `scale(${1 + 0.6 * dropStretch}, ${1 - 0.3 * dropStretch})`,
            }}
          />
        )}
        <SplashAt frame={f} at={S02.dropPop} x={cx} y={cy} count={8} spread={220} seed="s02-drop" />
        <ImpactRings frame={f} at={S02.dropPop} x={cx} y={cy} radius={260} colors={[COLORS.amber, COLORS.white]} stroke={5} />

        {/* GINCANA — letra a letra nos plucks */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: W,
            top: g.wordY - g.wordSize / 2,
            display: 'flex',
            justifyContent: 'center',
            transform: `translateY(${wordLift}px) scale(${wordScale})`,
            transformOrigin: `50% ${g.wordSize / 2}px`,
          }}
        >
          {letters.map((ch, i) => {
            const at = S02.letters[i];
            if (f < at - 8) return <span key={i} style={{ ...displayStyle(g.wordSize, SHADOWS.textLarge), visibility: 'hidden' }}>{ch}</span>;
            // antecipação (2 f sobe) → queda acelerada → pouso POP com squash
            const up = prog(f, at - 8, at - 6, FLUID);
            const fall = prog(f, at - 6, at, EXPO_IN);
            const y = -120 - 14 * up * (1 - fall) + 120 * fall;
            const sq = squashAt(f, fps, at, 1, POP);
            const bounce = f > at + 6 ? -2 * kick : 0;
            const n = letters.length;
            const fx = (i - (n - 1) / 2) * (isV ? 160 : 320) * fan;
            const fy = -Math.abs(i - (n - 1) / 2) * 60 * fan;
            return (
              <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
                <span
                  style={{
                    ...displayStyle(g.wordSize, SHADOWS.textLarge),
                    display: 'inline-block',
                    transform: `translate(${fx}px, ${y + bounce + fy}px) rotate(${(i - (n - 1) / 2) * 8 * fan}deg) scale(${sq.scaleX}, ${f < at ? 1 + 0.12 * fall : sq.scaleY})`,
                    transformOrigin: '50% 92%',
                  }}
                >
                  {ch}
                </span>
                <SplashAt
                  frame={f}
                  at={at}
                  x={letterW * 0.5}
                  y={g.wordSize * 0.92}
                  count={4}
                  spread={140}
                  dropSize={9}
                  seed={`s02-l${i}`}
                  colors={[COLORS.teal, COLORS.tealLight]}
                  arc={160}
                  canvas={400}
                  life={12}
                />
              </span>
            );
          })}
        </div>
      </Camera>

      {/* reflexo branco toma a tela (handoff para S03) */}
      {white > 0 && (
        <AbsoluteFill
          style={{
            // brilho do reflexo crescendo (borda macia, não um disco chapado)
            background: `radial-gradient(circle at ${reflection.x}px ${reflection.y}px, ${COLORS.white} 0px, ${COLORS.white} ${white * Math.hypot(W, H) * 0.75}px, ${COLORS.white}00 ${white * Math.hypot(W, H) * 1.05 + 60}px)`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

export default S02Gotas;
