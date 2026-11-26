import React, { useMemo } from "react";
import { noise2D } from "@remotion/noise";
import { GRADIENT_STOPS, GradientStop } from "../tokens";
import { Pt, smoothClosedPath, useSvgId } from "./geom";

export type BlobProps = {
  /** Raio médio em px. */
  radius: number;
  seed?: string | number;
  /** Fase do ruído (anime com frame/60 etc.). */
  phase?: number;
  /** Amplitude da deformação (0.18 = ±18%). */
  amplitude?: number;
  /** Cor sólida OU stops de degradê radial. */
  color?: string;
  gradient?: readonly GradientStop[];
  /** Realce líquido (reflexo) 0..1. */
  shine?: number;
  opacity?: number;
  /** Desfoque (px) — p/ blobs de fundo. */
  blur?: number;
  style?: React.CSSProperties;
};

/** Path do blob centrado em (0,0). */
export const blobPath = (radius: number, seed: string | number = "blob", phase = 0, amplitude = 0.18, points = 48): string => {
  const pts: Pt[] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const n =
      noise2D(seed, Math.cos(a) * 0.8 + phase, Math.sin(a) * 0.8 + phase * 0.6) * 0.75 +
      noise2D(`${seed}-b`, Math.cos(a) * 1.8 - phase * 0.5, Math.sin(a) * 1.8) * 0.25;
    const r = radius * (1 + amplitude * n);
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return smoothClosedPath(pts);
};

export const Blob: React.FC<BlobProps> = ({
  radius,
  seed = "blob",
  phase = 0,
  amplitude = 0.18,
  color,
  gradient = GRADIENT_STOPS.heart,
  shine = 0,
  opacity = 1,
  blur = 0,
  style,
}) => {
  const id = useSvgId("blob");
  const d = useMemo(() => blobPath(radius, seed, phase, amplitude), [radius, seed, phase, amplitude]);
  const ext = radius * (1 + amplitude) + blur * 3 + 4;
  return (
    <svg width={ext * 2} height={ext * 2} viewBox={`${-ext} ${-ext} ${ext * 2} ${ext * 2}`} style={{ overflow: "visible", opacity, ...style }}>
      <defs>
        {!color && (
          <radialGradient id={`${id}-g`} cx="0.38" cy="0.32" r="0.75">
            {gradient.map((s) => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </radialGradient>
        )}
        {blur > 0 && (
          <filter id={`${id}-f`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={blur} />
          </filter>
        )}
      </defs>
      <path d={d} fill={color ?? `url(#${id}-g)`} filter={blur > 0 ? `url(#${id}-f)` : undefined} />
      {shine > 0 && (
        <g opacity={shine * 0.45}>
          <path
            d={`M${-radius * 0.62} ${-radius * 0.18} C${-radius * 0.6} ${-radius * 0.45} ${-radius * 0.42} ${-radius * 0.62} ${-radius * 0.18} ${-radius * 0.66}`}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={radius * 0.09}
            strokeLinecap="round"
          />
          <circle cx={-radius * 0.64} cy={radius * 0.04} r={radius * 0.045} fill="#FFFFFF" />
        </g>
      )}
    </svg>
  );
};
