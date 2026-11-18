import React from 'react';
import { Composition, continueRender, delayRender, staticFile } from 'remotion';
import { PAFIES2027 } from './Video';

// carrega as fontes antes de renderizar (rótulos 3D usam canvas)
const fonts: [string, string][] = [['Anton', 'fonts/Anton-Regular.ttf'], ['Inter Display', 'fonts/InterDisplay-Black.otf']];
if (typeof document !== 'undefined') {
  const h = delayRender('fontes');
  Promise.all(fonts.map(([fam, file]) => new FontFace(fam, `url(${staticFile(file)})`).load().then(ff => document.fonts.add(ff))))
    .then(() => continueRender(h)).catch(() => continueRender(h));
}

export const RemotionRoot: React.FC = () => (
  <Composition id="PAFIES2027" component={PAFIES2027} durationInFrames={1200} fps={30} width={1080} height={1920} />
);
