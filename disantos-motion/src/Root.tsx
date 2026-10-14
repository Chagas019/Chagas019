import { Composition } from "remotion";
import { DisantosReel } from "./DisantosReel";
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "./config/timeline";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="DisantosReel"
    component={DisantosReel}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
