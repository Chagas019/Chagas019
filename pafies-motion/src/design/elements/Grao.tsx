import React from "react";
import { GRAIN } from "../tokens";
import { useSvgId } from "./geom";

export type GraoProps = {
  /** Troque a cada 2 frames: seed={Math.floor(frame/2)}. */
  seed?: number;
  opacity?: number;
  baseFrequency?: number;
  width?: number;
  height?: number;
  blendMode?: React.CSSProperties["mixBlendMode"];
  style?: React.CSSProperties;
};

export const Grao: React.FC<GraoProps> = ({
  seed = 0,
  opacity = GRAIN.opacity,
  baseFrequency = GRAIN.baseFrequency,
  width = 1920,
  height = 1080,
  blendMode = "overlay",
  style,
}) => {
  const id = useSvgId("grao");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", mixBlendMode: blendMode, opacity, ...style }}
    >
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency={baseFrequency} numOctaves={2} seed={Math.round(seed) % 1000} stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1" />
        <feComponentTransfer>
          <feFuncR type="linear" slope={2.2} intercept={-0.6} />
          <feFuncG type="linear" slope={2.2} intercept={-0.6} />
          <feFuncB type="linear" slope={2.2} intercept={-0.6} />
        </feComponentTransfer>
      </filter>
      <rect width={width} height={height} filter={`url(#${id})`} />
    </svg>
  );
};
