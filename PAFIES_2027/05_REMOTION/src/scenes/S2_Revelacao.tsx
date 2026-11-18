// CENA 02 — REVELAÇÃO (6–14s): logo com profundidade, raios, partículas, câmera.
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { C } from '../theme';
import { Bg, Bolt, Camera, Flash, Halftone, KText, Logo, Particles, Seq3D, Sunburst, Highlight, ease } from '../components/fx';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const S2Revelacao: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // logo sobe para o topo quando o "10" 3D entra (Null de controle)
  const lift = interpolate(f, [92, 118], [0, 1], { ...clamp, easing: ease });
  const logoY = interpolate(lift, [0, 1], [900, 560]);
  const logoW = interpolate(lift, [0, 1], [880, 620]);
  const num = spring({ frame: f - 96, fps, config: { damping: 13, stiffness: 120 } });
  // parallax: camadas em profundidades diferentes deslocam em velocidades distintas
  const camY = interpolate(f, [0, 240], [30, -30], { ...clamp, easing: Easing.inOut(Easing.sin) });
  return (
    <AbsoluteFill style={{ background: C.royalDeep, overflow: 'hidden' }}>
      <Camera impacts={[0, 96]} push={[1.12, 1.0]} dur={240}>
        <Bg from={C.royalLight} to={C.royalDeep} at="50% 42%" />
        <div style={{ position: 'absolute', inset: 0, transform: `translateY(${camY * 0.3}px)` }}>
          <Sunburst color="amarelo" opacity={0.16} speed={0.25} y={840} />
        </div>
        <Halftone src="halftone_linear_preto" opacity={0.3} drift={0.2} />
        <Particles mode="burst" count={90} seed="s2burst" start={0} cx={540} cy={880} spread={1.2} />
        <Particles mode="float" count={45} seed="s2float" />
        {/* camada frontal: raios */}
        <div style={{ position: 'absolute', inset: 0, transform: `translateY(${camY * 1.6}px)` }}>
          <Bolt v="a" x={150} y={420} size={260} rot={-18} delay={6} />
          <Bolt v="b" x={930} y={470} size={230} rot={16} delay={10} flip />
          <Bolt v="c" x={110} y={1180} size={200} rot={12} delay={104} />
          <Bolt v="a" x={975} y={1150} size={220} rot={-14} delay={108} flip />
        </div>
        <Logo start={2} y={logoY} width={logoW} />
        {/* "10" 3D (Blender) */}
        {f >= 92 && (
          <div style={{ position: 'absolute', left: 540 - 380, top: 600, width: 760, height: 760, transform: `scale(${num})`, opacity: Math.min(1, num * 2) }}>
            <Seq3D name="num10" frames={120} loop={false} offset={-92} style={{ width: 760, height: 760, filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.45))' }} />
          </div>
        )}
        <KText text="ª" size={150} start={110} mode="drop" x={792} y={915} color={C.yellow} width={200} />
        <KText text="EDIÇÃO" size={150} start={114} mode="up" x={540} y={1280} color={C.yellow} />
        <Highlight x={540} y={1440} w={900} h={118} start={140} color={C.white} rot={-2} />
        <KText text="GINCANA SOLIDÁRIA" size={92} start={146} mode="wide" y={1440} color={C.royal} shadow={null} rot={-2} />
        <KText text="PAFIES 2027" size={150} start={166} mode="slam" y={1600} color={C.white} />
      </Camera>
      <Flash at={1} dur={12} />
      <Flash at={96} dur={7} color={C.yellow} peak={0.5} />
    </AbsoluteFill>
  );
};
