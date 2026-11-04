// PAFIEIS — animação do personagem ORIGINAL (imagem de referência, sem redesenho).
// Camadas: placa (corpo + fundo original) e cabeça recortada, com pálpebras e boca
// animadas por cima, nos mesmos pixels da imagem.
import React from 'react';
import { Img, staticFile } from 'remotion';
import rig from './puppet.json';
import { Pose } from './rig';

const Lid: React.FC<{ e: (typeof rig.eyes)[number]; blink: number; id: string }> = ({ e, blink, id }) => {
  if (blink < 0.02) return null;
  const k = Math.min(1, blink);
  const rx = e.w / 2 + 2, ry = e.h / 2 + 2;
  const top = e.cy - ry - 2;
  const edge = top + (ry * 2 + 4) * k; // borda da pálpebra
  const sag = 8 + k * 6; // curvatura da borda
  return (
    <g transform={`rotate(${e.tilt} ${e.cx} ${e.cy})`}>
      <defs>
        <clipPath id={id}>
          <ellipse cx={e.cx} cy={e.cy} rx={rx} ry={ry} />
        </clipPath>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={e.lid} />
          <stop offset="1" stopColor={e.lid2} />
        </linearGradient>
        <filter id={`${id}-f`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>
      <g clipPath={`url(#${id})`}>
        <path d={`M${e.cx - rx - 4} ${top - 4} L${e.cx + rx + 4} ${top - 4} L${e.cx + rx + 4} ${edge - sag} Q${e.cx} ${edge + sag} ${e.cx - rx - 4} ${edge - sag} Z`}
          fill={`url(#${id}-g)`} filter={`url(#${id}-f)`} />
        {/* sombra suave sob a borda */}
        <path d={`M${e.cx - rx} ${edge - sag + 2} Q${e.cx} ${edge + sag + 2} ${e.cx + rx} ${edge - sag + 2}`} stroke="rgba(60,20,10,.35)" strokeWidth={6} fill="none" filter={`url(#${id}-f)`} />
      </g>
      {k > 0.25 && (
        <path d={`M${e.cx - rx + 2} ${Math.min(edge, e.cy + ry) - sag + 2} Q${e.cx} ${Math.min(edge, e.cy + ry) + sag} ${e.cx + rx - 2} ${Math.min(edge, e.cy + ry) - sag + 2}`}
          stroke="#2a130d" strokeWidth={4.5} fill="none" strokeLinecap="round" opacity={Math.min(1, (k - 0.25) * 3)} />
      )}
    </g>
  );
};

const Mouth: React.FC<{ open: number; wide: number; round: number }> = ({ open, wide, round }) => {
  const m = rig.mouth;
  const h = open * 30 + round * 4;
  if (h < 2.5) return null;
  const rx = (m.w / 2) * (0.5 + 0.35 * wide - 0.12 * round);
  const cy = m.cy + h / 2 - 1;
  return (
    <g>
      <ellipse cx={m.cx} cy={cy} rx={rx} ry={h / 2} fill="#3f0f12" />
      <clipPath id="pp-mouth">
        <ellipse cx={m.cx} cy={cy} rx={rx} ry={h / 2} />
      </clipPath>
      <g clipPath="url(#pp-mouth)">
        <rect x={m.cx - rx} y={m.cy - 4} width={rx * 2} height={Math.min(7, h * 0.3) + 4} fill="#f4ece8" />
        <ellipse cx={m.cx} cy={cy + h * 0.42} rx={rx * 0.7} ry={h * 0.32} fill="#d9606c" />
      </g>
      <ellipse cx={m.cx} cy={cy} rx={rx} ry={h / 2} fill="none" stroke="#b5655a" strokeWidth={2.5} />
    </g>
  );
};

/** Personagem original animado. Coordenadas no espaço 1080x1920 da imagem. */
export const PhotoPuppet: React.FC<{ pose: Pose }> = ({ pose: p }) => {
  const [px, py] = rig.pivot;
  // respiração/squash a partir da base da imagem; inclinação a partir dos pés
  const body = `translate(${p.x - 540}px, ${p.y - 1750}px) translate(540px,1920px) rotate(${p.lean * 0.4}deg) scale(${1 / Math.sqrt(p.squash)}, ${p.squash}) scale(${p.scale}) translate(-540px,-1920px)`;
  const head = `translate(${p.headTurn * 8}px, ${p.headNod}px) rotate(${p.headTilt}deg)`;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transform: body, transformOrigin: '0 0' }}>
      <Img src={staticFile('puppet/plate.png')} style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920 }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transform: head, transformOrigin: `${px}px ${py}px` }}>
        <Img src={staticFile('puppet/head.png')} style={{ position: 'absolute', left: 0, top: 0, width: 1080, height: 1920 }} />
        <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Lid e={rig.eyes[0]} blink={p.blinkL} id="pp-l" />
          <Lid e={rig.eyes[1]} blink={p.blinkR} id="pp-r" />
          <Mouth open={p.mouthOpen} wide={p.mouthWide} round={p.mouthRound} />
        </svg>
      </div>
    </div>
  );
};
