import React from "react";
import { VideoSequence } from "../components/VideoSequence";
import { shotsOfAct } from "../data/timeline";

/** Ato 2 — O Chamado. A comunidade chega, a equipe se prepara, jovens rezam: era sobre as pessoas. */
export const CallingScene: React.FC = () => <VideoSequence shots={shotsOfAct("act2")} />;
