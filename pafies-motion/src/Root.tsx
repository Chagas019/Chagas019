/**
 * Root — composições do projeto.
 *  PafiesMain (1920×1080) · PafiesVertical (1080×1920) · Cenas/* (cada cena isolada, H e V) · Design/DesignBoard
 */
import React from 'react';
import { Composition, Folder } from 'remotion';
import { DURATION, FPS, SCENES } from './timeline';
import { PafiesFilme } from './compositions/PafiesFilme';
import { SceneStandalone } from './compositions/SceneStandalone';
import { SCENE_COMPOSITION_IDS } from './scenes';
import { DesignBoard } from './design/Preview';
import { DesignBoardV2 } from './design/v2/DesignBoardV2';

const H = { width: 1920, height: 1080 } as const;
const V = { width: 1080, height: 1920 } as const;

export const RemotionRoot: React.FC = () => (
  <>
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
    <Folder name="Design">
      <Composition id="DesignBoard" component={DesignBoard} durationInFrames={1} fps={FPS} {...H} />
      <Composition id="DesignBoardV2" component={DesignBoardV2} durationInFrames={1} fps={FPS} width={2400} height={2400} />
    </Folder>
  </>
);
