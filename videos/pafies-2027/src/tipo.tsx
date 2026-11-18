// Tipografia cinética + logo PAFIES (vetor original) com extrusão 3D
import React from 'react';
import { Img, staticFile } from 'remotion';
import { AMARELO, BRANCO, CREME, PRETO, clamp, eOut, eOutExpo, hash, lerp, prog, springy } from './lib';

export const FONT = "'Anton', 'Inter Display', sans-serif";
export const FONT2 = "'Inter Display', sans-serif";

// ---------- texto com impacto (slam): escala + blur de movimento + split RGB ----------
export const Slam: React.FC<{
  t: number; t0: number; text: string; x?: number; y: number; size: number; color?: string; from?: number; out?: number; outDur?: number;
  rotX?: number; rot?: number; track?: number; stroke?: string; sticker?: boolean; font?: string; weight?: number;
}> = ({ t, t0, text, x = 540, y, size, color = BRANCO, from = 2.6, out = 99, outDur = 0.35, rotX = 0, rot = 0, track = 2, stroke, sticker, font = FONT, weight = 400 }) => {
  const d = t - t0; if (d < -0.05 || t > out + outDur) return null;
  const p = eOutExpo(clamp(d / 0.42));
  const sc = lerp(from, 1, p) * (1 + 0.04 * Math.exp(-d * 6) * Math.sin(d * 30));
  const blur = (1 - p) * 18;
  const o = clamp(d / 0.08) * (1 - prog(t, out, out + outDur));
  const os = 1 + prog(t, out, out + outDur) * 0.6;
  const split = Math.max(0, 1 - d * 4) * 14;
  const style: React.CSSProperties = {
    position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) perspective(1200px) rotateX(${rotX}deg) rotate(${rot}deg) scale(${sc * os})`,
    fontFamily: font, fontSize: size, lineHeight: 1, letterSpacing: track, color, whiteSpace: 'nowrap', opacity: o, filter: `blur(${blur}px)`,
    fontWeight: weight, textTransform: 'uppercase',
    WebkitTextStroke: sticker ? `${size * 0.09}px ${CREME}` : stroke ? `${size * 0.035}px ${stroke}` : undefined, paintOrder: 'stroke fill',
    textShadow: sticker ? `0 ${size * 0.06}px 0 rgba(0,0,0,.35)` : '0 12px 40px rgba(0,0,0,.45)',
  };
  return (
    <>
      {split > 0.5 && <div style={{ ...style, color: '#FF2D55', WebkitTextStroke: undefined, textShadow: 'none', mixBlendMode: 'screen', opacity: o * 0.7, marginLeft: -split }}>{text}</div>}
      {split > 0.5 && <div style={{ ...style, color: '#2DE1FF', WebkitTextStroke: undefined, textShadow: 'none', mixBlendMode: 'screen', opacity: o * 0.7, marginLeft: split }}>{text}</div>}
      <div style={style}>{text}</div>
    </>
  );
};

// ---------- letras entrando uma a uma em 3D ----------
export const Stagger: React.FC<{ t: number; t0: number; text: string; y: number; size: number; color?: string; out?: number; gap?: number; font?: string; track?: number; mode?: 'flip' | 'rise' | 'zoom' }> =
  ({ t, t0, text, y, size, color = BRANCO, out = 99, gap = 0.035, font = FONT, track = 4, mode = 'flip' }) => {
    if (t < t0 - 0.05 || t > out + 0.4) return null;
    const po = prog(t, out, out + 0.35);
    return (
      <div style={{ position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center', fontFamily: font, fontSize: size, lineHeight: 1, color, perspective: 900, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
        {[...text].map((ch, i) => {
          const d = t - t0 - i * gap; const p = clamp(springy(d, 11, 7)); const pe = eOut(clamp(d / 0.4));
          const tr = mode === 'flip' ? `rotateX(${(1 - pe) * -95}deg) translateY(${(1 - pe) * 40}px)`
            : mode === 'rise' ? `translateY(${(1 - p) * 120}px) rotate(${(1 - pe) * (hash(i) - .5) * 30}deg)`
              : `scale(${lerp(3, 1, pe)})`;
          return <span key={i} style={{ display: 'inline-block', transform: `${tr} translateY(${-po * 60 * (1 + i * 0.05)}px)`, opacity: clamp(d / 0.12) * (1 - po),
            marginRight: track, filter: `blur(${(1 - pe) * 10 + po * 8}px)`, textShadow: '0 10px 30px rgba(0,0,0,.4)', minWidth: ch === ' ' ? size * 0.25 : undefined }}>{ch}</span>;
        })}
      </div>
    );
  };

// ---------- faixa/sticker (papel recortado com sombra, como a ilustração) ----------
export const Faixa: React.FC<{ t: number; t0: number; text: string; y: number; size: number; bg?: string; color?: string; rot?: number; out?: number }> =
  ({ t, t0, text, y, size, bg = AMARELO, color = PRETO, rot = -4, out = 99 }) => {
    const d = t - t0; if (d < 0 || t > out + 0.4) return null;
    const p = springy(d, 12, 6.5); const w = eOut(clamp(d / 0.35));
    const o = 1 - prog(t, out, out + 0.35);
    return (
      <div style={{ position: 'absolute', left: 540, top: y, transform: `translate(-50%,-50%) rotate(${rot + (1 - p) * 12}deg) scale(${lerp(0.2, 1, p)})`, opacity: o }}>
        <div style={{ background: bg, padding: `${size * 0.16}px ${size * 0.42}px`, clipPath: `inset(0 ${(1 - w) * 100}% 0 0)`,
          boxShadow: `0 0 0 ${size * 0.09}px ${CREME}, 10px 14px 0 ${size * 0.09}px rgba(0,0,0,.4)`,
          fontFamily: FONT, fontSize: size, color, lineHeight: 1, whiteSpace: 'nowrap', letterSpacing: 2 }}>{text}</div>
      </div>
    );
  };

// ---------- LOGO PAFIES (vetor fiel ao original) com extrusão 3D + brilho ----------
export const Logo: React.FC<{ t: number; size: number; x: number; y: number; rotY?: number; rotX?: number; scale?: number; o?: number; shine?: number; depth?: number }> =
  ({ t, size, x, y, rotY = 0, rotX = 0, scale = 1, o = 1, shine = -1, depth = 14 }) => (
    <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, perspective: 1400, opacity: o }}>
      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${scale})` }}>
        {/* borda de adesivo (creme) + sombra: separa o círculo azul do fundo azul sem alterar o logo */}
        <div style={{ position: 'absolute', left: size * 0.015, top: size * 0.015, width: size * 0.97, height: size * 0.97, borderRadius: '50%', background: CREME,
          transform: `translateZ(${-depth * 2.2 - 2}px) scale(1.045)`, boxShadow: '14px 22px 0 rgba(0,0,0,.35), 0 40px 80px rgba(0,0,0,.45)' }} />
        {Array.from({ length: depth }, (_, i) => (  // espessura (moeda)
          <Img key={i} src={staticFile('marca/pafies_logo.svg')} style={{ position: 'absolute', inset: 0, width: size, height: size,
            transform: `translateZ(${-(depth - i) * 2.2}px)`, filter: `brightness(${0.25 + (i / depth) * 0.35})` }} />
        ))}
        <Img src={staticFile('marca/pafies_logo.svg')} style={{ position: 'absolute', inset: 0, width: size, height: size, transform: 'translateZ(1px)',
          filter: 'drop-shadow(0 30px 40px rgba(0,0,0,.45))' }} />
        {shine >= 0 && shine <= 1 && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', transform: 'translateZ(2px)', mixBlendMode: 'screen' }}>
            <div style={{ position: 'absolute', top: -size * 0.2, bottom: -size * 0.2, width: size * 0.28, left: lerp(-size * 0.4, size * 1.1, shine),
              transform: 'rotate(20deg)', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)' }} />
          </div>
        )}
      </div>
    </div>
  );
