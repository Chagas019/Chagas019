/**
 * Transições customizadas — compatíveis com @remotion/transitions (TransitionPresentation)
 * E utilizáveis como wrappers manuais nas <Sequence> sobrepostas do storyboard.
 *
 * ─── Uso 1: TransitionSeries ────────────────────────────────────────────────
 *   import { TransitionSeries, linearTiming } from '@remotion/transitions';
 *   <TransitionSeries>
 *     <TransitionSeries.Sequence durationInFrames={255}><S03 /></TransitionSeries.Sequence>
 *     <TransitionSeries.Transition
 *        presentation={whipPan({ direction: 'left' })}
 *        timing={linearTiming({ durationInFrames: 15 })} />   // SEMPRE linearTiming: o easing já é aplicado aqui dentro
 *     <TransitionSeries.Sequence durationInFrames={135}><S04 /></TransitionSeries.Sequence>
 *   </TransitionSeries>
 *
 * ─── Uso 2: wrapper manual (overlaps do storyboard) ─────────────────────────
 *   const p = prog(frame, 705, 720);   // frame absoluto, progresso LINEAR 0..1
 *   <TransitionWrap presentation={whipPan({ direction: 'left' })} progress={p} role="exiting"><S03 /></TransitionWrap>
 *   <TransitionWrap presentation={whipPan({ direction: 'left' })} progress={p} role="entering"><S04 /></TransitionWrap>
 *   (renderize a que entra POR CIMA — depois no JSX.)
 *
 * Presentations:
 *  - whipPan({direction, blur, stretch})        chicote com blur direcional REAL (SVG feGaussianBlur só no eixo)
 *                                              + stretch no eixo do movimento nos frames de velocidade máxima. Easing WHIP.
 *  - zoomDive({x, y, maxScale, holeRadius})    a cena que sai escala brutalmente (EXPO_IN) para dentro do ponto (x,y)
 *                                              — ex.: miolo do "0"; a cena que entra aparece pelo "buraco" (círculo
 *                                              de raio holeRadius·escala), ou seja, nasce de dentro do 0.
 *  - liquidWipe({direction, waves, amplitude, color})  frente de onda orgânica atravessa; faixa líquida (`color`) na borda.
 *  - ribbonWipe({angle, bandWidth})            faixa laranja (gradRibbon) diagonal varre a tela; a cena nova fica atrás dela.
 */
import React, { useId } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from '@remotion/transitions';
import { EXPO_IN, EXPO_OUT, SNAP, WHIP, FLUID } from './easings';
import { mix, prog } from './hooks';

// Tokens locais (espelham docs/01 §2 — src/design é do Designer; não importamos daqui p/ evitar acoplamento)
const C = {
  navyNight: '#060F2E',
  orange: '#FF7A00',
  amber: '#FFB547',
  teal: '#2EC4D6',
  tealLight: '#8FEAF0',
  white: '#FFFFFF',
};

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '');

type Dir = 'left' | 'right' | 'up' | 'down';
const dirVec = (d: Dir): [number, number] =>
  d === 'left' ? [-1, 0] : d === 'right' ? [1, 0] : d === 'up' ? [0, -1] : [0, 1];

// ───────────────────────────────── whipPan ─────────────────────────────────
export type WhipPanProps = {
  /** sentido em que o CONTEÚDO se move (S03→S04: 'left' = tudo desliza −1920px). */
  direction?: Dir;
  /** blur máximo (stdDeviation px) no pico de velocidade. default 70. */
  blur?: number;
  /** stretch máximo no eixo do movimento (0.6 → scale 1.6). default 0.6. */
  stretch?: number;
};

const WHIP_VMAX = (() => {
  let m = 0;
  for (let i = 1; i < 200; i++) {
    const t = i / 200;
    m = Math.max(m, (WHIP(t + 0.001) - WHIP(t - 0.001)) / 0.002);
  }
  return m;
})();

const WhipPanComponent: React.FC<TransitionPresentationComponentProps<WhipPanProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const { width, height } = useVideoConfig();
  const id = safeId('whip' + useId());
  const { direction = 'left', blur = 70, stretch = 0.6 } = passedProps;
  const [dx, dy] = dirVec(direction);
  const p = Math.min(1, Math.max(0, presentationProgress));
  const e = WHIP(p);
  const v = Math.min(1, (WHIP(Math.min(1, p + 0.001)) - WHIP(Math.max(0, p - 0.001))) / 0.002 / WHIP_VMAX);
  const speed = v > 0.2 ? (v - 0.2) / 0.8 : 0; // só nos frames de velocidade máxima
  const W = width;
  const H = height;
  const off = presentationDirection === 'exiting' ? e : e - 1; // exiting: 0→1 ; entering: −1→0
  const tx = dx * off * W;
  const ty = dy * off * H;
  const s = 1 + stretch * speed;
  const b = blur * speed;
  const horizontal = dx !== 0;
  return (
    <AbsoluteFill>
      {b > 0.5 ? (
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <defs>
            <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation={horizontal ? `${b} 0` : `0 ${b}`} edgeMode="duplicate" />
            </filter>
          </defs>
        </svg>
      ) : null}
      <AbsoluteFill
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${horizontal ? s : 1}, ${horizontal ? 1 : s})`,
          filter: b > 0.5 ? `url(#${id})` : undefined,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const whipPan = (props: WhipPanProps = {}): TransitionPresentation<WhipPanProps> => ({
  component: WhipPanComponent,
  props,
});

// ──────────────────────────────── zoomDive ─────────────────────────────────
export type ZoomDiveProps = {
  /** ponto de mergulho em px da composição (default centro). */
  x?: number;
  y?: number;
  /** escala final da cena que sai (default 18). */
  maxScale?: number;
  /** raio (px, na escala 1) do "buraco" por onde a nova cena aparece (ex.: miolo do "0"). default 70. */
  holeRadius?: number;
  /** escala inicial da cena que entra (parallax; default 1.25 → 1). */
  enterScale?: number;
};

const ZoomDiveComponent: React.FC<TransitionPresentationComponentProps<ZoomDiveProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const { width, height } = useVideoConfig();
  const { x = width / 2, y = height / 2, maxScale = 18, holeRadius = 70, enterScale = 1.25 } = passedProps;
  const p = Math.min(1, Math.max(0, presentationProgress));
  const e = EXPO_IN(p);
  const scale = mix(1, maxScale, e);
  if (presentationDirection === 'exiting') {
    return (
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `${x}px ${y}px` }}>{children}</AbsoluteFill>
    );
  }
  const diag = Math.hypot(width, height);
  const r = holeRadius * scale;
  const clip = r >= diag ? undefined : `circle(${r}px at ${x}px ${y}px)`;
  const s = mix(enterScale, 1, EXPO_OUT(p));
  return (
    <AbsoluteFill style={{ clipPath: clip, WebkitClipPath: clip }}>
      <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: `${x}px ${y}px` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

export const zoomDive = (props: ZoomDiveProps = {}): TransitionPresentation<ZoomDiveProps> => ({
  component: ZoomDiveComponent,
  props,
});

// ─────────────────────────────── liquidWipe ────────────────────────────────
export type LiquidWipeProps = {
  /** sentido em que a frente líquida avança (default 'up': de baixo para cima). */
  direction?: Dir;
  /** número de ondas ao longo da frente (default 2.5). */
  waves?: number;
  /** amplitude da onda em px (default 90). */
  amplitude?: number;
  /** cor da faixa líquida na borda (default teal). null = sem faixa. */
  color?: string | null;
  /** largura da faixa líquida (px). default 70. */
  bandWidth?: number;
  seed?: number;
};

/** Gera o contorno da região "inundada" para progresso p (coords px). */
const liquidPath = (
  p: number,
  W: number,
  H: number,
  dir: Dir,
  waves: number,
  A: number,
  offset: number,
  seed: number,
  bw: number,
): string => {
  const along = dir === 'up' || dir === 'down' ? W : H; // eixo da frente
  const travel = dir === 'up' || dir === 'down' ? H : W; // eixo do avanço
  const ph = p * Math.PI * 3 + seed;
  const amp = A * Math.sin(Math.PI * Math.min(1, p * 1.15)); // onda some no início/fim
  const front = mix(-A * 2 - bw, travel + A * 2, p) - offset; // distância percorrida (offset<0 → à frente)
  const steps = 48;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const u = (i / steps) * along;
    const n = u / along;
    const w =
      Math.sin(n * Math.PI * 2 * waves + ph) * amp +
      Math.sin(n * Math.PI * 2 * waves * 2.3 - ph * 1.7) * amp * 0.35 +
      Math.exp(-Math.pow((n - 0.62) * 9, 2)) * amp * 0.9 * Math.sin(ph * 0.5); // "gota" que puxa à frente
    const d = front + w;
    pts.push([u, d]);
  }
  const toXY = ([u, d]: [number, number]): [number, number] => {
    switch (dir) {
      case 'up':
        return [u, H - d];
      case 'down':
        return [u, d];
      case 'right':
        return [d, u];
      case 'left':
        return [W - d, u];
    }
  };
  const base: [number, number][] =
    dir === 'up'
      ? [[W, H + 10], [0, H + 10]]
      : dir === 'down'
        ? [[W, -10], [0, -10]]
        : dir === 'right'
          ? [[-10, H], [-10, 0]]
          : [[W + 10, H], [W + 10, 0]];
  const all = pts.map(toXY);
  let dStr = `M ${all[0][0].toFixed(1)} ${all[0][1].toFixed(1)}`;
  for (let i = 1; i < all.length; i++) {
    const [x0, y0] = all[i - 1];
    const [x1, y1] = all[i];
    dStr += ` Q ${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`;
  }
  const last = all[all.length - 1];
  dStr += ` L ${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
  dStr += ` L ${base[0][0]} ${base[0][1]} L ${base[1][0]} ${base[1][1]} Z`;
  return dStr;
};

const LiquidWipeComponent: React.FC<TransitionPresentationComponentProps<LiquidWipeProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const { width: W, height: H } = useVideoConfig();
  const {
    direction = 'up',
    waves = 2.5,
    amplitude = 90,
    color = C.teal,
    bandWidth = 70,
    seed = 0,
  } = passedProps;
  const p = FLUID(Math.min(1, Math.max(0, presentationProgress)));
  if (presentationDirection === 'exiting') {
    // leve avanço da cena que sai (profundidade), sem fade e sem expor bordas
    const s = mix(1, 1.05, p);
    return <AbsoluteFill style={{ transform: `scale(${s})` }}>{children}</AbsoluteFill>;
  }
  if (p >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const inner = liquidPath(p, W, H, direction, waves, amplitude, 0, seed, bandWidth);
  const outer = liquidPath(p, W, H, direction, waves, amplitude, -bandWidth, seed + 0.6, bandWidth);
  return (
    <AbsoluteFill>
      {color ? (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <path d={outer} fill={color} />
          <path d={outer} fill={C.tealLight} opacity={0.35} transform={`translate(0 ${direction === 'up' ? -6 : 6})`} />
        </svg>
      ) : null}
      <AbsoluteFill style={{ clipPath: `path('${inner}')`, WebkitClipPath: `path('${inner}')` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

export const liquidWipe = (props: LiquidWipeProps = {}): TransitionPresentation<LiquidWipeProps> => ({
  component: LiquidWipeComponent,
  props,
});

// ─────────────────────────────── ribbonWipe ────────────────────────────────
export type RibbonWipeProps = {
  /** inclinação da faixa em graus a partir da vertical (default −20). */
  angle?: number;
  /** largura da faixa em px (default 280). */
  bandWidth?: number;
  /** 'right' = varre da esquerda p/ direita (default) | 'left'. */
  direction?: 'right' | 'left';
};

const RibbonWipeComponent: React.FC<TransitionPresentationComponentProps<RibbonWipeProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const { width: W, height: H } = useVideoConfig();
  const id = safeId('rib' + useId());
  const { angle = -20, bandWidth = 280, direction = 'right' } = passedProps;
  const p = Math.min(1, Math.max(0, presentationProgress));
  const e = SNAP(p);
  if (presentationDirection === 'exiting') {
    const push = (direction === 'right' ? 1 : -1) * 60 * EXPO_IN(p);
    return <AbsoluteFill style={{ transform: `translateX(${push}px)` }}>{children}</AbsoluteFill>;
  }
  const k = Math.tan((angle * Math.PI) / 180);
  const slant = Math.abs(k) * H; // deslocamento horizontal topo↔base
  // posição da borda de TRÁS da faixa (no centro vertical), percorrendo de fora a fora
  const startX = -bandWidth - slant;
  const endX = W + slant;
  const xt = mix(startX, endX, e);
  // em 'left' espelhamos
  const fx = (x: number) => (direction === 'right' ? x : W - x);
  const edge = (xc: number, y: number) => xc + k * (y - H / 2);
  const yT = -20;
  const yB = H + 20;
  const reveal = [
    [fx(-W), yT],
    [fx(edge(xt, yT)), yT],
    [fx(edge(xt, yB)), yB],
    [fx(-W), yB],
  ];
  const band = [
    [fx(edge(xt, yT)), yT],
    [fx(edge(xt + bandWidth, yT)), yT],
    [fx(edge(xt + bandWidth, yB)), yB],
    [fx(edge(xt, yB)), yB],
  ];
  const hi = [
    [fx(edge(xt + bandWidth * 0.62, yT)), yT],
    [fx(edge(xt + bandWidth * 0.7, yT)), yT],
    [fx(edge(xt + bandWidth * 0.7, yB)), yB],
    [fx(edge(xt + bandWidth * 0.62, yB)), yB],
  ];
  const shadow = [
    [fx(edge(xt - 18, yT)), yT],
    [fx(edge(xt, yT)), yT],
    [fx(edge(xt, yB)), yB],
    [fx(edge(xt - 18, yB)), yB],
  ];
  const poly = (pts: number[][]) => pts.map(([a, b]) => `${a.toFixed(1)}px ${b.toFixed(1)}px`).join(', ');
  const svgPts = (pts: number[][]) => pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
  const clip = p >= 1 ? undefined : `polygon(${poly(reveal)})`;
  const showBand = p > 0 && p < 1;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: clip, WebkitClipPath: clip }}>{children}</AbsoluteFill>
      {showBand ? (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={C.orange} />
              <stop offset="1" stopColor={C.amber} />
            </linearGradient>
          </defs>
          <polygon points={svgPts(shadow)} fill={C.navyNight} opacity={0.3} />
          <polygon points={svgPts(band)} fill={`url(#${id})`} />
          <polygon points={svgPts(hi)} fill={C.white} opacity={0.55} />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

export const ribbonWipe = (props: RibbonWipeProps = {}): TransitionPresentation<RibbonWipeProps> => ({
  component: RibbonWipeComponent,
  props,
});

// ─────────────────────────────── wrapper manual ────────────────────────────
export type TransitionWrapProps<P extends Record<string, unknown>> = {
  presentation: TransitionPresentation<P>;
  /** progresso LINEAR 0..1 (ex.: prog(frame, 705, 720)). */
  progress: number;
  role: 'entering' | 'exiting';
  durationInFrames?: number;
  children: React.ReactNode;
};

/** Aplica uma presentation fora do TransitionSeries (para as Sequences sobrepostas do storyboard). */
export function TransitionWrap<P extends Record<string, unknown>>({
  presentation,
  progress,
  role,
  durationInFrames = 15,
  children,
}: TransitionWrapProps<P>) {
  const Comp = presentation.component as React.FC<TransitionPresentationComponentProps<P>>;
  return (
    <Comp
      presentationProgress={progress}
      presentationDirection={role}
      passedProps={presentation.props}
      presentationDurationInFrames={durationInFrames}
    >
      {children}
    </Comp>
  );
}

/** Atalho: progresso linear de uma transição em frames absolutos. */
export const transitionProgress = (frame: number, from: number, durationInFrames: number) =>
  prog(frame, from, from + durationInFrames);
