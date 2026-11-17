// Montador genérico de episódios: lê timings.json (gerado pelo pipeline de narração),
// posiciona cada cena na timeline com dissolve, toca a mixagem final e sobrepõe as legendas.
// Para um novo santo: novo narration.json -> tools/build_narration.py -> tools/build_score.py -> nova config em src/episodes.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Subtitles} from './Subtitles';

export type EpisodeConfig = {
  id: string;
  audio: string; // caminho em public/
  timings: {duration: number; scenes: {id: string; start: number; end: number}[]; cues: any[]};
  events: Record<string, number>;
  scenes: Record<string, React.FC<any>>;
  overlap?: number; // frames de dissolve entre cenas
};

const Dissolve: React.FC<{frames: number; children: React.ReactNode}> = ({frames, children}) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{opacity: interpolate(f, [0, frames], [0, 1], {extrapolateRight: 'clamp'})}}>{children}</AbsoluteFill>;
};

export const Episode: React.FC<{cfg: EpisodeConfig}> = ({cfg}) => {
  const {fps} = useVideoConfig();
  const ov = cfg.overlap ?? 10;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {cfg.timings.scenes.map((s, i) => {
        const Comp = cfg.scenes[s.id];
        const from = Math.max(0, Math.round(s.start * fps) - (i ? ov : 0));
        const dur = Math.round(s.end * fps) - from;
        const ev = Object.fromEntries(Object.entries(cfg.events).map(([k, v]) => [k, v - from / fps]));
        const cue = cfg.timings.cues.find((c) => c.scene === s.id);
        return (
          <Sequence key={s.id} from={from} durationInFrames={dur} name={s.id}>
            <Dissolve frames={i ? ov : 1}>
              {Comp ? <Comp dur={dur} ev={ev} fps={fps} cue={cue} sceneStart={from / fps} /> : null}
            </Dissolve>
          </Sequence>
        );
      })}
      <Subtitles cues={cfg.timings.cues} />
      <Audio src={staticFile(cfg.audio)} />
    </AbsoluteFill>
  );
};
