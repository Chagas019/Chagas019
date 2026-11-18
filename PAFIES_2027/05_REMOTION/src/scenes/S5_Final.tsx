// CENA 05 — FINALIZAÇÃO (32–40s): logo centralizado, azul royal, raios, partículas, impacto.
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from '../theme';
import { Bg, Bolt, Camera, Flash, Halftone, Highlight, KText, Logo, Particles, Sunburst } from '../components/fx';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const S5Final: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const finalHit = spring({ frame: f - 180, fps, config: { damping: 8, stiffness: 200 } });
  const pop = f >= 180 ? 1 + 0.08 * (1 - finalHit) * Math.sign(1) : 1;
  const ringS = interpolate(f, [180, 215], [0.2, 2.6], clamp);
  const ringO = interpolate(f, [180, 215], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: C.royal, overflow: 'hidden' }}>
      <Camera impacts={[0, 180]} push={[1.1, 1.0]} dur={240}>
        <Bg from={C.royalLight} to={C.royalDeep} at="50% 45%" />
        <Sunburst color="amarelo" opacity={0.2} speed={0.35} y={860} />
        <Halftone src="halftone_linear_preto" opacity={0.28} />
        <Particles mode="burst" count={110} seed="s5" start={0} cx={540} cy={860} spread={1.4} />
        <Particles mode="burst" count={120} seed="s5b" start={180} cx={540} cy={860} spread={1.6} color={C.white} />
        <Particles mode="float" count={50} seed="s5f" />
        <Bolt v="a" x={130} y={820} size={300} rot={-16} delay={8} />
        <Bolt v="b" x={950} y={880} size={300} rot={14} delay={12} flip />
        <Bolt v="c" x={120} y={1760} size={200} rot={20} delay={16} />
        <Bolt v="a" x={960} y={1770} size={210} rot={-18} delay={20} flip />
        <div style={{ position: 'absolute', left: 540 - 400, top: 860 - 400, width: 800, height: 800, borderRadius: '50%', border: `16px solid ${C.yellow}`, transform: `scale(${ringS})`, opacity: f >= 180 ? ringO : 0 }} />
        <AbsoluteFill style={{ transform: `scale(${pop})` }}>
          <KText text="ESTÃO PREPARADOS?" size={118} start={4} mode="up" y={430} color={C.white} />
          <Logo start={0} y={880} width={680} depth={18} />
          <KText text="PAFIES 2027" size={185} start={60} mode="slam" y={1355} color={C.yellow} stagger={1.6} />
          <Highlight x={540} y={1550} w={980} h={130} start={120} color={C.white} rot={-2} />
          <KText text="VAMOS FAZER HISTÓRIA!" size={104} start={124} mode="wide" y={1550} color={C.royal} shadow={null} rot={-2} />
          <KText text="10ª EDIÇÃO  ·  UMA SÓ MISSÃO: FAZER A DIFERENÇA" size={40} start={150} mode="blur" y={1675} color={C.white} shadow={null} stagger={0.3} tracking={0.06} />
        </AbsoluteFill>
      </Camera>
      <Flash at={1} dur={14} />
      <Flash at={180} dur={10} color={C.yellow} peak={0.7} />
    </AbsoluteFill>
  );
};
