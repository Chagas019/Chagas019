// CENA 04 — EXPECTATIVA (24–32s): textos gigantes, cortes no tempo da música, contagem 3-2-1.
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, BEAT } from '../theme';
import { Bolt, Camera, Flash, Halftone, KText, Megaphone, Particles, Sunburst } from '../components/fx';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// "galera": silhuetas vetoriais (shape layers) que entram em sequência
const Crowd: React.FC<{ start: number }> = ({ start }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', left: 0, top: 1120, width: 1080, height: 600 }}>
      {new Array(9).fill(0).map((_, i) => {
        const row = i < 5 ? 0 : 1;
        const col = row === 0 ? i : i - 5;
        const x = row === 0 ? 70 + col * 235 : 190 + col * 235;
        const y = row === 0 ? 220 : 60;
        const s = spring({ frame: f - start - i * 2, fps, config: { damping: 10, stiffness: 180 } });
        const jump = Math.abs(Math.sin((f - start + i * 4) / 7.5 * Math.PI / 2)) * 26;
        const col1 = (i + row) % 3 === 0 ? C.yellow : row ? C.royalLight : C.white;
        return (
          <div key={i} style={{ position: 'absolute', left: x - 90, top: y - jump, width: 180, height: 300, transform: `scale(${s})`, transformOrigin: 'bottom center', zIndex: row ? 0 : 2 }}>
            <div style={{ position: 'absolute', left: 50, top: 0, width: 80, height: 80, borderRadius: 40, background: col1, border: `8px solid ${C.black}` }} />
            <div style={{ position: 'absolute', left: 10, top: 90, width: 160, height: 220, borderRadius: '80px 80px 10px 10px', background: col1, border: `8px solid ${C.black}` }} />
            <div style={{ position: 'absolute', left: -14, top: 60, width: 40, height: 120, borderRadius: 20, background: col1, border: `8px solid ${C.black}`, transform: `rotate(${-25 - jump}deg)`, transformOrigin: 'bottom center' }} />
          </div>
        );
      })}
    </div>
  );
};

const BigNum: React.FC<{ n: string; start: number; bg: string; color: string }> = ({ n, start, bg, color }) => {
  const f = useCurrentFrame() - start;
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 9, stiffness: 260, mass: 0.5 } });
  return (
    <AbsoluteFill style={{ background: bg, justifyContent: 'center', alignItems: 'center' }}>
      <Sunburst color={bg === C.yellow ? 'azul' : 'amarelo'} opacity={0.25} speed={2} />
      <div style={{ fontFamily: FONT, fontSize: 1100, lineHeight: 1, color, transform: `scale(${interpolate(s, [0, 1], [3, 1])}) rotate(${(1 - s) * -12}deg)`, textShadow: `30px 34px 0 ${C.black}`, filter: `blur(${Math.max(0, (1 - s) * 16)}px)` }}>{n}</div>
    </AbsoluteFill>
  );
};

export const S4Expectativa: React.FC = () => {
  const f = useCurrentFrame();
  // micro-zoom em cada batida (sincronizado com o kick)
  const beatPunch = 1 + 0.035 * Math.exp(-(f % BEAT) / 4);
  const cut = f < 60 ? 0 : f < 120 ? 1 : f < 180 ? 2 : 3;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: C.black }}>
      {cut === 0 && (
        <Camera impacts={[0]} push={[1.0, 1.06]} dur={60}>
          <AbsoluteFill style={{ background: C.yellow, transform: `scale(${beatPunch})` }}>
            <Halftone src="halftone_linear_preto" opacity={0.35} drift={-1} />
            <Bolt v="b" x={150} y={330} size={260} rot={-12} delay={2} />
            <Bolt v="c" x={930} y={1560} size={260} rot={10} delay={6} flip />
            <KText text="PREPARE" size={280} start={0} mode="slam" y={800} color={C.black} shadow={C.royal} stagger={1.2} />
            <KText text="SUA EQUIPE!" size={190} start={8} mode="slam" y={1060} color={C.royal} shadow={C.black} stagger={1.2} />
          </AbsoluteFill>
        </Camera>
      )}
      {cut === 1 && (
        <Camera impacts={[60]} push={[1.06, 1.0]} dur={60}>
          <AbsoluteFill style={{ background: C.royal, transform: `scale(${beatPunch})` }}>
            <Sunburst color="azul" opacity={0.7} speed={0.6} y={700} />
            <Particles mode="burst" count={50} seed="s4b" start={60} cx={540} cy={700} />
            <KText text="REÚNA" size={240} start={60} mode="drop" y={520} color={C.white} stagger={1.5} />
            <KText text="A GALERA!" size={190} start={66} mode="drop" y={790} color={C.yellow} stagger={1.5} />
            <Crowd start={68} />
          </AbsoluteFill>
        </Camera>
      )}
      {cut === 2 && (
        <Camera impacts={[120]} push={[1.0, 1.1]} dur={60}>
          <AbsoluteFill style={{ background: C.black, transform: `scale(${beatPunch})` }}>
            <Sunburst color="amarelo" opacity={0.22} speed={1.2} />
            <Halftone src="halftone_radial_preto" opacity={0.9} />
            <Bolt v="a" x={160} y={1480} size={300} rot={-8} delay={124} />
            <Bolt v="b" x={920} y={420} size={260} rot={14} delay={126} flip />
            <Megaphone start={130} x={560} y={1430} width={600} rot={-10} />
            <KText text="ESSA EDIÇÃO" size={170} start={120} mode="wide" y={760} color={C.white} />
            <KText text="PROMETE!" size={260} start={128} mode="slam" y={1030} color={C.yellow} shadow={C.royal} stagger={1.4} />
          </AbsoluteFill>
        </Camera>
      )}
      {cut === 3 && (
        <AbsoluteFill>
          {f < 195 && <BigNum n="3" start={180} bg={C.royal} color={C.yellow} />}
          {f >= 195 && f < 210 && <BigNum n="2" start={195} bg={C.yellow} color={C.royal} />}
          {f >= 210 && <BigNum n="1" start={210} bg={C.black} color={C.yellow} />}
          <KText text="A CONTAGEM REGRESSIVA COMEÇOU!" size={62} start={180} mode="wide" y={330} color={C.white} />
          {f >= 225 && <AbsoluteFill style={{ background: `radial-gradient(circle, rgba(255,255,255,${interpolate(f, [225, 240], [0, 0.9], clamp)}) 0%, transparent 70%)` }} />}
        </AbsoluteFill>
      )}
      <Flash at={60} dur={4} peak={0.6} />
      <Flash at={120} dur={4} peak={0.6} />
      <Flash at={180} dur={4} peak={0.8} />
    </AbsoluteFill>
  );
};
