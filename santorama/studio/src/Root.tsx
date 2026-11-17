import React from 'react';
import {Composition, Still} from 'remotion';
import {CharacterSheet} from './characters/CharacterSheet';
import {Episode} from './core/Episode';
import {ep001} from './episodes/ep001';
import {BrandBoard, Cover, ProfilePic, LogoStill, StoryTemplate, ReelFrameTemplate, FeedPost} from './brand/Stills';

const FPS = 30;
const EP001: React.FC = () => <Episode cfg={ep001} />;
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="EP001-Kolbe" component={EP001} fps={FPS} width={1080} height={1920}
      durationInFrames={Math.round(ep001.timings.duration * FPS)} />
    <Still id="CharacterSheet" component={CharacterSheet} width={1080} height={1920} />
    <Still id="Logo" component={LogoStill} width={1600} height={1600} />
    <Still id="ProfilePic" component={ProfilePic} width={1080} height={1080} />
    <Still id="BrandBoard" component={BrandBoard} width={1080} height={1920} />
    <Still id="CoverEP001" component={Cover} width={1080} height={1920} />
    <Still id="FeedEP001" component={FeedPost} width={1080} height={1350} />
    <Still id="StoryTemplate" component={StoryTemplate} width={1080} height={1920} />
    <Still id="ReelTemplate" component={ReelFrameTemplate} width={1080} height={1920} />
  </>
);
