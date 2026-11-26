/**
 * PafiesTeaser — V2 (produto principal): 720 f · 30 fps · trilha-v2-narrada.wav (música + narração).
 * Cenas V2 em <Sequence> com cortes SECOS (overlapIn 0) + smear branco de 2 f nos cortes de cor.
 * Horizontal 1920×1080 (PafiesTeaser) e vertical recomposto 1080×1920 (PafiesTeaserVertical).
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CutSmear, SCENES_V2, SCENE_V2, bgAt, type SceneIdV2 } from '../motion';
import type { LayoutMode } from '../layout';
import { SCENE_V2_COMPONENTS } from '../scenes-v2';

export type PafiesTeaserProps = { layout?: LayoutMode };

/** Cortes que ganham o smear branco (2 f). 390 fica limpo: o "10ª" bate sozinho. */
const SMEAR_CUTS = [120, 300, 600];

export const PafiesTeaser: React.FC<PafiesTeaserProps> = ({ layout }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: bgAt(frame) }}>
      {SCENES_V2.map((s) => {
        const Comp = SCENE_V2_COMPONENTS[s.id];
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.durationInFrames} name={`${s.id} · ${s.name}`}>
            <Comp layout={layout} />
          </Sequence>
        );
      })}
      {SMEAR_CUTS.map((c) => (
        <CutSmear key={c} frame={frame} cutFrame={c} smearFrames={2} angle={-18} coverage={0.3} />
      ))}
      <Audio src={staticFile('trilha-v2-narrada.wav')} />
    </AbsoluteFill>
  );
};

/** Cena V2 isolada (pasta "CenasV2"). */
export const SceneV2Standalone: React.FC<{ scene: SceneIdV2; layout?: LayoutMode }> = ({ scene, layout }) => {
  const Comp = SCENE_V2_COMPONENTS[scene];
  const frame = useCurrentFrame() + SCENE_V2[scene].from;
  return (
    <AbsoluteFill style={{ background: bgAt(frame) }}>
      <Comp layout={layout} />
    </AbsoluteFill>
  );
};
