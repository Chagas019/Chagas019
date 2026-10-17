import React from "react";
import { AbsoluteFill } from "remotion";
import { CinematicText } from "../components/CinematicText";
import { FilmGate, FilmLook, FilmTransition } from "../components/FilmTransition";
import { SoundDesign } from "../components/SoundDesign";
import { Subtitles } from "../components/Subtitles";
import { timeline } from "../data/timeline";
import { CallingScene } from "../scenes/CallingScene";
import { EndingScene } from "../scenes/EndingScene";
import { MissionScene } from "../scenes/MissionScene";
import { OpeningScene } from "../scenes/OpeningScene";
import { WorshipScene } from "../scenes/WorshipScene";
import { colors } from "../theme";

export type DocumentaryProps = {
  /** Legendas da narração queimadas no vídeo (recomendado: redes sociais assistidas sem som). */
  showCaptions: boolean;
  musicVolume: number;
};

export const PascomCallingDocumentary: React.FC<DocumentaryProps> = ({ showCaptions, musicVolume }) => (
  <AbsoluteFill style={{ backgroundColor: colors.night }}>
    <FilmGate>
      <OpeningScene />
      <CallingScene />
      <WorshipScene />
      <MissionScene />
      <EndingScene />
      <FilmTransition />
    </FilmGate>
    <CinematicText titles={timeline.titles} chapters={timeline.chapters} />
    {showCaptions ? <Subtitles cues={timeline.narration} /> : null}
    <FilmLook />
    <SoundDesign musicVolume={musicVolume} />
  </AbsoluteFill>
);
