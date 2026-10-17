import React from "react";
import { Composition } from "remotion";
import "./theme";
import { PascomCallingDocumentary, DocumentaryProps } from "./compositions/PascomCallingDocumentary";
import { DURATION_IN_FRAMES, FPS } from "./data/timeline";

const defaults: DocumentaryProps = { showCaptions: true, musicVolume: 0.9 };

/**
 * Formatos:
 * - PascomCallingDocumentary: 1080×1920 (Reels, Stories, Shorts). Formato principal.
 * - PascomCallingDocumentary16x9: 1920×1080 (telões de eventos, YouTube). Mesma montagem,
 *   todas as medidas são relativas ao quadro.
 * - PascomCallingDocumentary4x5: 1080×1350 (feed do Instagram).
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="PascomCallingDocumentary"
      component={PascomCallingDocumentary}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={defaults}
    />
    <Composition
      id="PascomCallingDocumentary16x9"
      component={PascomCallingDocumentary}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={defaults}
    />
    <Composition
      id="PascomCallingDocumentary4x5"
      component={PascomCallingDocumentary}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={1080}
      height={1350}
      defaultProps={defaults}
    />
  </>
);
