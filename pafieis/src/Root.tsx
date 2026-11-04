import React from 'react';
import { Composition } from 'remotion';
import './lib/fonts';
import { Apresentacao, DURATION } from './episodes/apresentacao';

export const RemotionRoot: React.FC = () => (
  <>
    {/* Série PAFIEIS — cada episódio é uma composição 1080x1920 @ 30fps */}
    <Composition id="Apresentacao" component={Apresentacao} durationInFrames={Math.ceil(DURATION * 30)} fps={30} width={1080} height={1920} />
  </>
);
