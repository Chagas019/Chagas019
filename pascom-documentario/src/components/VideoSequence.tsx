import React from "react";
import { Sequence } from "remotion";
import { FPS, Shot, sec } from "../data/timeline";
import { CinematicScene, TRANSITION_SEC } from "./CinematicScene";

/**
 * Monta os planos de um ato. Cada plano começa um pouco antes do seu início
 * nominal para se dissolver sobre o anterior; num corte seco, entra no quadro exato.
 */
export const VideoSequence: React.FC<{ shots: Shot[] }> = ({ shots }) => (
  <>
    {shots.map((shot) => {
      const inFrames = Math.round(TRANSITION_SEC[shot.transition ?? "dissolve"] * FPS);
      const from = sec(shot.start) - Math.round(inFrames / 2);
      const duration = sec(shot.end) - from + Math.round(FPS * 0.4);
      return (
        <Sequence key={shot.id} name={`${shot.id} · ${shot.plate}`} from={Math.max(0, from)} durationInFrames={duration} layout="none">
          <CinematicScene shot={shot} inFrames={from < 0 ? 0 : inFrames} />
        </Sequence>
      );
    })}
  </>
);
