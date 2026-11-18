import React from 'react';
import { AbsoluteFill, Audio, Composition, Sequence, staticFile } from 'remotion';
import { FPS, H, SCENES, TOTAL, W } from './theme';
import { S1Abertura } from './scenes/S1_Abertura';
import { S2Revelacao } from './scenes/S2_Revelacao';
import { S3Solidariedade } from './scenes/S3_Solidariedade';
import { S4Expectativa } from './scenes/S4_Expectativa';
import { S5Final } from './scenes/S5_Final';
import { CountdownHUD, Grain, Vignette } from './components/fx';
import { V2S1, V2S2, V2S3, V2S4, V2S5 } from './v2/scenes';
import { PaperGrain, Wipe, P as PV2 } from './v2/kit';

// ===== v2: direção editorial 2D =====
const V2_LIST = [
  { id: 'V2_S1_Abertura', C: V2S1, ...SCENES.s1 }, { id: 'V2_S2_Revelacao', C: V2S2, ...SCENES.s2 },
  { id: 'V2_S3_Solidariedade', C: V2S3, ...SCENES.s3 }, { id: 'V2_S4_Expectativa', C: V2S4, ...SCENES.s4 }, { id: 'V2_S5_Final', C: V2S5, ...SCENES.s5 },
];
export const PAFIES2027V2: React.FC<{ withAudio: boolean }> = ({ withAudio }) => (
  <AbsoluteFill style={{ background: PV2.navy }}>
    {V2_LIST.map(({ id, C, from, dur }) => <Sequence key={id} from={from} durationInFrames={dur} name={id}><C /></Sequence>)}
    <Wipe at={SCENES.s3.from - 8} dur={16} colors={[PV2.yellow, PV2.navy, PV2.cream]} />
    <Wipe at={SCENES.s4.from - 8} dur={16} colors={[PV2.red, PV2.yellow, PV2.royal]} dir={-1} />
    <PaperGrain opacity={0.1} />
    {withAudio && <Audio src={staticFile('audio/PAFIES2027_mix.wav')} />}
  </AbsoluteFill>
);
export const TeaserV2: React.FC = () => (
  <AbsoluteFill style={{ background: PV2.navy }}>
    <Sequence durationInFrames={SCENES.s4.dur}><V2S4 /></Sequence>
    <Sequence from={SCENES.s4.dur} durationInFrames={SCENES.s5.dur}><V2S5 /></Sequence>
    <PaperGrain opacity={0.1} />
    <Audio src={staticFile('audio/PAFIES2027_mix.wav')} startFrom={SCENES.s4.from} />
  </AbsoluteFill>
);

const SCENE_LIST = [
  { id: 'S1_Abertura', C: S1Abertura, ...SCENES.s1 },
  { id: 'S2_Revelacao', C: S2Revelacao, ...SCENES.s2 },
  { id: 'S3_Solidariedade', C: S3Solidariedade, ...SCENES.s3 },
  { id: 'S4_Expectativa', C: S4Expectativa, ...SCENES.s4 },
  { id: 'S5_Final', C: S5Final, ...SCENES.s5 },
];

const Finish: React.FC = () => (<><Vignette strength={0.5} /><Grain opacity={0.08} /></>);

export const PAFIES2027: React.FC<{ withAudio: boolean }> = ({ withAudio }) => (
  <AbsoluteFill style={{ background: '#000' }}>
    {SCENE_LIST.map(({ id, C, from, dur }) => (
      <Sequence key={id} from={from} durationInFrames={dur} name={id}><C /></Sequence>
    ))}
    {/* contador dinâmico: segundos até o fim do filme, durante as cenas 2–3 */}
    <Sequence from={SCENES.s2.from + 20} durationInFrames={SCENES.s3.from + SCENES.s3.dur - SCENES.s2.from - 20} name="HUD_Contagem">
      <CountdownHUD total={(TOTAL - SCENES.s2.from - 20) / FPS} />
    </Sequence>
    <Finish />
    {withAudio && <Audio src={staticFile('audio/PAFIES2027_mix.wav')} />}
  </AbsoluteFill>
);

// Versão alternativa: teaser de 16s (cenas 4 + 5) com o áudio correspondente
export const Teaser16: React.FC = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    <Sequence durationInFrames={SCENES.s4.dur}><S4Expectativa /></Sequence>
    <Sequence from={SCENES.s4.dur} durationInFrames={SCENES.s5.dur}><S5Final /></Sequence>
    <Finish />
    <Audio src={staticFile('audio/PAFIES2027_mix.wav')} startFrom={SCENES.s4.from} />
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="PAFIES2027" component={PAFIES2027} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{ withAudio: true }} />
    <Composition id="PAFIES2027-v2" component={PAFIES2027V2} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{ withAudio: true }} />
    <Composition id="PAFIES2027-v2-Teaser16" component={TeaserV2} durationInFrames={SCENES.s4.dur + SCENES.s5.dur} fps={FPS} width={W} height={H} />
    <Composition id="PAFIES2027-Teaser16" component={Teaser16} durationInFrames={SCENES.s4.dur + SCENES.s5.dur} fps={FPS} width={W} height={H} />
    {SCENE_LIST.map(({ id, C, dur }) => (
      <Composition key={id} id={`Cena-${id.replace('_', '-')}`} component={() => (<AbsoluteFill><C /><Finish /></AbsoluteFill>)} durationInFrames={dur} fps={FPS} width={W} height={H} />
    ))}
  </>
);
