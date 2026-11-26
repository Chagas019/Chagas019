/** Cena isolada + camada global (para as composições da pasta "Cenas"). */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { SCENE, type SceneId } from '../timeline';
import type { LayoutMode } from '../layout';
import { FilmOverlay } from './FilmOverlay';
import { SCENE_COMPONENTS } from '../scenes';

export type SceneStandaloneProps = { scene: SceneId; layout?: LayoutMode };

export const SceneStandalone: React.FC<SceneStandaloneProps> = ({ scene, layout }) => {
  const frame = useCurrentFrame() + SCENE[scene].from;
  const Comp = SCENE_COMPONENTS[scene];
  return (
    <AbsoluteFill style={{ background: '#060F2E' }}>
      <Comp layout={layout} />
      <FilmOverlay frame={frame} />
    </AbsoluteFill>
  );
};
