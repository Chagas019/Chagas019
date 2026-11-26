import React from "react";
import { random } from "remotion";
import { COLORS } from "../tokens";
import { clamp01, lerp } from "./geom";

export type RespingosProps = {
  /** 0..1 ao longo da vida do respingo (dispare no impacto, ~10–14 frames). */
  progress: number;
  count?: number;
  seed?: string | number;
  colors?: readonly string[];
  /** Distância máxima percorrida (px). */
  spread?: number;
  /** Tamanho base da gota (px). */
  dropSize?: number;
  /** Gravidade (px no fim da vida). */
  gravity?: number;
  /** Direção central em graus (−90 = para cima) e abertura do leque. */
  direction?: number;
  arc?: number;
  /** Tamanho do canvas local; o ponto de origem fica no centro. */
  canvas?: number;
  style?: React.CSSProperties;
};

/** Gota em lágrima com a cabeça em (0,0) apontando para +x. */
const tear = (r: number, L: number) =>
  `M${-L} 0 C${-L * 0.45} ${-r * 0.35} ${-r * 0.7} ${-r} 0 ${-r} A${r} ${r} 0 0 1 0 ${r} C${-r * 0.7} ${r} ${-L * 0.45} ${r * 0.35} ${-L} 0 Z`;

export const Respingos: React.FC<RespingosProps> = ({
  progress,
  count = 10,
  seed = "splash",
  colors = [COLORS.hotOrange, COLORS.coral, COLORS.orange],
  spread = 260,
  dropSize = 14,
  gravity = 120,
  direction = -90,
  arc = 360,
  canvas = 800,
  style,
}) => {
  const t = clamp01(progress);
  const half = canvas / 2;
  const drops = [];
  for (let i = 0; i < count; i++) {
    const r = (k: string) => random(`${seed}-${i}-${k}`);
    const ang = ((direction + (((i + r("a") * 0.7) / count) - 0.5) * arc) * Math.PI) / 180;
    const speed = lerp(0.45, 1, r("s")) * spread;
    const out = 1 - Math.pow(1 - t, 2.4); // desacelera (arrasto)
    const x = Math.cos(ang) * speed * out;
    const y = Math.sin(ang) * speed * out + gravity * t * t;
    const vx = Math.cos(ang) * speed * Math.pow(1 - t, 1.4);
    const vy = Math.sin(ang) * speed * Math.pow(1 - t, 1.4) + gravity * 2 * t;
    const heading = (Math.atan2(vy, vx) * 180) / Math.PI;
    const life = t < 0.15 ? t / 0.15 : 1 - Math.pow((t - 0.15) / 0.85, 1.6);
    const size = dropSize * lerp(0.5, 1.3, r("z")) * Math.max(0, life);
    if (size < 0.3) continue;
    const stretch = 1 + 3.2 * Math.pow(1 - t, 2);
    const c = colors[Math.floor(r("c") * colors.length) % colors.length];
    drops.push(
      <g key={i} transform={`translate(${half + x} ${half + y}) rotate(${heading})`}>
        <path d={tear(size, size * stretch)} fill={c} />
        <circle cx={size * 0.25} cy={-size * 0.35} r={size * 0.28} fill="#FFFFFF" opacity={0.35} />
      </g>,
    );
    // gotícula satélite
    if (r("sat") > 0.45) {
      const k = 0.62;
      drops.push(
        <circle key={`s${i}`} cx={half + x * k + r("sx") * 10} cy={half + y * k + 8 * r("sy")} r={size * 0.32} fill={c} />,
      );
    }
  }
  return (
    <svg width={canvas} height={canvas} viewBox={`0 0 ${canvas} ${canvas}`} style={{ overflow: "visible", ...style }}>
      {drops}
    </svg>
  );
};
