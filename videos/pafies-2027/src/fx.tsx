// Efeitos visuais: halftone, raios, relâmpagos, partículas, ondas de choque, grão
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AMARELO, AZUL, AZUL_CLARO, AZUL_ESCURO, BRANCO, H, W, clamp, eOut, hash, lerp, prog } from './lib';

// ---------- halftone (retícula) com máscara radial ----------
export const Halftone: React.FC<{ color?: string; size?: number; opacity?: number; cx?: string; cy?: string; radius?: number; offset?: number }> =
  ({ color = BRANCO, size = 26, opacity = 0.18, cx = '50%', cy = '50%', radius = 70, offset = 0 }) => (
    <AbsoluteFill style={{
      backgroundImage: `radial-gradient(circle, ${color} 32%, transparent 36%)`,
      backgroundSize: `${size}px ${size}px`, backgroundPosition: `${offset}px ${offset * 0.6}px`, opacity,
      WebkitMaskImage: `radial-gradient(circle at ${cx} ${cy}, black 0%, transparent ${radius}%)`,
      maskImage: `radial-gradient(circle at ${cx} ${cy}, black 0%, transparent ${radius}%)`,
    }} />
  );

// ---------- fundo azul royal com sunburst ----------
export const SunburstAzul: React.FC<{ t: number; speed?: number; opacity?: number }> = ({ t, speed = 6, opacity = 1 }) => {
  const rays = 22;
  const parts = Array.from({ length: rays }, (_, i) => `${i % 2 ? 'rgba(4,17,58,.38)' : 'rgba(30,82,217,0)'} ${(i / rays) * 360}deg ${((i + 1) / rays) * 360}deg`).join(',');
  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, ${AZUL_CLARO} 0%, ${AZUL} 45%, ${AZUL_ESCURO} 100%)` }} />
      <div style={{ position: 'absolute', left: W / 2 - 1500, top: H * 0.42 - 1500, width: 3000, height: 3000, borderRadius: '50%',
        background: `conic-gradient(from ${t * speed}deg, ${parts})`, mixBlendMode: 'multiply' }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, rgba(255,255,255,.18) 0%, transparent 40%)` }} />
    </AbsoluteFill>
  );
};

// ---------- relâmpago amarelo (estilo da ilustração do megafone) ----------
const BOLT = 'M0,-14 L118,-58 L74,-6 L210,-30 L96,40 L132,6 L0,14 Z';
export const Bolt: React.FC<{ x: number; y: number; rot: number; s: number; o?: number; color?: string }> = ({ x, y, rot, s, o = 1, color = AMARELO }) => (
  <svg style={{ position: 'absolute', left: x, top: y, overflow: 'visible', opacity: o }} width={1} height={1}>
    <g transform={`rotate(${rot}) scale(${s})`}>
      <path d={BOLT} fill="rgba(0,0,0,.35)" transform="translate(6,8)" />
      <path d={BOLT} fill={color} />
    </g>
  </svg>
);
// explosão de relâmpagos ao redor de um ponto
export const BoltBurst: React.FC<{ t: number; t0: number; x: number; y: number; n?: number; r0?: number; r1?: number; seed?: number; life?: number }> =
  ({ t, t0, x, y, n = 10, r0 = 260, r1 = 520, seed = 1, life = 1.6 }) => {
    const d = t - t0; if (d < 0 || d > life) return null;
    const p = eOut(clamp(d / 0.35)); const fade = 1 - prog(d, life - 0.4, life);
    return (<>{Array.from({ length: n }, (_, i) => {
      const a = (i / n) * 360 + hash(i + seed) * 20; const r = lerp(r0 * 0.6, lerp(r0, r1, hash(i * 3 + seed)), p);
      const rad = (a * Math.PI) / 180; const jitter = Math.sin(d * 40 + i) * 4;
      return <Bolt key={i} x={x + Math.cos(rad) * r} y={y + Math.sin(rad) * r + jitter} rot={a} s={(0.55 + hash(i + 9) * 0.6) * p} o={fade} />;
    })}</>);
  };

// ---------- onda de choque ----------
export const Shock: React.FC<{ t: number; t0: number; x: number; y: number; r?: number; color?: string; w?: number }> = ({ t, t0, x, y, r = 900, color = BRANCO, w = 18 }) => {
  const d = t - t0; if (d < 0 || d > 1) return null;
  const rr = r * eOut(clamp(d / 0.7));
  return <div style={{ position: 'absolute', left: x - rr, top: y - rr, width: rr * 2, height: rr * 2, borderRadius: '50%',
    border: `${Math.max(1, w * (1 - d))}px solid ${color}`, opacity: 1 - d, boxShadow: `0 0 40px ${color}` }} />;
};

// ---------- confete 3D (perspectiva CSS) ----------
export const Confete: React.FC<{ t: number; t0: number; n?: number; seed?: number; cx?: number; cy?: number; dur?: number }> = ({ t, t0, n = 70, seed = 3, cx = W / 2, cy = H * 0.45, dur = 4 }) => {
  const d = t - t0; if (d < 0 || d > dur) return null;
  const cols = [AMARELO, BRANCO, AZUL_CLARO, AMARELO, '#111'];
  return (<div style={{ position: 'absolute', inset: 0, perspective: 900 }}>{Array.from({ length: n }, (_, i) => {
    const a = hash(i + seed) * Math.PI * 2, v = 600 + hash(i * 7 + seed) * 1500;
    const x = cx + Math.cos(a) * v * (1 - Math.exp(-d * 2.2)) / 2.2 + Math.sin(d * 2 + i) * 30;
    const y = cy + Math.sin(a) * v * (1 - Math.exp(-d * 2.2)) / 2.2 + 260 * d * d;
    const w = 14 + hash(i + 4) * 22, h = w * (0.4 + hash(i + 5) * 0.5);
    return <div key={i} style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: cols[i % cols.length],
      transform: `rotateX(${d * 500 * (hash(i) - 0.5) * 2}deg) rotateY(${d * 400 * hash(i + 2)}deg) rotateZ(${i * 37}deg)`,
      opacity: 1 - prog(d, dur - 0.8, dur), borderRadius: i % 3 === 0 ? '50%' : 2 }} />;
  })}</div>);
};

// ---------- partículas flutuantes (poeira/bokeh) com parallax ----------
export const Poeira: React.FC<{ t: number; n?: number; color?: string; seed?: number; o?: number }> = ({ t, n = 40, color = BRANCO, seed = 1, o = 0.5 }) => (
  <AbsoluteFill>{Array.from({ length: n }, (_, i) => {
    const depth = 0.3 + hash(i + seed) * 1.4; const r = 2 + depth * 5;
    const x = (hash(i * 3 + seed) * W + Math.sin(t * 0.5 + i) * 30 * depth) % W;
    const y = ((hash(i * 5 + seed) * H - t * 40 * depth) % H + H) % H;
    return <div key={i} style={{ position: 'absolute', left: x, top: y, width: r * 2, height: r * 2, borderRadius: '50%', background: color,
      opacity: o * (0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + i))), filter: depth > 1.2 ? `blur(${(depth - 1.2) * 8}px)` : undefined }} />;
  })}</AbsoluteFill>
);

// ---------- linhas de velocidade (transição whip) ----------
export const SpeedLines: React.FC<{ p: number; color?: string; seed?: number }> = ({ p, color = BRANCO, seed = 2 }) => {
  if (p <= 0 || p >= 1) return null;
  return (<AbsoluteFill>{Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * 360 + hash(i + seed) * 10; const len = 300 + hash(i) * 700;
    return <div key={i} style={{ position: 'absolute', left: W / 2, top: H / 2, width: len, height: 3 + hash(i + 3) * 5, background: `linear-gradient(90deg, transparent, ${color})`,
      transformOrigin: '0 50%', transform: `rotate(${a}deg) translateX(${lerp(900, 120, p)}px)`, opacity: Math.sin(p * Math.PI) }} />;
  })}</AbsoluteFill>);
};

// ---------- grão + vinheta ----------
export const Acabamento: React.FC<{ t: number; vignette?: number }> = ({ t, vignette = 0.55 }) => (
  <>
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, transparent 45%, rgba(0,0,0,${vignette}) 100%)` }} />
    <AbsoluteFill style={{ opacity: 0.08, mixBlendMode: 'overlay',
      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='${Math.floor(t * 30) % 50}'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>")` }} />
  </>
);
