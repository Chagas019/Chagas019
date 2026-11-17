// Composições de preview dos personagens (Caminhante, Cruz3D, Cruz2D). Dono: agente PERSONAGENS.
import React from 'react';
import {AbsoluteFill, Composition, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {Caminhante, naEstrada} from '../../src/personagens/Caminhante';
import {Cruz3D} from '../../src/personagens/Cruz3D';
import {Cruz2D} from '../../src/personagens/Cruz2D';

const Estrada: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();
  const fugaX = width * 0.5;
  const fugaY = height * 0.52;
  const p = naEstrada({
    progresso: interpolate(frame, [0, durationInFrames], [0, 0.9]),
    pertoX: width * 0.52,
    pertoY: height * 0.86,
    alturaPerto: height * 0.36,
    fugaX,
    fugaY,
  });
  return (
    <AbsoluteFill style={{background: 'linear-gradient(180deg,#0B1628 0%,#2A1A0C 50%,#050608 52%,#071020 100%)'}}>
      <div style={{position: 'absolute', left: fugaX - 300, top: fugaY - 300, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,#FFB24A88 0%,#FFB24A00 65%)'}} />
      <svg width={width} height={height} style={{position: 'absolute'}}>
        <polygon points={`${fugaX - 6},${fugaY} ${fugaX + 6},${fugaY} ${width * 0.95},${height} ${width * 0.05},${height}`} fill="#121A26" />
      </svg>
      <Caminhante {...p} entradaEm={0} duracaoEntrada={20} cansaco={0.7} ciclo={70} vista={18} anguloLuz={0} sombraInclinacao={0} sombraComprimento={1.1} />
    </AbsoluteFill>
  );
};

const Lado: React.FC = () => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: '#16202E'}}>
      {[0, 30, 60, 90].map((v, i) => (
        <Caminhante key={v} x={width * (0.14 + i * 0.24)} y={height * 0.6} altura={height * 0.4} vista={v} cansaco={0.6} anguloLuz={40} sombraComprimento={0.8} sombraInclinacao={-0.4} />
      ))}
    </AbsoluteFill>
  );
};

const Cruz3DPrev: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: 'radial-gradient(80% 60% at 50% 40%,#3A2A14 0%,#0A0705 70%)', alignItems: 'center', justifyContent: 'center'}}>
      <Cruz3D largura={width} altura={height} material="pedra" luz={interpolate(frame, [0, 150], [0.1, 1.2], {extrapolateRight: 'clamp'})} entradaEm={0} duracaoEntrada={30} />
    </AbsoluteFill>
  );
};

const Cruz2DPrev: React.FC = () => {
  const frame = useCurrentFrame();
  const {height} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: '#0A0705'}}>
      <Cruz2D altura={height * 0.42} luz={interpolate(frame, [0, 150], [0.1, 1.2], {extrapolateRight: 'clamp'})} entradaEm={0} duracaoEntrada={30} />
    </AbsoluteFill>
  );
};

const v = {width: 1080, height: 1920, fps: 60};
export const RootPreview: React.FC = () => (
  <>
    <Composition id="Prev-Caminhante" component={Estrada} durationInFrames={600} {...v} />
    <Composition id="Prev-Caminhante-Vistas" component={Lado} durationInFrames={120} fps={60} width={1920} height={1080} />
    <Composition id="Prev-Cruz3D" component={Cruz3DPrev} durationInFrames={240} {...v} />
    <Composition id="Prev-Cruz2D" component={Cruz2DPrev} durationInFrames={240} {...v} />
  </>
);
