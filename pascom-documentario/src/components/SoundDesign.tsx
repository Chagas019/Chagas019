import React from "react";
import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { FPS, assets, sec, timeline } from "../data/timeline";

/**
 * Trilha, ambiente e foley (todos começam em 0 s e já vêm sincronizados com a
 * linha do tempo por scripts/compose-audio.py) + narração, quando gravada.
 * Com narração presente, a música recua sob a voz (ducking) e nunca compete com ela.
 */
export const SoundDesign: React.FC<{ musicVolume?: number }> = ({ musicVolume = 0.9 }) => {
  const hasVoice = Boolean(assets.narrationFull) || Object.keys(assets.narration).length > 0;
  const cues = timeline.narration;

  const duck = (f: number) => {
    if (!hasVoice) return 1;
    const t = f / FPS;
    let d = 1;
    for (const c of cues) {
      // desce 0,4 s antes da fala e volta 0,6 s depois
      const v = interpolate(t, [c.start - 0.4, c.start, c.end, c.end + 0.6], [1, 0.42, 0.42, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      d = Math.min(d, v);
    }
    return d;
  };

  return (
    <>
      <Audio src={staticFile("assets/audio/music/score.mp3")} volume={(f) => musicVolume * duck(f)} />
      <Audio src={staticFile("assets/audio/ambience/church-ambience.mp3")} volume={0.55} />
      <Audio src={staticFile("assets/audio/sfx/foley.mp3")} volume={0.9} />
      {assets.narrationFull ? <Audio src={staticFile(assets.narrationFull)} volume={1} /> : null}
      {!assets.narrationFull &&
        cues.map((c) =>
          assets.narration[c.id] ? (
            <Sequence key={c.id} from={sec(c.start)} name={`voz ${c.id}`} layout="none">
              <Audio src={staticFile(assets.narration[c.id])} volume={1} />
            </Sequence>
          ) : null,
        )}
    </>
  );
};
