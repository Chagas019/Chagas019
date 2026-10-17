import React from "react";
import { VideoSequence } from "../components/VideoSequence";
import { shotsOfAct } from "../data/timeline";

/** Ato 1 — O Silêncio. Tela preta, a porta, a luz nos vitrais e as mãos que preparam a câmera. */
export const OpeningScene: React.FC = () => <VideoSequence shots={shotsOfAct("act1")} />;
