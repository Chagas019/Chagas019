import React from "react";
import { random } from "remotion";
import { COLORS } from "../tokens";
import { clamp01, lerp } from "./geom";

export type SpeedLinesProps = {
  count?: number;
  /** Seed determinística (troque a cada 2 frames p/ "on twos"). */
  seed?: string | number;
  /** 0..1 — linhas disparam do raio interno para fora (0 = nada, 0.5 = cheias, 1 = saíram). */
  progress?: number;
  innerRadius?: number;
  outerRadius?: number;
  /** Paleta sorteada por linha. */
  colors?: readonly string[];
  opacity?: number;
  /** Espessura máxima (px) da pincelada. */
  thickness?: number;
  width?: number;
  height?: number;
  /** Ponto focal (padrão: centro). */
  cx?: number;
  cy?: number;
  style?: React.CSSProperties;
};

const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

export const SpeedLines: React.FC<SpeedLinesProps> = ({
  count = 48,
  seed = "speed",
  progress = 0.5,
  innerRadius = 220,
  outerRadius,
  colors = [COLORS.white, COLORS.electricLight, COLORS.white],
  opacity = 0.8,
  thickness = 10,
  width = 1920,
  height = 1080,
  cx = width / 2,
  cy = height / 2,
  style,
}) => {
  const R = outerRadius ?? Math.hypot(width, height) * 0.62;
  const lines = [];
  for (let i = 0; i < count; i++) {
    const r = (k: string) => random(`${seed}-${i}-${k}`);
    const ang = ((i + r("a") * 0.8) / count) * Math.PI * 2;
    const delay = r("d") * 0.25;
    const p = clamp01((progress - delay) / (1 - delay));
    const r0 = innerRadius * (0.9 + r("i") * 0.5);
    const len = lerp(300, 900, r("l"));
    const head = r0 + ease(p * 2) * Math.min(len, R);
    const tail = r0 + ease(Math.max(0, p * 2 - 1)) * (R + len);
    if (head - tail < 2) continue;
    const w = lerp(thickness * 0.4, thickness, r("w"));
    const c = colors[Math.floor(r("c") * colors.length) % colors.length];
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const nx = -sa;
    const ny = ca;
    const at = (rad: number) => ({ x: cx + ca * rad, y: cy + sa * rad });
    const a = at(tail);
    const b = at(head);
    const m = at(lerp(tail, head, 0.35 + r("m") * 0.2));
    // pincelada: fusiforme, mais gorda perto da cauda-meio, afina nas pontas
    const d = `M${a.x} ${a.y} Q${m.x + nx * w} ${m.y + ny * w} ${b.x} ${b.y} Q${m.x - nx * w} ${m.y - ny * w} ${a.x} ${a.y} Z`;
    lines.push(<path key={i} d={d} fill={c} opacity={0.55 + r("o") * 0.45} />);
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", left: 0, top: 0, opacity, ...style }}>
      {lines}
    </svg>
  );
};
