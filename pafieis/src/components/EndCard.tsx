// Cartão final com a identidade da PAFIES.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { PafiesLogo } from './PafiesLogo';
import { Title3D } from './Graphics';
import { DISPLAY_FONT } from '../lib/fonts';
import { E, clamp, prog } from '../lib/anim';

export const EndCard: React.FC<{ t: number; start: number }> = ({ t, start }) => {
  if (t < start) return null;
  const k = E.back(prog(t, start, start + 0.6));
  const k2 = E.out(prog(t, start + 0.5, start + 0.9));
  const k3 = E.back(prog(t, start + 0.8, start + 1.2));
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <g transform={`translate(560,${220}) scale(${k * 2.1})`} opacity={clamp(k)}>
          <PafiesLogo width={300} color="#ffffff" accent="#8fd0ff" glow={14} />
        </g>
      </svg>
      <Title3D text="PAFIEIS" t={t} start={start + 0.25} y={440} size={150} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 545, textAlign: 'center', opacity: k2, transform: `translateY(${(1 - k2) * 30}px)`,
        fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 44, color: '#dbeeff', letterSpacing: 2 }}>
        O MASCOTE OFICIAL DA PAFIES
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 630, display: 'flex', justifyContent: 'center' }}>
        <div style={{ transform: `scale(${k3})`, opacity: clamp(k3), background: 'linear-gradient(90deg,#ffffff,#cfeaff)', color: '#1631c4',
          fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 52, padding: '16px 46px', borderRadius: 60,
          boxShadow: '0 0 40px rgba(120,200,255,.6), 0 14px 30px rgba(0,0,60,.4)' }}>
          ATÉ A PRÓXIMA!
        </div>
      </div>
    </AbsoluteFill>
  );
};
