// CENA 03 — SOLIDARIEDADE (14–24s): objetos 3D flutuando, alimentos, composição cinematográfica.
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { C } from '../theme';
import { Bg, Camera, Halftone, Highlight, KText, Marquee, Particles, Seq3D, Sunburst, ease } from '../components/fx';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// órbita de alimentos: profundidade (z) controla escala, desfoque (DOF) e velocidade (parallax)
const ITEMS = [
  { n: 'apple', x: 200, y: 520, z: 0.9, d: 0 },
  { n: 'can', x: 880, y: 640, z: 1.0, d: 6 },
  { n: 'rice', x: 170, y: 1260, z: 1.15, d: 10 },
  { n: 'milk', x: 900, y: 1330, z: 0.95, d: 14 },
  { n: 'heart', x: 540, y: 330, z: 0.55, d: 18 },
  { n: 'apple', x: 980, y: 1000, z: 0.45, d: 22 },
  { n: 'can', x: 90, y: 900, z: 0.4, d: 26 },
];

const WORDS = ['DESAFIOS', 'UNIÃO', 'CRIATIVIDADE', 'DIVERSÃO', 'SOLIDARIEDADE'];

export const S3Solidariedade: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phoneIn = spring({ frame: f - 4, fps, config: { damping: 15, stiffness: 70 } });
  const phoneOut = interpolate(f, [196, 216], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const heartBig = spring({ frame: f - 205, fps, config: { damping: 11, stiffness: 90 } });
  return (
    <AbsoluteFill style={{ background: C.royalDeep, overflow: 'hidden' }}>
      <Camera impacts={[0, 210]} push={[1.0, 1.08]} dur={300}>
        <Bg from="#2E58E6" to={C.royalDeep} at="50% 50%" />
        <Sunburst color="azul" opacity={0.35} speed={-0.12} y={960} />
        <Halftone src="halftone_diagonal_amarelo" opacity={0.12} style={{ width: 1920, height: 1920, left: -420 }} />
        <Particles mode="rise" count={50} seed="s3" color={C.yellow} />
        {/* alimentos 3D flutuando com parallax e profundidade de campo */}
        {ITEMS.map((it, i) => {
          const s = spring({ frame: f - it.d, fps, config: { damping: 14, stiffness: 80 } });
          const size = 360 * it.z;
          const fx = Math.sin((f + i * 40) / (50 / it.z)) * 26 * it.z;
          const fy = Math.cos((f + i * 30) / (40 / it.z)) * 34 * it.z - f * 0.35 * it.z;
          const blur = it.z < 0.6 ? (0.6 - it.z) * 18 : it.z > 1.1 ? 3 : 0;
          return <div key={i} style={{
            position: 'absolute', left: it.x - size / 2 + fx, top: it.y - size / 2 + fy, width: size, height: size,
            transform: `scale(${s})`, filter: `blur(${blur}px) drop-shadow(0 ${24 * it.z}px ${30 * it.z}px rgba(0,0,0,0.45))`, opacity: it.z < 0.6 ? 0.8 : 1,
            zIndex: Math.round(it.z * 10),
          }}>
            <Seq3D name={it.n} frames={72} offset={i * 11} speed={0.8} style={{ width: size, height: size }} />
          </div>;
        })}
        {/* celular 3D (Blender) */}
        <div style={{
          position: 'absolute', left: 540 - 330, top: 520, width: 660, height: 880, zIndex: 9,
          transform: `translateY(${(1 - phoneIn) * 900 + phoneOut * -120}px) scale(${1 - phoneOut * 0.4})`, opacity: 1 - phoneOut,
          filter: 'drop-shadow(0 40px 60px rgba(0,0,0,0.55))',
        }}>
          <Seq3D name="phone" frames={150} loop={false} style={{ width: 660, height: 880 }} />
        </div>
        {/* palavras-chave no ritmo da narração (1 a cada ~22 frames) */}
        {WORDS.map((w, i) => {
          const st = 18 + i * 22;
          if (f < st || f > st + 24) return null;
          return <div key={w} style={{ zIndex: 20, position: 'absolute', inset: 0 }}>
            <KText text={w} size={i === 4 ? 140 : 160} start={st} mode="slam" y={1500} color={i % 2 ? C.white : C.yellow} stagger={0.8} />
          </div>;
        })}
        <div style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
          <KText text="MUITO MAIS QUE" size={110} start={130} mode="up" y={1420} color={C.white} exit={200} />
          <KText text="UMA COMPETIÇÃO." size={130} start={140} mode="up" y={1550} color={C.white} exit={200} />
          {f >= 205 && (
            <div style={{ position: 'absolute', left: 540 - 300, top: 560, width: 600, height: 600, transform: `scale(${heartBig}) rotate(${Math.sin(f / 15) * 4}deg)`, filter: 'drop-shadow(0 0 60px rgba(255,208,0,0.6))' }}>
              <Seq3D name="heart" frames={72} speed={0.6} style={{ width: 600, height: 600 }} />
            </div>
          )}
          <KText text="UMA MISSÃO DE" size={110} start={212} mode="up" y={1300} color={C.white} />
          <Highlight x={540} y={1460} w={1000} h={170} start={222} rot={-3} />
          <KText text="SOLIDARIEDADE." size={150} start={226} mode="slam" y={1460} color={C.black} shadow={null} rot={-3} stagger={1.2} />
        </div>
        <div style={{ position: 'absolute', inset: 0, zIndex: 15, opacity: interpolate(f, [120, 135], [0, 1], clamp) }}>
          <Marquee words={['DESAFIOS', 'UNIÃO', 'CRIATIVIDADE', 'DIVERSÃO', 'SOLIDARIEDADE']} y={1720} rot={-5} size={58} />
        </div>
      </Camera>
    </AbsoluteFill>
  );
};
