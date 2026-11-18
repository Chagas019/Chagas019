// PAFIES 2027 v2 — kit de motion editorial (câmera 2.5D, fitas, morphing, máscaras, tipografia).
import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export const P = {
  royal: '#1E40C8', royalDark: '#14309A', navy: '#0B1033', red: '#E8233F', redDark: '#A3173A',
  yellow: '#FFD000', yellowDark: '#E0A800', cream: '#EFE9DF', creamDark: '#D9CFBF', sky: '#8EC5E8', skyDark: '#5E9CC8',
  skin: '#FF6B5B', skinDark: '#C83A4E', maroon: '#3A1410', white: '#FFFFFF',
};
export const F = 'Anton, Impact, sans-serif';
export const FUI = 'Inter, sans-serif';
export const cl = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const eOut = Easing.bezier(0.16, 1, 0.3, 1);
export const eIn = Easing.bezier(0.7, 0, 0.84, 0);
export const eInOut = Easing.bezier(0.83, 0, 0.17, 1);
export const ramp = (f: number, a: number, b: number, e = eOut) => interpolate(f, [a, b], [0, 1], { ...cl, easing: e });

/* ---------------- câmera 2.5D ----------------
   Cada <Layer depth> desloca/escala proporcionalmente à câmera: depth 0 = fundo (quase parado), 1 = plano de foco, >1 = primeiro plano. */
type CamState = { x: number; y: number; z: number; rot: number };
const CamCtx = React.createContext<CamState>({ x: 0, y: 0, z: 1, rot: 0 });
export const Cam: React.FC<{ x?: number; y?: number; z?: number; rot?: number; children: React.ReactNode }> = ({ x = 0, y = 0, z = 1, rot = 0, children }) => (
  <CamCtx.Provider value={{ x, y, z, rot }}><AbsoluteFill style={{ overflow: 'hidden' }}>{children}</AbsoluteFill></CamCtx.Provider>
);
export const Layer: React.FC<{ depth: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ depth, children, style }) => {
  const c = React.useContext(CamCtx);
  const s = 1 + (c.z - 1) * depth;
  return <AbsoluteFill style={{ transform: `translate(${-c.x * depth}px, ${-c.y * depth}px) scale(${s}) rotate(${c.rot * depth}deg)`, transformOrigin: '540px 960px', ...style }}>{children}</AbsoluteFill>;
};

/* ---------------- fitas de velocidade (assinatura visual) ----------------
   Desenha um caminho com cabeça e cauda animadas (pathLength normalizado). */
export const Ribbon: React.FC<{ d: string; colors: string[]; width: number; start: number; dur?: number; tail?: number; gap?: number; hold?: boolean }> =
  ({ d, colors, width, start, dur = 26, tail = 0.55, gap = 0.18, hold = false }) => {
    const f = useCurrentFrame();
    const head = ramp(f, start, start + dur, eOut);
    const tl = hold ? 0 : ramp(f, start + dur * tail, start + dur * (1 + tail), eInOut);
    if (head <= 0 || tl >= 1) return null;
    return (
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        {colors.map((c, i) => {
          const w = width * (1 - i * gap);
          const lag = i * 0.03;
          const h = Math.max(0, head - lag), t = Math.max(0, tl - lag * 0.5);
          return <path key={i} d={d} pathLength={1} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round"
            strokeDasharray={`${Math.max(0, h - t)} 2`} strokeDashoffset={-t} />;
        })}
      </svg>
    );
  };

/* ---------------- morphing de formas (mesma topologia: N pontos polares) ---------------- */
const N = 96;
export type Shape = (t: number) => [number, number]; // t∈[0,1) → ponto normalizado (raio ~1)
export const circle: Shape = (t) => [Math.cos(t * 2 * Math.PI - Math.PI / 2), Math.sin(t * 2 * Math.PI - Math.PI / 2)];
export const heart: Shape = (t) => {
  const a = t * 2 * Math.PI;
  const x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
  return [x / 16, -y / 16 + 0.1];
};
export const splat = (seed: string, amp = 0.28): Shape => (t) => {
  const a = t * 2 * Math.PI - Math.PI / 2;
  let r = 1;
  for (let k = 3; k <= 9; k += 2) r += amp * (random(seed + k) - 0.5) * Math.sin(k * a + random(seed + 'p' + k) * 6);
  return [Math.cos(a) * r, Math.sin(a) * r];
};
export const Morph: React.FC<{ a: Shape; b: Shape; p: number; x: number; y: number; r: number; fill: string; rot?: number; style?: React.CSSProperties; stroke?: string; sw?: number }> =
  ({ a, b, p, x, y, r, fill, rot = 0, style, stroke, sw = 0 }) => {
    let d = '';
    for (let i = 0; i < N; i++) {
      const t = i / N, [ax, ay] = a(t), [bx, by] = b(t);
      const px = x + (ax + (bx - ax) * p) * r, py = y + (ay + (by - ay) * p) * r;
      d += (i ? 'L' : 'M') + px.toFixed(1) + ',' + py.toFixed(1);
    }
    return <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', ...style }}>
      <path d={d + 'Z'} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" transform={`rotate(${rot} ${x} ${y})`} />
    </svg>;
  };

/* ---------------- tipografia: palavra por palavra com máscara ---------------- */
export const Words: React.FC<{
  text: string; start: number; size: number; y: number; color?: string; x?: number; stagger?: number; exit?: number;
  align?: 'center' | 'left'; shadow?: string; tracking?: number; rot?: number; lineH?: number; dur?: number; font?: string;
}> = ({ text, start, size, y, color = P.cream, x = 540, stagger = 4, exit, align = 'center', shadow, tracking = 0.005, rot = 0, lineH = 1, dur = 14, font = F }) => {
  const f = useCurrentFrame();
  if (f < start - 1) return null;
  const words = text.split(' ');
  const ex = exit !== undefined ? ramp(f, exit, exit + 10, eIn) : 0;
  return (
    <div style={{
      position: 'absolute', top: y - size * 0.6, left: align === 'center' ? 0 : x, width: align === 'center' ? 1080 : 1080 - x,
      textAlign: align, transform: `rotate(${rot}deg)`, transformOrigin: `${x}px ${size / 2}px`, whiteSpace: 'nowrap',
    }}>
      {words.map((w, i) => {
        const p = ramp(f, start + i * stagger, start + i * stagger + dur);
        const px = ex > 0 ? ramp(f, exit! + i * 2, exit! + i * 2 + 10, eIn) : 0;
        return (
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', padding: `${size * 0.22}px ${size * 0.06}px ${size * 0.12}px`, margin: `${-size * 0.22}px ${size * 0.04}px 0` }}>
            <span style={{
              display: 'inline-block', fontFamily: font, fontWeight: font === F ? 400 : 900, fontSize: size, lineHeight: lineH, color, letterSpacing: `${tracking}em`,
              transform: `translateY(${(1 - p) * 140 - px * 150}%) skewY(${(1 - p) * 6}deg)`, opacity: px >= 1 ? 0 : 1,
              textShadow: shadow ? `${size * 0.035}px ${size * 0.045}px 0 ${shadow}` : undefined,
            }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

/* número/título com sombra longa (extrusão 2D editorial) */
export const LongShadow: React.FC<{ text: string; size: number; x: number; y: number; color: string; shade: string; len?: number; start: number; angle?: number; font?: string }> =
  ({ text, size, x, y, color, shade, len = 40, start, angle = 45, font = F }) => {
    const f = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = spring({ frame: f - start, fps, config: { damping: 12, stiffness: 140 } });
    const grow = ramp(f, start + 4, start + 22);
    const L = Math.round(len * grow);
    const dx = Math.cos((angle * Math.PI) / 180), dy = Math.sin((angle * Math.PI) / 180);
    const sh = new Array(L).fill(0).map((_, i) => `${(i + 1) * dx}px ${(i + 1) * dy}px 0 ${shade}`).join(',');
    if (f < start) return null;
    return <div style={{ position: 'absolute', left: x - 600, width: 1200, top: y - size * 0.55, textAlign: 'center', fontFamily: font, fontWeight: font === F ? 400 : 900, fontSize: size, lineHeight: 1, color, textShadow: sh, transform: `scale(${0.4 + 0.6 * s}) rotate(${(1 - s) * -8}deg)`, opacity: Math.min(1, s * 3) }}>{text}</div>;
  };

/* faixa/tarja revelada por máscara */
export const Band: React.FC<{ x: number; y: number; w: number; h: number; start: number; color: string; rot?: number; fromRight?: boolean; exit?: number }> =
  ({ x, y, w, h, start, color, rot = -3, fromRight, exit }) => {
    const f = useCurrentFrame();
    const p = ramp(f, start, start + 12);
    const q = exit !== undefined ? ramp(f, exit, exit + 10, eIn) : 0;
    if (p <= 0) return null;
    const a = fromRight ? 100 - p * 100 : 0, b = fromRight ? 100 : p * 100;
    return <div style={{
      position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, background: color, transform: `rotate(${rot}deg)`,
      clipPath: `polygon(${a + q * 100}% 0, ${b}% 0, ${b}% 100%, ${a + q * 100}% 100%)`,
    }} />;
  };

/* transição: wipe diagonal (máscara) sincronizado ao compasso */
export const Wipe: React.FC<{ at: number; dur?: number; colors: string[]; dir?: 1 | -1 }> = ({ at, dur = 14, colors, dir = 1 }) => {
  const f = useCurrentFrame();
  if (f < at || f > at + dur + colors.length * 3) return null;
  return <AbsoluteFill style={{ pointerEvents: 'none' }}>
    {colors.map((c, i) => {
      const pIn = ramp(f, at + i * 2, at + i * 2 + dur / 2, eInOut), pOut = ramp(f, at + dur / 2 + i * 2, at + dur + i * 2, eInOut);
      const A = -40 + pOut * 180, B = -40 + pIn * 180;
      const poly = dir === 1
        ? `polygon(${A}% 0, ${B}% 0, ${B - 40}% 100%, ${A - 40}% 100%)`
        : `polygon(${140 - B}% 0, ${140 - A}% 0, ${100 - A}% 100%, ${100 - B}% 100%)`;
      return <AbsoluteFill key={i} style={{ background: c, clipPath: poly }} />;
    })}
  </AbsoluteFill>;
};

/* elementos geométricos flutuantes (parallax) */
export const Floaters: React.FC<{ seed: string; count?: number; colors: string[]; area?: [number, number, number, number]; size?: [number, number] }> =
  ({ seed, count = 14, colors, area = [0, 0, 1080, 1920], size = [18, 56] }) => {
    const f = useCurrentFrame();
    return <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {new Array(count).fill(0).map((_, i) => {
        const r = (k: string) => random(seed + k + i);
        const x = area[0] + r('x') * area[2], y = area[1] + r('y') * area[3] - f * (0.4 + r('v') * 1.2);
        const s = size[0] + r('s') * (size[1] - size[0]);
        const kind = Math.floor(r('k') * 4), c = colors[Math.floor(r('c') * colors.length)];
        const rot = r('r') * 360 + f * (r('w') - 0.5) * 4;
        const appear = ramp(f, r('d') * 20, r('d') * 20 + 12);
        const st: React.CSSProperties = { position: 'absolute', left: x, top: y, width: s, height: s, transform: `rotate(${rot}deg) scale(${appear})` };
        if (kind === 0) return <div key={i} style={{ ...st, borderRadius: '50%', background: c }} />;
        if (kind === 1) return <div key={i} style={{ ...st, borderRadius: '50%', border: `${s * 0.22}px solid ${c}` }} />;
        if (kind === 2) return <svg key={i} viewBox="0 0 10 10" style={st}><polygon points="5,0 10,10 0,10" fill={c} /></svg>;
        return <svg key={i} viewBox="0 0 10 10" style={st}><path d="M4,0h2v4h4v2h-4v4h-2v-4h-4v-2h4z" fill={c} /></svg>;
      })}
    </AbsoluteFill>;
  };

export const Confetti: React.FC<{ start: number; count?: number; seed?: string; burst?: [number, number] }> = ({ start, count = 70, seed = 'cf', burst }) => {
  const f = useCurrentFrame() - start;
  if (f < 0) return null;
  const cols = [P.yellow, P.red, P.cream, P.sky, P.royal];
  return <AbsoluteFill style={{ pointerEvents: 'none' }}>
    {new Array(count).fill(0).map((_, i) => {
      const r = (k: string) => random(seed + k + i);
      let x: number, y: number;
      if (burst) {
        const a = r('a') * Math.PI * 2, v = 10 + r('v') * 26;
        x = burst[0] + Math.cos(a) * v * f * 0.9; y = burst[1] + Math.sin(a) * v * f * 0.9 + 0.35 * f * f;
      } else { x = r('x') * 1080 + Math.sin(f / 10 + i) * 30; y = -60 + ((f * (4 + r('v') * 6) + r('y') * 1980) % 2000); }
      const w = 14 + r('w') * 16;
      return <div key={i} style={{ position: 'absolute', left: x, top: y, width: w, height: w * 0.45, background: cols[i % cols.length], transform: `rotate(${f * (r('s') * 20 - 10) + r('r') * 360}deg) scaleY(${Math.cos(f / 4 + i)})` }} />;
    })}
  </AbsoluteFill>;
};

export const Spray: React.FC<{ color: 'yellow' | 'red' | 'cream' | 'blue' | 'navy'; opacity?: number; start?: number; rot?: number; scale?: number; x?: number; y?: number }> =
  ({ color, opacity = 1, start = 0, rot = 0, scale = 1, x = 0, y = 0 }) => {
    const f = useCurrentFrame();
    const p = ramp(f, start, start + 10);
    return <Img src={staticFile(`textures/spray_${color}.png`)} style={{ position: 'absolute', left: x, top: y, width: 1080, height: 1920, opacity: opacity * p, transform: `rotate(${rot}deg) scale(${scale * (0.85 + 0.15 * p)})` }} />;
  };

export const PaperGrain: React.FC<{ opacity?: number }> = ({ opacity = 0.12 }) => {
  const f = useCurrentFrame();
  const o = Math.floor(f / 2);
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile('textures/paper.png')})`, backgroundPosition: `${(o * 37) % 512}px ${(o * 91) % 512}px`, mixBlendMode: 'overlay', opacity, pointerEvents: 'none' }} />;
};

export const Shake: React.FC<{ hits: number[]; children: React.ReactNode; amp?: number }> = ({ hits, children, amp = 26 }) => {
  const f = useCurrentFrame();
  let x = 0, y = 0, s = 0;
  for (const h of hits) {
    const d = f - h;
    if (d >= 0 && d < 12) { const a = (1 - d / 12) ** 2; x += (random('x' + h + d) - 0.5) * amp * a; y += (random('y' + h + d) - 0.5) * amp * a; s = Math.max(s, a * 0.04); }
  }
  return <AbsoluteFill style={{ transform: `translate(${x}px,${y}px) scale(${1 + s})` }}>{children}</AbsoluteFill>;
};
