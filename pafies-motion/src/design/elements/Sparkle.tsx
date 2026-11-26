import React from "react";
import { COLORS } from "../tokens";

export type SparkleProps = {
  size: number;
  color?: string;
  /** 0..1 escala de aparição. */
  scale?: number;
  rotation?: number;
  /** Concavidade das pontas (0.18 fino … 0.4 gordo). */
  waist?: number;
  style?: React.CSSProperties;
};

/** Estrela de 4 pontas (✦) em path. */
export const sparklePath = (r = 50, waist = 0.24) => {
  const w = r * waist;
  return `M0 ${-r} C${w * 0.35} ${-w} ${w} ${-w * 0.35} ${r} 0 C${w} ${w * 0.35} ${w * 0.35} ${w} 0 ${r} C${-w * 0.35} ${w} ${-w} ${w * 0.35} ${-r} 0 C${-w} ${-w * 0.35} ${-w * 0.35} ${-w} 0 ${-r} Z`;
};

export const Sparkle: React.FC<SparkleProps> = ({ size, color = COLORS.goldLight, scale = 1, rotation = 0, waist = 0.24, style }) => (
  <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ overflow: "visible", ...style }}>
    <path d={sparklePath(50, waist)} fill={color} transform={`rotate(${rotation}) scale(${scale})`} />
  </svg>
);
