// CENA 01 — ABERTURA (0–6s): tela escura, batimentos, luz azul surgindo.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from 'remotion';
import { C, HEARTBEATS } from '../theme';
import { Camera, Halftone, KText, Particles, Flash } from '../components/fx';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const S1Abertura: React.FC = () => {
  const f = useCurrentFrame();
  // pulso de luz a cada batimento
  let pulse = 0;
  for (const hb of HEARTBEATS) {
    const d = f - hb;
    if (d >= 0) pulse = Math.max(pulse, Math.exp(-d / 6) + 0.6 * Math.exp(-Math.max(0, d - 5) / 6) * (d >= 5 ? 1 : 0));
  }
  const rise = interpolate(f, [0, 170], [0.05, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const glow = 0.25 + rise * 0.55 + pulse * 0.35;
  const ring = (hb: number) => {
    const d = f - hb;
    if (d < 0 || d > 30) return null;
    const s = 0.4 + d / 18;
    return <div key={hb} style={{
      position: 'absolute', left: 540 - 300, top: 1050 - 300, width: 600, height: 600, borderRadius: '50%',
      border: `6px solid ${C.royalLight}`, transform: `scale(${s})`, opacity: (1 - d / 30) * 0.6,
      boxShadow: `0 0 40px ${C.royal}`,
    }} />;
  };
  // sucção final (antes do impacto da cena 2)
  const suck = interpolate(f, [150, 180], [1, 0.0], { ...clamp, easing: Easing.in(Easing.cubic) });
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <Camera push={[1.0, 1.18]} dur={180}>
        <AbsoluteFill style={{
          background: `radial-gradient(circle at 50% 56%, rgba(58,99,240,${glow}) 0%, rgba(30,64,200,${glow * 0.45}) 28%, rgba(10,26,92,${glow * 0.25}) 50%, transparent 72%)`,
        }} />
        <Halftone src="halftone_radial_preto" opacity={0.55} />
        {HEARTBEATS.map(ring)}
        <Particles mode="float" count={40} seed="s1" color={C.royalLight} />
        <AbsoluteFill style={{ transform: `scale(${0.2 + 0.8 * suck})`, opacity: suck }}>
          <KText text="EI, GALERA…" size={120} start={33} mode="blur" y={820} color={C.white} stagger={1.2} exit={88} />
          <KText text="ESTÃO" size={240} start={93} mode="slam" y={1000} color={C.yellow} stagger={2} />
          <KText text="PREPARADOS?" size={165} start={103} mode="slam" y={1210} color={C.yellow} stagger={1.5} />
        </AbsoluteFill>
      </Camera>
      <Flash at={93} dur={6} color={C.royalLight} peak={0.35} />
    </AbsoluteFill>
  );
};
