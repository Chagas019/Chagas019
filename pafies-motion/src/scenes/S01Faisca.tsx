/**
 * S01 — A Faísca (frames 0–239, Intro). docs/02 §S01.
 * Uma faísca nasce no escuro, pulsa no heartbeat e dispara virando a cabeça da fita, que
 * revela UNIR / CUIDAR / COMPARTILHAR por máscara e termina em espiral → gota laranja (handoff S02).
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { COLORS, GRADIENTS } from '../design/tokens';
import { FitaPath, type Pt } from '../design/elements';
import { BACK_IN, EXPO_IN, FLUID, POP, onTwos, prog, mix, springAt, squashAt, useBeatPulse } from '../motion';
import { S01 } from '../cues';
import { TEXT } from '../content';
import { EM_PER_CHAR, useLayout, type SceneProps } from '../layout';
import {
  Backdrop,
  Camera,
  HeadReveal,
  Spark,
  StitchLine,
  centeredAt,
  cometTrim,
  condensedStyle,
  displayStyle,
  headLength,
  knotLength,
  makeRoute,
  pointAt,
  useSceneFrame,
  type RouteKey,
} from './shared';

/** Percurso da fita — horizontal: S que vai à esquerda, passa sob UNIR, laçada, CUIDAR (rtl), base, espiral. */
const ROUTE_H: Pt[] = [
  { x: 960, y: 540 }, // 0 faísca
  { x: 760, y: 380 },
  { x: 420, y: 300 },
  { x: 150, y: 420 },
  { x: 250, y: 585 }, // 4 início da passada UNIR
  { x: 1060, y: 575 }, // 5 ★ UNIR
  { x: 1420, y: 500 },
  { x: 1760, y: 470 },
  { x: 1850, y: 590 },
  { x: 1720, y: 640 }, // 9 início da passada CUIDAR (direita→esquerda)
  { x: 480, y: 715 }, // 10 ★ CUIDAR
  { x: 230, y: 770 },
  { x: 120, y: 900 },
  { x: 70, y: 770 }, // 13 início da passada COMPARTILHAR
  { x: 1840, y: 740 }, // 14 ★ COMPARTILHAR
  { x: 1880, y: 560 },
  { x: 1660, y: 300 },
  { x: 960, y: 230 },
  { x: 330, y: 360 },
  { x: 420, y: 650 },
  { x: 960, y: 770 },
  { x: 1380, y: 580 },
  { x: 1190, y: 370 },
  { x: 820, y: 400 },
  { x: 770, y: 600 },
  { x: 1010, y: 650 },
  { x: 1090, y: 520 },
  { x: 990, y: 470 },
  { x: 960, y: 540 }, // 28 gota
];
const KEYS_H: RouteKey[] = [
  [S01.shoot, 0],
  [S01.unir, 5],
  [S01.cuidar, 10],
  [S01.cuidarOut + 6, 13], // só começa a revelar depois que CUIDAR saiu (nunca 2 palavras)
  [S01.compartilhar, 14],
  [S01.spiralDone, 28],
];
const PASSES_H = { unir: [4, 5], cuidar: [9, 10], compartilhar: [13, 14] } as const;

/** Percurso vertical — S de cima para baixo cruzando as 3 palavras empilhadas. */
const ROUTE_V: Pt[] = [
  { x: 540, y: 960 },
  { x: 760, y: 840 },
  { x: 860, y: 640 },
  { x: 600, y: 520 },
  { x: 220, y: 600 },
  { x: 110, y: 780 },
  { x: 230, y: 850 }, // 6 início UNIR
  { x: 980, y: 845 }, // 7 ★
  { x: 1030, y: 960 },
  { x: 880, y: 1050 }, // 9 início CUIDAR (rtl)
  { x: 110, y: 1045 }, // 10 ★
  { x: 50, y: 1160 },
  { x: 90, y: 1250 }, // 12 início COMPARTILHAR
  { x: 990, y: 1245 }, // 13 ★
  { x: 1040, y: 1080 },
  { x: 900, y: 760 },
  { x: 540, y: 690 },
  { x: 220, y: 860 },
  { x: 280, y: 1160 },
  { x: 600, y: 1210 },
  { x: 810, y: 1000 },
  { x: 660, y: 810 },
  { x: 430, y: 880 },
  { x: 440, y: 1050 },
  { x: 610, y: 1040 },
  { x: 600, y: 930 },
  { x: 540, y: 960 },
];
const KEYS_V: RouteKey[] = [
  [S01.shoot, 0],
  [S01.unir, 7],
  [S01.cuidar, 10],
  [S01.cuidarOut + 6, 12],
  [S01.compartilhar, 13],
  [S01.spiralDone, 26],
];
const PASSES_V = { unir: [6, 7], cuidar: [9, 10], compartilhar: [12, 13] } as const;

const COMET = 1100; // comprimento visível da fita (px)
const RIBBON_W = 28;
const DROP_R = 20; // gota de 40 px

type WordCfg = { key: 'unir' | 'cuidar' | 'compartilhar'; x: number; y: number; rot: number; size: number; condensed?: boolean };

export const S01Faisca: React.FC<SceneProps> = ({ layout }) => {
  const f = useSceneFrame('S01');
  const { fps } = useVideoConfig();
  const L = useLayout(layout);
  const { W, H, cx, cy, isV } = L;

  const route = useMemo(() => makeRoute(isV ? ROUTE_V : ROUTE_H), [isV]);
  const keys = isV ? KEYS_V : KEYS_H;
  const passes = isV ? PASSES_V : PASSES_H;

  // ── fita ──
  const head = headLength(f, route, keys);
  // no fim a cauda alcança a cabeça (a espiral "aperta" e vira gota)
  const comet = COMET * (1 - prog(f, S01.dropStart, S01.spiralDone + 4, EXPO_IN));
  const trim = cometTrim(route, head, comet);
  const headPt = pointAt(route, head);
  const ribbonOn = f >= S01.shoot && comet > 1;
  const passOf = (k: readonly [number, number]) => {
    const a = knotLength(route, k[0]);
    const b = knotLength(route, k[1]);
    return f < S01.shoot ? 0 : Math.max(0, Math.min(1, (head - a) / (b - a)));
  };

  // ── faísca ──
  const sparkIn = springAt(f, fps, S01.sparkIn, POP);
  const pulse = useBeatPulse(f, 'heartbeat', { decay: 12 });
  const antic = prog(f, S01.anticStart, S01.shoot, BACK_IN);
  const sparkScale = sparkIn * (1 + 0.35 * pulse) * mix(1, 0.8, antic);
  const sparkX = cx + (isV ? 0 : 20 * antic);
  const sparkY = cy - (isV ? 20 * antic : 0);
  const fTwos = onTwos(f);
  const rays = fTwos >= S01.sparkPulse && fTwos < S01.sparkPulse + 4;

  // ── gota (handoff) ──
  const drop = springAt(f, fps, S01.dropStart, POP);

  // ── câmera e fundo ──
  const zoom = mix(1, 1.06, prog(f, 0, S01.scene.to, FLUID));
  const dim = mix(0.85, 0, prog(f, S01.sparkIn - 5, S01.sparkPulse, FLUID));

  // ── palavras ──
  const words: WordCfg[] = isV
    ? [
        { key: 'unir', x: cx, y: 760, rot: 0, size: L.fit(TEXT.unir, 200) },
        { key: 'cuidar', x: cx, y: 960, rot: -4, size: L.fit(TEXT.cuidar, 200) },
        { key: 'compartilhar', x: cx, y: 1160, rot: 0, size: L.fit(TEXT.compartilhar, 150, EM_PER_CHAR.condensed), condensed: true },
      ]
    : [
        { key: 'unir', x: 640, y: 470, rot: 0, size: 200 },
        { key: 'cuidar', x: 1110, y: 560, rot: -4, size: 200 },
        { key: 'compartilhar', x: cx, y: 560, rot: 0, size: L.fit(TEXT.compartilhar, 150, EM_PER_CHAR.display, 1720) },
      ];
  const timing = {
    unir: { at: S01.unir, out: S01.unirOut, dir: -1 },
    cuidar: { at: S01.cuidar, out: S01.cuidarOut, dir: 1 },
    compartilhar: { at: S01.compartilhar, out: S01.suckStart, dir: 0 },
  } as const;
  const directions = { unir: 'ltr', cuidar: 'rtl', compartilhar: 'ltr' } as const;

  const stitchD = isV ? `M${W * 0.1} ${H * 0.25} L${W * 0.95} ${H * 0.72}` : `M${W * 0.08} ${H * 0.86} L${W * 0.9} ${H * 0.12}`;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Backdrop variant="night" frame={f} width={W} height={H} dim={dim} blobs={0.4} />
      <Camera frame={f} scale={zoom}>
        <StitchLine d={stitchD} width={W} height={H} progress={prog(f, S01.sparkIn, S01.shoot + 40, FLUID)} opacity={0.25} />

        {words.map((w) => {
          const t = timing[w.key];
          const pass = passOf(passes[w.key]);
          if (pass <= 0) return null;
          const sq = squashAt(f, fps, t.at, 0.6);
          let ty = 0;
          let sy = sq.scaleY;
          let sx = sq.scaleX;
          let op = 1;
          if (w.key === 'compartilhar') {
            // drift 1.00→1.04, depois sugada para o centro da espiral
            const dr = mix(1, 1.04, prog(f, t.at, t.out, FLUID));
            const s = 1 - prog(f, t.out, t.out + 9, EXPO_IN);
            sx *= dr * s;
            sy *= dr * s;
            ty = (cy - w.y) * prog(f, t.out, t.out + 9, EXPO_IN);
            op = s > 0.02 ? 1 : 0;
          } else {
            const e = prog(f, t.out, t.out + 6, EXPO_IN);
            ty = 60 * e * t.dir;
            sy *= 1 - e;
            // micro-vida: drift lento
            sx *= mix(1, 1.03, prog(f, t.at, t.out, FLUID));
            sy *= mix(1, 1.03, prog(f, t.at, t.out, FLUID));
          }
          if (sy <= 0.01 || op === 0) return null;
          const style = w.condensed ? condensedStyle(w.size) : displayStyle(w.size);
          const staggered = w.key === 'compartilhar' && !isV;
          return (
            <HeadReveal key={w.key} headX={headPt.x} pass={pass} direction={directions[w.key]} width={W}>
              <div
                style={{
                  ...centeredAt(w.x, w.y + ty),
                  transform: `translate(-50%, -50%) rotate(${w.rot}deg) scale(${sx}, ${sy})`,
                  transformOrigin: '50% 80%',
                }}
              >
                <div style={{ ...style, letterSpacing: w.key === 'compartilhar' && !w.condensed ? '-0.03em' : style.letterSpacing }}>
                  {staggered
                    ? Array.from(TEXT[w.key]).map((ch, i) => {
                        // stagger de 1 f da esquerda p/ direita no pouso
                        const s = squashAt(f, fps, t.at + i, 0.5);
                        return (
                          <span key={i} style={{ display: 'inline-block', transform: `scale(${s.scaleX}, ${s.scaleY})`, transformOrigin: '50% 90%' }}>
                            {ch}
                          </span>
                        );
                      })
                    : TEXT[w.key]}
                </div>
              </div>
            </HeadReveal>
          );
        })}

        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          {ribbonOn && <FitaPath d={route.d} start={trim.start} end={trim.end} width={RIBBON_W} glow={0.7} />}
        </svg>

        {f < S01.shoot && <Spark x={sparkX} y={sparkY} scale={sparkScale} rays={rays} />}

        {drop > 0 && (
          <div
            style={{
              ...centeredAt(cx, cy),
              width: DROP_R * 2,
              height: DROP_R * 2,
              borderRadius: '50%',
              background: GRADIENTS.ribbon,
              boxShadow: `0 0 40px ${COLORS.orange}99, inset -6px -8px 0 ${COLORS.hotOrange}`,
              transform: `translate(-50%, -50%) scale(${drop})`,
            }}
          >
            <div style={{ position: 'absolute', left: 9, top: 8, width: 10, height: 7, borderRadius: '50%', background: COLORS.white, opacity: 0.7 }} />
          </div>
        )}
      </Camera>
    </AbsoluteFill>
  );
};

export default S01Faisca;
