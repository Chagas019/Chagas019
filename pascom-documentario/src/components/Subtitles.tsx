import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { NarrationCue, sec } from "../data/timeline";
import { colors, fonts } from "../theme";

const Caption: React.FC<{ text: string; frames: number }> = ({ text, frames }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height);
  const o = interpolate(frame, [0, 7, frames - 7, frames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    // acima da faixa inferior ocupada pela interface dos Reels/Shorts
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: height > width ? height * 0.24 : height * 0.1 }}>
      <AbsoluteFill
        style={{
          opacity: o,
          background: `linear-gradient(180deg, transparent ${height > width ? 58 : 68}%, rgba(5,4,7,0.55) ${height > width ? 70 : 82}%, rgba(5,4,7,0.55) ${height > width ? 80 : 94}%, transparent)`,
        }}
      />
      <div
        style={{
          position: "relative",
          maxWidth: width * (height > width ? 0.82 : 0.6),
          textAlign: "center",
          fontFamily: fonts.sans,
          fontWeight: 400,
          fontSize: unit * 0.036,
          lineHeight: 1.35,
          letterSpacing: "0.01em",
          color: colors.ivory,
          opacity: o * 0.94,
          textShadow: "0 1px 2px rgba(0,0,0,0.9), 0 0 18px rgba(0,0,0,0.75)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** Legendas da narração. Falas que já aparecem como frase na tela não são repetidas. */
export const Subtitles: React.FC<{ cues: NarrationCue[] }> = ({ cues }) => (
  <>
    {cues
      .filter((c) => c.caption !== false)
      .map((c) => {
        const from = sec(c.start) - 3;
        const frames = sec(c.end) - from + 9;
        return (
          <Sequence key={c.id} name={`legenda ${c.id}`} from={from} durationInFrames={frames} layout="none">
            <Caption text={c.text} frames={frames} />
          </Sequence>
        );
      })}
  </>
);
