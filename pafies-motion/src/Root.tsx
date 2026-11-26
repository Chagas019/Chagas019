/**
 * Root — composições do projeto.
 *  V2 (produto principal): PafiesTeaser (1920×1080) · PafiesTeaserVertical (1080×1920) · CenasV2/*
 *  V1 (reprovada, mantida): V1/PafiesMain · V1/PafiesVertical · V1/Cenas/* · Design/*
 */
import React from 'react';
import { Composition, Folder } from 'remotion';
import { DURATION, FPS, SCENES } from './timeline';
import { PafiesFilme } from './compositions/PafiesFilme';
import { SceneStandalone } from './compositions/SceneStandalone';
import { SCENE_COMPOSITION_IDS } from './scenes';
import { DesignBoard } from './design/Preview';
import { DesignBoardV2 } from './design/v2/DesignBoardV2';
import { DURATION_V2, FPS_V2, SCENES_V2 } from './timeline-v2';
import { PafiesTeaser, SceneV2Standalone } from './compositions/PafiesTeaser';
import { SCENE_V2_COMPOSITION_IDS } from './scenes-v2';

const H = { width: 1920, height: 1080 } as const;
const V = { width: 1080, height: 1920 } as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="PafiesTeaser" component={PafiesTeaser} defaultProps={{ layout: 'h' as const }} durationInFrames={DURATION_V2} fps={FPS_V2} {...H} />
    <Composition id="PafiesTeaserVertical" component={PafiesTeaser} defaultProps={{ layout: 'v' as const }} durationInFrames={DURATION_V2} fps={FPS_V2} {...V} />
    <Folder name="CenasV2">
      {SCENES_V2.map((s) => (
        <React.Fragment key={s.id}>
          <Composition
            id={SCENE_V2_COMPOSITION_IDS[s.id]}
            component={SceneV2Standalone}
            defaultProps={{ scene: s.id, layout: 'h' as const }}
            durationInFrames={s.durationInFrames}
            fps={FPS_V2}
            {...H}
          />
          <Composition
            id={`${SCENE_V2_COMPOSITION_IDS[s.id]}-V`}
            component={SceneV2Standalone}
            defaultProps={{ scene: s.id, layout: 'v' as const }}
            durationInFrames={s.durationInFrames}
            fps={FPS_V2}
            {...V}
          />
        </React.Fragment>
      ))}
    </Folder>
    <Folder name="V1">
    <Composition id="PafiesMain" component={PafiesFilme} defaultProps={{ layout: 'h' as const }} durationInFrames={DURATION} fps={FPS} {...H} />
    <Composition id="PafiesVertical" component={PafiesFilme} defaultProps={{ layout: 'v' as const }} durationInFrames={DURATION} fps={FPS} {...V} />
    <Folder name="Cenas">
      {SCENES.map((s) => (
        <React.Fragment key={s.id}>
          <Composition
            id={SCENE_COMPOSITION_IDS[s.id]}
            component={SceneStandalone}
            defaultProps={{ scene: s.id, layout: 'h' as const }}
            durationInFrames={s.durationInFrames}
            fps={FPS}
            {...H}
          />
          <Composition
            id={`${SCENE_COMPOSITION_IDS[s.id]}-V`}
            component={SceneStandalone}
            defaultProps={{ scene: s.id, layout: 'v' as const }}
            durationInFrames={s.durationInFrames}
            fps={FPS}
            {...V}
          />
        </React.Fragment>
      ))}
    </Folder>
    </Folder>
    <Folder name="Design">
      <Composition id="DesignBoard" component={DesignBoard} durationInFrames={1} fps={FPS} {...H} />
      <Composition id="DesignBoardV2" component={DesignBoardV2} durationInFrames={1} fps={FPS} width={2400} height={2400} />
    </Folder>
  </>
);
