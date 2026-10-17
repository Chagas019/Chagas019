import React from "react";
import { AbsoluteFill, Easing, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraMove, FPS, Shot, assets } from "../data/timeline";
import { colors } from "../theme";
import { PLATES } from "./plates";
import { smoothNoise } from "./plates/util";

/** Duração das transições de entrada, em segundos. */
export const TRANSITION_SEC: Record<NonNullable<Shot["transition"]>, number> = {
  cut: 0,
  dissolve: 0.7,
  slow: 1.6,
  light: 0,
};

/** Movimento de câmera simulado: discreto, sempre a favor do plano. */
const cameraTransform = (move: CameraMove, p: number, t: number) => {
  const e = Easing.bezier(0.33, 0, 0.3, 1)(p);
  const hand = (k: string) => (smoothNoise(k, t * 0.5) - 0.5) * 0.006; // respiração de câmera na mão
  switch (move) {
    case "push":
      return { scale: interpolate(e, [0, 1], [1.02, 1.09]), x: hand("hx"), y: hand("hy") };
    case "pull":
      return { scale: interpolate(e, [0, 1], [1.12, 1.02]), x: 0, y: 0 };
    case "pullSlow":
      return { scale: interpolate(e, [0, 1], [1.22, 1.0]), x: 0, y: interpolate(e, [0, 1], [-0.015, 0]) };
    case "drift":
      return { scale: 1.07, x: interpolate(e, [0, 1], [-0.018, 0.018]), y: hand("dy") };
    case "still":
    default:
      return { scale: 1.03, x: hand("sx"), y: hand("sy") };
  }
};

/** Gradação de cor aplicada às filmagens reais para unificar fontes diferentes. */
const FOOTAGE_GRADE = "contrast(1.1) saturate(0.82) brightness(0.9) sepia(0.14)";

export const CinematicScene: React.FC<{ shot: Shot; inFrames: number }> = ({ shot, inFrames }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const durFrames = Math.round((shot.end - shot.start) * FPS) + inFrames;
  const progress = Math.min(1, Math.max(0, frame / durFrames));
  const t = frame / FPS;
  const cam = cameraTransform(shot.move ?? "still", progress, t);
  const opacity = inFrames > 0 ? interpolate(frame, [0, inFrames], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) }) : 1;
  const footage = shot.slot ? assets.footage[shot.slot] : undefined;

  let content: React.ReactNode;
  if (footage) {
    const shotSec = durFrames / FPS;
    // câmera lenta só até onde o clipe alcança; nunca congela no último quadro
    const rate = Math.min(shot.slowMo ?? 1, Math.max(0.25, (footage.durationSec - (footage.trimStartSec ?? 0)) / shotSec));
    content = (
      <AbsoluteFill>
        <OffthreadVideo
          src={staticFile(footage.src)}
          muted
          playbackRate={rate}
          startFrom={Math.round((footage.trimStartSec ?? 0) * FPS)}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: FOOTAGE_GRADE }}
        />
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${colors.ember}22, transparent 40%, ${colors.night}66)`, mixBlendMode: "soft-light" }} />
      </AbsoluteFill>
    );
  } else {
    const Plate = PLATES[shot.plate];
    content = <Plate progress={progress} frame={frame} width={width} height={height} props={shot.plateProps ?? {}} />;
  }

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: shot.plate === "black" && !footage ? colors.night : undefined }}>
      <AbsoluteFill
        style={{
          transform: `translate(${cam.x * width}px, ${cam.y * height}px) scale(${cam.scale})`,
          transformOrigin: "50% 45%",
        }}
      >
        {content}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
