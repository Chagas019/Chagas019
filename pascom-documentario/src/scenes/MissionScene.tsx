import React from "react";
import { VideoSequence } from "../components/VideoSequence";
import { shotsOfAct } from "../data/timeline";

/** Ato 4 — A Missão. A música desacelera; quem estava atrás da câmera dá lugar a quem foi alcançado. */
export const MissionScene: React.FC = () => <VideoSequence shots={shotsOfAct("act4")} />;
