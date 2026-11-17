// Núcleo cinematográfico reutilizável: câmera virtual com parallax, partículas,
// raios de luz, granulação de filme, vinheta e textura de pintura.
import React, {createContext, useContext, useMemo} from 'react';
import {AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

export const W = 1080;
export const H = 1920;

export type Cam = {x: number; y: number; z: number; r?: number};
type CamCtx = {x: number; y: number; z: number; r: number};
const CameraContext = createContext<CamCtx>({x: 0, y: 0, z: 1, r: 0});

export const ease = Easing.bezier(0.45, 0, 0.2, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/** Interpola por uma lista de keyframes {f, ...valores} com easing cinematográfico. */
export function keys<T extends Record<string, number>>(frame: number, kf: Array<{f: number} & T>): T {
  const out: Record<string, number> = {};
  const names = Object.keys(kf[0]).filter((k) => k !== 'f');
  for (const n of names) {
    out[n] = interpolate(frame, kf.map((k) => k.f), kf.map((k) => (k as any)[n]), {
      easing: ease,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }
  return out as T;
}

/** Câmera: move-se de `from` para `to` (com keyframes opcionais) e tremor de mão sutil. */
export const Camera: React.FC<{kf: Array<{f: number} & Cam>; shake?: number; children: React.ReactNode}> = ({kf, shake = 1, children}) => {
  const frame = useCurrentFrame();
  const k = keys(frame, kf.map((c) => ({f: c.f, x: c.x, y: c.y, z: c.z, r: c.r ?? 0})));
  const sx = (Math.sin(frame / 23) * 3 + Math.sin(frame / 9.7) * 1.2) * shake;
  const sy = (Math.cos(frame / 19) * 3 + Math.sin(frame / 11.3) * 1.1) * shake;
  return <CameraContext.Provider value={{x: k.x + sx, y: k.y + sy, z: k.z, r: k.r}}>{children}</CameraContext.Provider>;
};

/** Camada de parallax. depth 0 = infinito (quase parado), 1 = plano do personagem, >1 = primeiro plano. */
export const Layer: React.FC<{depth: number; children: React.ReactNode; style?: React.CSSProperties; blur?: number}> = ({depth, children, style, blur}) => {
  const c = useContext(CameraContext);
  const s = 1 + (c.z - 1) * depth;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${-c.x * depth}px, ${-c.y * depth}px) scale(${s}) rotate(${c.r * depth}deg)`,
        transformOrigin: '50% 50%',
        filter: blur ? `blur(${blur}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Partículas (poeira, cinza, brasas, neve) com deriva e cintilação determinísticas. */
export const Particles: React.FC<{
  n?: number; seed?: string; color?: string; size?: [number, number]; speed?: number;
  drift?: number; rise?: boolean; glow?: boolean; opacity?: number; area?: [number, number, number, number];
}> = ({n = 60, seed = 'p', color = '#F1D08A', size = [2, 6], speed = 1, drift = 30, rise = true, glow = true, opacity = 0.8, area = [0, 0, W, H]}) => {
  const frame = useCurrentFrame();
  const items = useMemo(() => Array.from({length: n}, (_, i) => ({
    x: random(`${seed}x${i}`), y: random(`${seed}y${i}`), s: random(`${seed}s${i}`), p: random(`${seed}p${i}`) * 100,
    v: 0.4 + random(`${seed}v${i}`) * 0.9,
  })), [n, seed]);
  const [ax, ay, aw, ah] = area;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <defs><radialGradient id={`pg${seed}`}><stop offset="0" stopColor={color} /><stop offset="0.3" stopColor={color} stopOpacity={0.55} /><stop offset="1" stopColor={color} stopOpacity={0} /></radialGradient></defs>
        {items.map((it, i) => {
          const t = frame * speed * it.v;
          const yy = ((it.y * ah + (rise ? -t : t) * 1.2) % ah + ah) % ah + ay;
          const xx = ax + it.x * aw + Math.sin((t + it.p) / 40) * drift;
          const r = size[0] + it.s * (size[1] - size[0]);
          const tw = 0.45 + 0.55 * Math.abs(Math.sin((frame + it.p * 7) / (18 + it.s * 20)));
          return glow
            ? <circle key={i} cx={xx} cy={yy} r={r * 3.2} fill={`url(#pg${seed})`} opacity={opacity * tw} />
            : <circle key={i} cx={xx} cy={yy} r={r} fill={color} opacity={opacity * tw} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** Feixes volumétricos de luz (god rays). */
export const LightRays: React.FC<{x: number; y: number; angle?: number; spread?: number; color?: string; opacity?: number; count?: number; length?: number}> = ({
  x, y, angle = 20, spread = 26, color = '#F1D08A', opacity = 0.35, count = 7, length = 2600,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{mixBlendMode: 'screen', pointerEvents: 'none'}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <defs>
          <linearGradient id={`ray${x}${y}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={1} />
            <stop offset="1" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`rayh${x}${y}`} x1="0" x2="1"><stop offset="0" stopColor="#000" /><stop offset="0.5" stopColor="#fff" /><stop offset="1" stopColor="#000" /></linearGradient>
          <mask id={`raym${x}${y}`} maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill={`url(#rayh${x}${y})`} /></mask>
        </defs>
        <g>
          {Array.from({length: count}, (_, i) => {
            const a = angle - spread / 2 + (spread * i) / Math.max(1, count - 1) + Math.sin(frame / 50 + i) * 1.2;
            const w = 40 + random(`rw${i}`) * 90;
            const o = opacity * (0.4 + 0.6 * Math.abs(Math.sin(frame / 45 + i * 1.7)));
            return (
              <g key={i} transform={`translate(${x},${y}) rotate(${a})`}>
                <polygon points={`${-w * 0.15},0 ${w * 0.15},0 ${w},${length} ${-w},${length}`} fill={`url(#ray${x}${y})`} opacity={o} mask={`url(#raym${x}${y})`} />
              </g>
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** Acabamento de película: textura de pintura, granulação animada, vinheta e flicker. */
export const FilmFinish: React.FC<{vignette?: number; grain?: number; paper?: number; tint?: string}> = ({vignette = 0.75, grain = 0.09, paper = 0.16, tint}) => {
  const frame = useCurrentFrame();
  const g = Math.floor(frame / 2) % 6;
  const flick = 1 - 0.025 * Math.abs(Math.sin(frame * 1.7) * Math.sin(frame * 0.37));
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Img src={staticFile('fx/paper.png')} style={{position: 'absolute', width: W, height: H, mixBlendMode: 'overlay', opacity: paper}} />
      <Img src={staticFile(`fx/grain${g}.png`)} style={{position: 'absolute', width: W, height: H, mixBlendMode: 'overlay', opacity: grain}} />
      {tint && <AbsoluteFill style={{background: tint, mixBlendMode: 'soft-light'}} />}
      <AbsoluteFill style={{background: `radial-gradient(ellipse 75% 62% at 50% 46%, transparent 45%, rgba(8,5,3,${vignette}) 100%)`}} />
      <AbsoluteFill style={{background: '#000', opacity: 1 - flick}} />
    </AbsoluteFill>
  );
};

/** Fade de entrada/saída da cena (corte suave + mergulho no preto quando pedido). */
export const SceneFade: React.FC<{dur: number; inF?: number; outF?: number; children: React.ReactNode}> = ({dur, inF = 10, outF = 10, children}) => {
  const frame = useCurrentFrame();
  const o = Math.min(
    inF ? interpolate(frame, [0, inF], [0, 1], {extrapolateRight: 'clamp'}) : 1,
    outF ? interpolate(frame, [dur - outF, dur], [1, 0], {extrapolateLeft: 'clamp'}) : 1,
  );
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const useSec = () => {
  const {fps} = useVideoConfig();
  return (s: number) => Math.round(s * fps);
};

/** Neblina em camadas que desliza lateralmente. */
export const Fog: React.FC<{color?: string; opacity?: number; y?: number; h?: number; speed?: number; seed?: number}> = ({color = '#b9a58a', opacity = 0.25, y = 1100, h = 700, speed = 0.6, seed = 0}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <defs><radialGradient id={`fog${seed}`}><stop offset="0" stopColor={color} stopOpacity={0.9} /><stop offset="0.55" stopColor={color} stopOpacity={0.4} /><stop offset="1" stopColor={color} stopOpacity={0} /></radialGradient></defs>
        <g opacity={opacity}>
          {Array.from({length: 7}, (_, i) => {
            const x = ((i * 260 + frame * speed * (0.6 + (i % 3) * 0.3) + seed * 97) % 1800) - 400;
            return <ellipse key={i} cx={x} cy={y + Math.sin(i * 2.1 + seed) * h * 0.3} rx={(260 + (i % 3) * 90) * 1.6} ry={(70 + (i % 2) * 50) * 2} fill={`url(#fog${seed})`} />;
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
