import React from "react";
import { colors } from "../../theme";
import { PlateProps, personPath, seeded, smoothNoise } from "./util";

/**
 * A comunidade reunida: silhuetas em primeiro plano contra as luzes do salão fora de foco.
 * tone "cool" sugere telas e equipamentos (equipe de mídia); "warm", velas e lâmpadas.
 */
export const BokehPlate: React.FC<PlateProps> = ({ progress, frame, width: W, height: H, props }) => {
  const tone = (props.tone as string) ?? "warm";
  const dense = Boolean(props.dense);
  const t = frame / 30;
  const lights = seeded(`bk-${tone}-${dense}`, dense ? 46 : 30);
  const people = seeded(`ppl-${tone}`, dense ? 9 : 6);
  const palette = tone === "cool" ? ["#a9c7ff", "#f4ead8", "#ffd9a0", "#7fa6e8"] : [colors.candle, "#ffe6b8", colors.gold, "#fff4dc"];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="bk-bg" cx="50%" cy="40%" r="85%">
          <stop offset="0%" stopColor={tone === "cool" ? "#141a26" : "#2a1b10"} />
          <stop offset="100%" stopColor="#050405" />
        </radialGradient>
        <filter id="bk-soft">
          <feGaussianBlur stdDeviation={W * 0.006} />
        </filter>
        <filter id="bk-people">
          <feGaussianBlur stdDeviation={W * 0.003} />
        </filter>
      </defs>
      <rect width={W} height={H} fill="url(#bk-bg)" />
      <g filter="url(#bk-soft)" style={{ mixBlendMode: "screen" }}>
        {lights.map((l) => {
          const depth = 0.4 + l.c * 0.9;
          const x = ((l.a + t * 0.004 * depth + progress * 0.02) % 1.1) * W - W * 0.05;
          const y = H * (0.12 + l.b * 0.6);
          const r = W * (0.02 + 0.07 * l.c);
          const breath = 0.75 + 0.25 * smoothNoise(`l${l.i}`, t * 0.8);
          const fill = palette[l.i % palette.length];
          return (
            <g key={l.i} opacity={(0.12 + 0.28 * l.d) * breath}>
              <circle cx={x} cy={y} r={r} fill={fill} />
              <circle cx={x} cy={y} r={r} fill="none" stroke={fill} strokeWidth={r * 0.08} opacity={0.6} />
            </g>
          );
        })}
      </g>
      {/* contraluz suave atrás das pessoas */}
      <ellipse cx={W * 0.5} cy={H * 0.58} rx={W * 0.7} ry={H * 0.16} fill={tone === "cool" ? "#2b3a55" : "#5a381b"} opacity={0.35} filter="url(#bk-soft)" />
      <g filter="url(#bk-people)">
        {people.map((p) => {
          const n = people.length;
          const x = W * ((p.i + 0.5) / n) + (p.a - 0.5) * W * 0.08 + Math.sin(t * 0.3 + p.b * 5) * W * 0.003;
          const s = W * (0.32 + 0.12 * p.c) * (dense ? 0.85 : 1);
          return <path key={p.i} d={personPath(x, H * (0.86 + 0.05 * p.d), s)} fill="#070506" />;
        })}
        {/* fileira mais próxima */}
        {[0.15, 0.62].map((k, i) => (
          <path key={`f${i}`} d={personPath(W * k, H * 1.02, W * 0.62)} fill="#030203" />
        ))}
      </g>
      {/* borda de luz nos ombros */}
      <rect width={W} height={H} fill={tone === "cool" ? "#9ab8ff" : colors.gold} opacity={0.035} style={{ mixBlendMode: "screen" }} />
    </svg>
  );
};
