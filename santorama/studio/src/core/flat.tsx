// Linguagem flat v2: textura de papel suave, etiqueta de local/data e acabamento leve.
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {F} from '../brand/tokens';

export const Paper: React.FC<{o?: number}> = ({o = 0.22}) => (
  <Img src={staticFile('fx/paper.png')} style={{position: 'absolute', width: 1080, height: 1920, mixBlendMode: 'multiply', opacity: o, pointerEvents: 'none'}} />
);

/** Acabamento: papel + granulação discreta + vinheta suave (bem mais leve que na v1). */
export const FlatFinish: React.FC<{vignette?: number}> = ({vignette = 0.35}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Img src={staticFile('fx/paper.png')} style={{position: 'absolute', width: 1080, height: 1920, mixBlendMode: 'overlay', opacity: 0.28}} />
      <Img src={staticFile(`fx/grain${Math.floor(frame / 3) % 6}.png`)} style={{position: 'absolute', width: 1080, height: 1920, mixBlendMode: 'overlay', opacity: 0.05}} />
      <AbsoluteFill style={{background: `radial-gradient(ellipse 80% 70% at 50% 50%, transparent 55%, rgba(20,12,8,${vignette}) 100%)`}} />
    </AbsoluteFill>
  );
};

/** Etiqueta de local e data no canto superior direito (ex.: "AUSCHWITZ · 1941"). */
export const PlaceTag: React.FC<{text: string; o?: number}> = ({text, o = 1}) => (
  <div style={{position: 'absolute', top: 236, right: 56, opacity: o, fontFamily: F.titulo, fontWeight: 600, fontSize: 26, letterSpacing: 4,
    color: '#EFE3C8', background: 'rgba(20,14,10,0.78)', border: '1.5px solid rgba(239,227,200,0.35)', borderRadius: 8, padding: '8px 16px'}}>{text}</div>
);
