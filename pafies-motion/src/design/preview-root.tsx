import React from "react";
import { Composition } from "remotion";
import { DesignBoard } from "./Preview";

export const PreviewRoot: React.FC = () => (
  <Composition id="DesignBoard" component={DesignBoard} durationInFrames={1} fps={30} width={1920} height={1080} />
);
