import React from "react";
import { VideoSequence } from "../components/VideoSequence";
import { shotsOfAct } from "../data/timeline";

/** Ato 3 — Algo Maior. Clímax: cortes secos no pulso da música, câmera lenta onde há emoção. */
export const WorshipScene: React.FC = () => <VideoSequence shots={shotsOfAct("act3")} />;
