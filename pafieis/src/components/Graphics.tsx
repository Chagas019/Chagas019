// Elementos de motion design reutilizáveis da identidade PAFIEIS.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DISPLAY_FONT } from '../lib/fonts';
import { E, bell, clamp, lerp, prog, rng } from '../lib/anim';

export type Cam = { x: number; y: number; zoom: number; rot: number };

/** Transformação de câmera com fator de paralaxe (0 = fixo, 1 = acompanha o mundo). */
export const camTransform = (c: Cam, f: number) => {
  const z = Math.pow(c.zoom, f);
  return `translate(540px,960px) rotate(${c.rot * f}deg) scale(${z}) translate(${-c.x * f - 540 * (1 - f)}px,${-c.y * f - 960 * (1 - f)}px)`;
};

// ---------------- fundo cinematográfico ----------------
const R = rng(11);
const BOKEH = Array.from({ length: 26 }, () => ({ x: R() * 1600 - 260, y: R() * 2600 - 340, r: 30 + R() * 110, a: 0.05 + R() * 0.12, s: R() * 6 }));
const DUST = Array.from({ length: 70 }, () => ({ x: R() * 1080, y: R() * 1920, r: 1 + R() * 3, sp: 10 + R() * 40, ph: R() * 6 }));
const SHAPES = Array.from({ length: 9 }, (_, i) => ({
  kind: i % 3, x: [120, 960, 80, 1000, 180, 920, 540, 60, 1020][i], y: [300, 420, 1120, 980, 1650, 1580, 200, 700, 1300][i],
  s: 0.6 + R() * 0.7, sp: 0.3 + R() * 0.6, ph: R() * 6,
}));

export const Background: React.FC<{ t: number; cam: Cam; energy?: number }> = ({ t, cam, energy = 0 }) => (
  <AbsoluteFill style={{ background: 'radial-gradient(120% 80% at 50% 42%, #1d5cff 0%, #0b2fb8 32%, #061a6e 58%, #020a2e 100%)', overflow: 'hidden' }}>
    {/* bokeh distante */}
    <div style={{ position: 'absolute', inset: 0, transform: camTransform(cam, 0.25), transformOrigin: '0 0' }}>
      {BOKEH.map((b, i) => (
        <div key={i} style={{
          position: 'absolute', left: b.x + Math.sin(t * 0.3 + b.s) * 20, top: b.y + Math.cos(t * 0.25 + b.s) * 16,
          width: b.r * 2, height: b.r * 2, borderRadius: '50%', opacity: b.a * (1 + energy * 0.6),
          background: 'radial-gradient(circle, rgba(140,200,255,.9), rgba(80,140,255,0) 70%)',
        }} />
      ))}
    </div>
    {/* feixes de luz girando */}
    <div style={{
      position: 'absolute', left: -900, top: -500, width: 2880, height: 2880, transform: `${camTransform(cam, 0.4)}`, transformOrigin: '0 0',
    }}>
      <div style={{
        position: 'absolute', left: 540 + 900 - 1440, top: 900 + 500 - 1440, width: 2880, height: 2880, transform: `rotate(${t * 6}deg)`,
        background: 'repeating-conic-gradient(from 0deg, rgba(120,190,255,.10) 0deg 7deg, rgba(120,190,255,0) 7deg 30deg)',
        WebkitMaskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,.6) 25%, transparent 60%)',
        opacity: 0.8 + energy * 0.4,
      }} />
    </div>
    {/* elementos 3D flutuantes (paralaxe média) */}
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, transform: camTransform(cam, 0.6), transformOrigin: '0 0', overflow: 'visible' }}>
      <defs>
        <radialGradient id="bg-sphere" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.25" stopColor="#8fd0ff" />
          <stop offset="1" stopColor="#1638c8" />
        </radialGradient>
        <linearGradient id="bg-ring" x1="0" x2="1">
          <stop offset="0" stopColor="#bde6ff" />
          <stop offset="1" stopColor="#2f6bff" />
        </linearGradient>
      </defs>
      {SHAPES.map((s, i) => {
        const y = s.y + Math.sin(t * s.sp + s.ph) * 26, x = s.x + Math.cos(t * s.sp * 0.7 + s.ph) * 14;
        const rot = t * 40 * s.sp + s.ph * 50;
        if (s.kind === 0)
          return <ellipse key={i} cx={x} cy={y} rx={46 * s.s * Math.abs(Math.cos(t * s.sp + s.ph)) + 6} ry={46 * s.s} fill="none" stroke="url(#bg-ring)" strokeWidth={10 * s.s} opacity={0.55} transform={`rotate(${rot * 0.3} ${x} ${y})`} />;
        if (s.kind === 1) return <circle key={i} cx={x} cy={y} r={22 * s.s} fill="url(#bg-sphere)" opacity={0.7} />;
        return (
          <g key={i} transform={`translate(${x},${y}) rotate(${rot}) scale(${s.s})`} opacity={0.6}>
            <path d="M0 -26 L7 -7 L26 0 L7 7 L0 26 L-7 7 L-26 0 L-7 -7 Z" fill="#dff3ff" />
          </g>
        );
      })}
    </svg>
    {/* poeira luminosa */}
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
      {DUST.map((d, i) => (
        <circle key={i} cx={(d.x + Math.sin(t * 0.5 + d.ph) * 30) % 1080} cy={(((d.y - t * d.sp) % 1920) + 1920) % 1920} r={d.r}
          fill="#bfe6ff" opacity={0.25 + 0.35 * Math.sin(t * 2 + d.ph) ** 2} />
      ))}
    </svg>
    {/* vinheta */}
    <AbsoluteFill style={{ background: 'radial-gradient(90% 70% at 50% 45%, transparent 55%, rgba(0,4,30,.65) 100%)' }} />
  </AbsoluteFill>
);

/** Palco/chão do mundo (acompanha a câmera). */
export const Floor: React.FC<{ t: number; x?: number }> = ({ t, x = 540 }) => (
  <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
    <defs>
      <radialGradient id="floor-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="rgba(120,200,255,.55)" />
        <stop offset="1" stopColor="rgba(40,90,255,0)" />
      </radialGradient>
    </defs>
    <ellipse cx={x} cy={1760} rx={560} ry={120} fill="url(#floor-glow)" />
    <ellipse cx={x} cy={1760} rx={360 + Math.sin(t * 2) * 8} ry={60} fill="none" stroke="rgba(160,220,255,.5)" strokeWidth={4} />
    <ellipse cx={x} cy={1760} rx={430 + Math.sin(t * 2 + 1) * 10} ry={76} fill="none" stroke="rgba(160,220,255,.22)" strokeWidth={3} strokeDasharray="18 14" />
  </svg>
);

// ---------------- título 3D ----------------
export const Title3D: React.FC<{ text: string; t: number; start: number; end?: number; y: number; size?: number }> = ({
  text, t, start, end = 1e9, y, size = 200,
}) => {
  const k = prog(t, start, start + 0.55);
  if (k <= 0 || t > end + 0.5) return null;
  const out = prog(t, end, end + 0.45);
  const s = lerp(2.6, 1, E.out(k)) * (k < 1 ? 1 : 1 + 0.05 * bell(t, start + 0.6, 0.12));
  const rx = lerp(60, 12, E.back(k)) + Math.sin(t * 1.4) * 4 - out * 40;
  const ry = Math.sin(t * 0.9) * 10;
  const shine = ((t - start) * 0.7) % 1.6;
  const depth = Array.from({ length: 18 }, (_, i) => `0 ${(i + 1) * 1.6}px 0 hsl(226, 85%, ${34 - i * 1.3}%)`).join(',');
  const common: React.CSSProperties = { fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: size, letterSpacing: -4, lineHeight: 1, whiteSpace: 'nowrap' };
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y - size / 2 - out * 500, display: 'flex', justifyContent: 'center', perspective: 1100, opacity: clamp(k * 3) * (1 - out) }}>
      <div style={{ position: 'relative', transform: `rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`, transformStyle: 'preserve-3d' }}>
        <div style={{ ...common, color: '#3b6dff', textShadow: `${depth}, 0 40px 60px rgba(0,0,40,.6), 0 0 80px rgba(60,180,255,.55)` }}>{text}</div>
        <div style={{
          ...common, position: 'absolute', inset: 0, color: 'transparent',
          backgroundImage: `linear-gradient(100deg, #ffffff 0%, #cfeeff ${(shine - 0.2) * 100}%, #ffffff ${shine * 100}%, #8fd6ff ${(shine + 0.2) * 100}%, #e9f7ff 100%)`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text',
        }}>{text}</div>
      </div>
    </div>
  );
};

// ---------------- cards de tópicos ----------------
const Icon: React.FC<{ i: number }> = ({ i }) => (
  <svg width={70} height={70} viewBox="-35 -35 70 70">
    {i === 0 && <path d="M0 -28 L8 -9 L28 -8 L13 6 L18 27 L0 16 L-18 27 L-13 6 L-28 -8 L-8 -9 Z" fill="#fff" />}
    {i === 1 && (<g><circle r={28} fill="none" stroke="#fff" strokeWidth={6} /><rect x={-4} y={-4} width={8} height={20} rx={4} fill="#fff" /><circle cy={-14} r={5} fill="#fff" /></g>)}
    {i === 2 && (<g fill="none" stroke="#fff" strokeWidth={6}><circle r={28} /><circle r={16} /><circle r={4} fill="#fff" /></g>)}
    {i === 3 && (<g><rect x={-27} y={-22} width={54} height={50} rx={9} fill="none" stroke="#fff" strokeWidth={6} /><rect x={-27} y={-22} width={54} height={14} fill="#fff" /><rect x={-16} y={-32} width={6} height={16} rx={3} fill="#fff" /><rect x={10} y={-32} width={6} height={16} rx={3} fill="#fff" /><rect x={-8} y={2} width={16} height={14} rx={3} fill="#fff" /></g>)}
  </svg>
);

export const TopicCard: React.FC<{ label: string; i: number; t: number; start: number; out: number; x: number; y: number; active: number }> = ({
  label, i, t, start, out, x, y, active,
}) => {
  const k = prog(t, start, start + 0.45);
  if (k <= 0) return null;
  const o = prog(t, out, out + 0.4);
  const s = E.back(k) * (1 + active * 0.07 + 0.03 * bell(t, start + 0.5, 0.1));
  return (
    <div style={{
      position: 'absolute', left: x - 230 + (1 - E.out(k)) * 300 + E.in(o) * 900, top: y - 62, width: 460, height: 124,
      transform: `scale(${s}) rotate(${(1 - k) * 8 - 2 + Math.sin(t * 2 + i) * 1}deg)`, opacity: clamp(k * 2) * (1 - o),
      borderRadius: 34, display: 'flex', alignItems: 'center', gap: 20, paddingLeft: 26, boxSizing: 'border-box',
      background: `linear-gradient(120deg, rgba(120,180,255,${0.32 + active * 0.25}), rgba(30,70,220,.35))`,
      border: `3px solid rgba(200,235,255,${0.5 + active * 0.5})`,
      boxShadow: `0 20px 50px rgba(0,10,60,.45), 0 0 ${30 + active * 50}px rgba(80,190,255,${0.35 + active * 0.4}), inset 0 2px 0 rgba(255,255,255,.4)`,
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ width: 84, height: 84, borderRadius: 24, background: 'linear-gradient(135deg,#4f7dff,#1631c4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(0,0,60,.45)' }}>
        <Icon i={i} />
      </div>
      <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: label.length > 10 ? 46 : 54, color: '#fff', letterSpacing: 1, textShadow: '0 3px 0 rgba(10,30,140,.6)' }}>{label}</div>
    </div>
  );
};

// ---------------- lower third ----------------
export const LowerThird: React.FC<{ t: number; start: number; end: number; title: string; sub: string }> = ({ t, start, end, title, sub }) => {
  const k = prog(t, start, start + 0.5), o = prog(t, end, end + 0.35);
  if (k <= 0 || o >= 1) return null;
  const mask = E.out(k) * (1 - E.in(o));
  return (
    <div style={{ position: 'absolute', left: 70, top: 1440, transform: `translateX(${(1 - E.out(k)) * -120}px)`, clipPath: `inset(0 ${100 - mask * 100}% 0 0 round 30px)` }}>
      <div style={{ background: 'linear-gradient(90deg,#ffffff,#dbeeff)', padding: '14px 34px', borderRadius: '26px 26px 26px 0', fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 64, color: '#1631c4', letterSpacing: 2 }}>{title}</div>
      <div style={{ display: 'inline-block', marginTop: 8, background: 'linear-gradient(90deg,#1f3fe0,#14a0ff)', padding: '10px 26px', borderRadius: 18, fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 34, color: '#fff' }}>{sub}</div>
    </div>
  );
};

// ---------------- partículas / brilhos ----------------
export const Sparkles: React.FC<{ t: number; start: number; x: number; y: number; n?: number; spread?: number; seed?: number }> = ({ t, start, x, y, n = 18, spread = 260, seed = 1 }) => {
  const d = t - start;
  if (d < 0 || d > 1.3) return null;
  const r = rng(seed);
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {Array.from({ length: n }, (_, i) => {
        const a = r() * Math.PI * 2, sp = spread * (0.4 + r() * 0.8), s = 0.5 + r() * 0.9;
        const k = E.out(clamp(d / 1.1));
        const px = x + Math.cos(a) * sp * k, py = y + Math.sin(a) * sp * k + d * d * 60;
        const op = 1 - clamp((d - 0.5) / 0.8);
        return (
          <g key={i} transform={`translate(${px},${py}) rotate(${d * 200 + i * 30}) scale(${s * (1 - k * 0.4)})`} opacity={op}>
            <path d="M0 -22 L5 -5 L22 0 L5 5 L0 22 L-5 5 L-22 0 L-5 -5 Z" fill={i % 3 ? '#ffffff' : '#8fdcff'} />
          </g>
        );
      })}
    </svg>
  );
};

/** Anel de impacto (aterrissagem / batida). */
export const Shockwave: React.FC<{ t: number; start: number; x: number; y: number; flat?: number }> = ({ t, start, x, y, flat = 0.25 }) => {
  const d = (t - start) / 0.6;
  if (d < 0 || d > 1) return null;
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <ellipse cx={x} cy={y} rx={80 + E.out(d) * 520} ry={(80 + E.out(d) * 520) * flat} fill="none" stroke="rgba(200,240,255,.9)" strokeWidth={14 * (1 - d)} />
    </svg>
  );
};

/** Transição: barras diagonais azuis varrendo a tela. */
export const BarWipe: React.FC<{ t: number; start: number; dur?: number }> = ({ t, start, dur = 0.7 }) => {
  const k = (t - start) / dur;
  if (k <= 0 || k >= 1) return null;
  const cols = ['#8fd0ff', '#2f6bff', '#1631c4', '#ffffff'];
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {cols.map((c, i) => {
        const kk = clamp(k * 1.4 - i * 0.1);
        const x = lerp(-1700, 1900, E.inOut(kk));
        return <div key={i} style={{ position: 'absolute', left: x, top: -400, width: 900 - i * 120, height: 2800, background: c, transform: 'rotate(18deg)', opacity: i === 3 ? 0.9 : 1 }} />;
      })}
    </AbsoluteFill>
  );
};

export const Flash: React.FC<{ v: number }> = ({ v }) =>
  v > 0.01 ? <AbsoluteFill style={{ background: `rgba(220,240,255,${v})` }} /> : null;
