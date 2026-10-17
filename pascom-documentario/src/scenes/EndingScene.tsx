import React from "react";
import { VideoSequence } from "../components/VideoSequence";
import { shotsOfAct } from "../data/timeline";

/** Ato 5 — O Envio. Plano contemplativo, a câmera se afasta, a tela escurece. */
export const EndingScene: React.FC = () => <VideoSequence shots={shotsOfAct("act5")} />;
