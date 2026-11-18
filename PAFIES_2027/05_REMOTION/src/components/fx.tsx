import React from 'react';
import {
  AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig, Easing,
} from 'remotion';
import { C, FONT, FONT_UI } from '../theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1); // expo-out (curva "Graph Editor")
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

/* ---------- sequência 3D renderizada no Blender (PNG RGBA) ---------- */
export const Seq3D: React.FC<{
  name: string; frames: number; loop?: boolean; speed?: number; offset?: number; style?: React.CSSProperties;
}> = ({ name, frames, loop = true, speed = 1, offset = 0, style }) => {
  const f = useCurrentFrame();
  let i = Math.floor(f * speed + offset);
  i = loop ? ((i % frames) + frames) % frames : Math.min(Math.max(i, 0), frames - 1);
  const src = staticFile(`3d/${name}/${name}_${String(i + 1).padStart(4, '0')}.png`);
  return <Img src={src} style={{ position: 'absolute', ...style }} />;
};

/* ---------- raios de luz (sunburst) girando ---------- */
export const Sunburst: React.FC<{ color?: 'amarelo' | 'azul'; opacity?: number; speed?: number; size?: number; x?: number; y?: number; }> =
  ({ color = 'amarelo', opacity = 0.15, speed = 0.15, size = 2600, x = 540, y = 960 }) => {
    const f = useCurrentFrame();
    return (
      <Img src={staticFile(`vetores/sunburst_${color}.svg`)} style={{
        position: 'absolute', width: size, height: size, left: x - size / 2, top: y - size / 2,
        opacity, transform: `rotate(${f * speed}deg)`,
      }} />
    );
  };

export const Halftone: React.FC<{ src?: string; opacity?: number; drift?: number; style?: React.CSSProperties }> =
  ({ src = 'halftone_radial_preto', opacity = 0.25, drift = 0, style }) => {
    const f = useCurrentFrame();
    return <Img src={staticFile(`vetores/${src}.svg`)} style={{
      position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, opacity,
      transform: `translateY(${-f * drift}px) scale(1.1)`, ...style,
    }} />;
  };

/* ---------- raio amarelo (lightning) com pop + wobble ---------- */
export const Bolt: React.FC<{ v?: 'a' | 'b' | 'c'; x: number; y: number; size?: number; rot?: number; delay?: number; flip?: boolean }> =
  ({ v = 'a', x, y, size = 220, rot = 0, delay = 0, flip }) => {
    const f = useCurrentFrame();
    const { fps } = useVideoConfig();
    const s = spring({ frame: f - delay, fps, config: { damping: 9, stiffness: 160 } });
    const wob = Math.sin((f - delay) / 6) * 4;
    const flick = random(`bolt${x}${Math.floor(f / 3)}`) > 0.93 ? 0.55 : 1;
    return <Img src={staticFile(`vetores/raio_${v}.svg`)} style={{
      position: 'absolute', left: x - size * 0.27, top: y - size / 2, height: size,
      transform: `scale(${s * (flip ? -1 : 1)}, ${s}) rotate(${rot + wob}deg)`, opacity: Math.min(1, s * 2) * flick,
      filter: 'drop-shadow(0 0 28px rgba(255,208,0,0.55))',
    }} />;
  };

/* ---------- partículas (faíscas / poeira luminosa) ---------- */
export const Particles: React.FC<{
  count?: number; seed?: string; mode?: 'burst' | 'float' | 'rise'; start?: number; color?: string; cx?: number; cy?: number; spread?: number;
}> = ({ count = 60, seed = 'p', mode = 'float', start = 0, color = C.yellow, cx = 540, cy = 960, spread = 1 }) => {
  const f = useCurrentFrame() - start;
  if (f < 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {new Array(count).fill(0).map((_, i) => {
        const r1 = random(seed + i), r2 = random(seed + 'b' + i), r3 = random(seed + 'c' + i);
        const sz = 4 + r3 * 14;
        let x: number, y: number, o: number;
        if (mode === 'burst') {
          const ang = r1 * Math.PI * 2, sp = (8 + r2 * 34) * spread;
          const d = sp * (1 - Math.exp(-f / 14)) * 14;
          x = cx + Math.cos(ang) * d; y = cy + Math.sin(ang) * d + f * f * 0.02;
          o = interpolate(f, [0, 4, 40 + r3 * 30], [0, 1, 0], clamp);
        } else if (mode === 'rise') {
          x = r1 * 1080 + Math.sin((f + i * 20) / 30) * 30;
          y = 1920 + 50 - ((f * (2 + r2 * 5) + r3 * 2000) % 2100);
          o = 0.35 + 0.65 * Math.abs(Math.sin((f + i * 7) / 18));
        } else {
          x = r1 * 1080 + Math.sin((f + i * 13) / 40) * 40;
          y = r2 * 1920 + Math.cos((f + i * 9) / 50) * 40 - f * 0.6 * (0.3 + r3);
          o = 0.25 + 0.75 * Math.abs(Math.sin((f + i * 11) / 25));
        }
        const star = i % 5 === 0;
        return <div key={i} style={{
          position: 'absolute', left: x, top: y, width: sz, height: sz, opacity: o,
          background: color, borderRadius: star ? 2 : '50%',
          transform: star ? `rotate(45deg) scale(${0.6 + r2})` : undefined,
          boxShadow: `0 0 ${sz * 1.6}px ${color}`,
        }} />;
      })}
    </AbsoluteFill>
  );
};

/* ---------- tipografia cinética ---------- */
type KMode = 'up' | 'slam' | 'blur' | 'drop' | 'wide';
export const KText: React.FC<{
  text: string; size: number; color?: string; start?: number; mode?: KMode; stagger?: number;
  x?: number; y: number; rot?: number; outline?: string; shadow?: string | null; exit?: number; tracking?: number; width?: number;
}> = ({ text, size, color = C.white, start = 0, mode = 'up', stagger = 1.6, x = 540, y, rot = 0, outline, shadow = C.black, exit, tracking = 0.01, width = 1000 }) => {
  const f = useCurrentFrame() - start;
  const { fps } = useVideoConfig();
  if (f < -1) return null;
  const chars = Array.from(text);
  const exitP = exit !== undefined ? interpolate(f + start, [exit, exit + 8], [0, 1], { ...clamp, easing: easeIn }) : 0;
  return (
    <div style={{
      position: 'absolute', left: x - width / 2, width, top: y - size * 0.62, textAlign: 'center', whiteSpace: 'nowrap',
      transform: `rotate(${rot}deg) translateY(${-exitP * 60}px) scale(${1 + exitP * 0.15})`, opacity: 1 - exitP,
      filter: exitP > 0 ? `blur(${exitP * 14}px)` : undefined,
    }}>
      {chars.map((ch, i) => {
        const lf = f - i * stagger;
        const s = spring({ frame: lf, fps, config: mode === 'slam' ? { damping: 11, stiffness: 220, mass: 0.6 } : { damping: 16, stiffness: 140 } });
        const lin = interpolate(lf, [0, 10], [0, 1], { ...clamp, easing: ease });
        let tr = '', blur = 0, op = Math.min(1, lin * 1.6);
        if (mode === 'up') { tr = `translateY(${(1 - s) * size * 0.9}px) rotate(${(1 - s) * 8}deg)`; blur = (1 - lin) * 10; }
        if (mode === 'slam') { tr = `scale(${interpolate(s, [0, 1], [2.6, 1])})`; blur = (1 - lin) * 18; }
        if (mode === 'blur') { tr = `scale(${1.25 - 0.25 * lin})`; blur = (1 - lin) * 30; op = lin; }
        if (mode === 'drop') { tr = `translateY(${(1 - s) * -size * 1.4}px) scaleY(${1 + (1 - lin) * 0.6})`; blur = (1 - lin) * 12; }
        if (mode === 'wide') { tr = `translateX(${(1 - lin) * (i - chars.length / 2) * 22}px)`; blur = (1 - lin) * 20; op = lin; }
        return <span key={i} style={{
          display: 'inline-block', fontFamily: FONT, fontSize: size, lineHeight: 1, color,
          letterSpacing: `${tracking}em`, transform: tr, opacity: op, filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
          WebkitTextStroke: outline ? `${Math.max(3, size * 0.03)}px ${outline}` : undefined,
          paintOrder: 'stroke fill',
          textShadow: shadow ? `${size * 0.04}px ${size * 0.05}px 0 ${shadow}` : undefined,
          whiteSpace: 'pre',
        }}>{ch}</span>;
      })}
    </div>
  );
};

/* ---------- tarja (caixa de destaque editorial) que "varre" ---------- */
export const Highlight: React.FC<{ x: number; y: number; w: number; h: number; start: number; color?: string; rot?: number }> =
  ({ x, y, w, h, start, color = C.yellow, rot = -2 }) => {
    const f = useCurrentFrame();
    const p = interpolate(f, [start, start + 10], [0, 1], { ...clamp, easing: ease });
    return <div style={{
      position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, background: color,
      transform: `rotate(${rot}deg) scaleX(${p})`, transformOrigin: 'left center', boxShadow: `10px 10px 0 ${C.black}`,
    }} />;
  };

/* ---------- logotipo (arquivo substituível) com profundidade/extrusão ---------- */
export const Logo: React.FC<{ start: number; width?: number; x?: number; y?: number; depth?: number }> =
  ({ start, width = 820, x = 540, y = 760, depth = 14 }) => {
    const f = useCurrentFrame() - start;
    const { fps } = useVideoConfig();
    const s = spring({ frame: f, fps, config: { damping: 12, stiffness: 90, mass: 1.1 } });
    const rx = interpolate(s, [0, 1], [75, 0]);
    const z = interpolate(s, [0, 1], [-900, 0]);
    const float = Math.sin(f / 22) * 8;
    const shadows = new Array(depth).fill(0).map((_, i) => `drop-shadow(0 ${1.5}px 0 ${i < depth - 2 ? C.royalDeep : C.black})`).join(' ');
    const glint = interpolate(f, [18, 42], [-0.4, 1.4], clamp);
    return (
      <div style={{ position: 'absolute', left: x - width / 2, top: y - width * 0.25 + float, width, perspective: 1400 }}>
        <div style={{ transform: `translateZ(${z}px) rotateX(${rx}deg) rotateY(${Math.sin(f / 40) * 6}deg)`, opacity: Math.min(1, s * 3), position: 'relative' }}>
          <Img src={staticFile('logo/pafies_logo.png')} style={{ width, filter: `${shadows} drop-shadow(0 30px 40px rgba(0,0,0,0.5))` }} />
          <div style={{
            position: 'absolute', inset: 0, mixBlendMode: 'overlay', pointerEvents: 'none',
            background: `linear-gradient(110deg, transparent ${glint * 100 - 12}%, rgba(255,255,255,0.85) ${glint * 100}%, transparent ${glint * 100 + 12}%)`,
            WebkitMaskImage: `url(${staticFile('logo/pafies_logo.png')})`, WebkitMaskSize: '100% 100%',
          }} />
        </div>
      </div>
    );
  };

/* ---------- câmera: shake em impactos + push ---------- */
export const Camera: React.FC<{ impacts?: number[]; push?: [number, number]; dur?: number; children: React.ReactNode; rot?: number }> =
  ({ impacts = [], push = [1, 1], dur = 100, children, rot = 0 }) => {
    const f = useCurrentFrame();
    let sx = 0, sy = 0, kick = 0;
    for (const t of impacts) {
      const d = f - t;
      if (d >= 0 && d < 14) {
        const a = (1 - d / 14) ** 2;
        sx += (random(`sx${t}${d}`) - 0.5) * 40 * a;
        sy += (random(`sy${t}${d}`) - 0.5) * 40 * a;
        kick = Math.max(kick, a * 0.06);
      }
    }
    const sc = interpolate(f, [0, dur], push, { ...clamp, easing: Easing.inOut(Easing.sin) }) + kick;
    return <AbsoluteFill style={{ transform: `translate(${sx}px,${sy}px) scale(${sc}) rotate(${rot}deg)` }}>{children}</AbsoluteFill>;
  };

export const Flash: React.FC<{ at: number; dur?: number; color?: string; peak?: number }> = ({ at, dur = 10, color = '#fff', peak = 1 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at - 2, at, at + dur], [0, peak, 0], clamp);
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: color, opacity: o, mixBlendMode: 'screen' }} />;
};

/* ---------- acabamento: grão de filme + vinheta ---------- */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.09 }) => {
  const f = useCurrentFrame();
  const ox = Math.floor(random(`gx${f}`) * 256), oy = Math.floor(random(`gy${f}`) * 256);
  return <AbsoluteFill style={{
    backgroundImage: `url(${staticFile('textures/grain.png')})`, backgroundPosition: `${ox}px ${oy}px`,
    opacity, mixBlendMode: 'overlay', pointerEvents: 'none',
  }} />;
};
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 60% at 50% 50%, transparent 55%, rgba(0,0,0,${strength}) 100%)`, pointerEvents: 'none' }} />
);

/* ---------- HUD de contagem (contador dinâmico) ---------- */
export const CountdownHUD: React.FC<{ total: number; label?: string; y?: number }> = ({ total, label = 'A CONTAGEM REGRESSIVA COMEÇOU', y = 250 }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const remain = Math.max(0, total - f / fps);
  const s = Math.floor(remain), cs = Math.floor((remain - s) * 100);
  const o = interpolate(f, [0, 10, durationInFrames - 8, durationInFrames], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: 'absolute', top: y, width: '100%', display: 'flex', justifyContent: 'center', opacity: o }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(10,10,15,0.75)', padding: '10px 22px', borderRadius: 999, border: `3px solid ${C.yellow}` }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: '#FF3B3B', opacity: Math.floor(f / 15) % 2 ? 1 : 0.25 }} />
        <span style={{ fontFamily: FONT_UI, fontWeight: 800, fontSize: 26, color: C.white, letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ fontFamily: FONT_UI, fontWeight: 800, fontSize: 30, color: C.yellow, fontVariantNumeric: 'tabular-nums' }}>
          00:{String(s).padStart(2, '0')}:{String(cs).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};

/* ---------- faixa editorial em loop (marquee) ---------- */
export const Marquee: React.FC<{ words: string[]; y: number; rot?: number; bg?: string; color?: string; speed?: number; size?: number }> =
  ({ words, y, rot = -6, bg = C.yellow, color = C.black, speed = 6, size = 64 }) => {
    const f = useCurrentFrame();
    const line = (words.join('  ✦  ') + '  ✦  ').repeat(6);
    return (
      <div style={{ position: 'absolute', left: -200, width: 1480, top: y, transform: `rotate(${rot}deg)`, background: bg, padding: '14px 0', overflow: 'hidden', boxShadow: `0 12px 0 ${C.black}` }}>
        <div style={{ whiteSpace: 'nowrap', fontFamily: FONT, fontSize: size, color, transform: `translateX(${-(f * speed) % 2400}px)`, letterSpacing: '0.03em' }}>{line}</div>
      </div>
    );
  };

export const Bg: React.FC<{ from: string; to: string; at?: string }> = ({ from, to, at = '50% 40%' }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 70% at ${at}, ${from} 0%, ${to} 100%)` }} />
);
