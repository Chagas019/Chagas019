import React from "react";
import { colors } from "../../theme";
import { PlateProps, seeded, smoothNoise } from "./util";

/** Procissão à noite: um caminho de velas se aproximando, a igreja iluminada no horizonte. */
export const ProcessionPlate: React.FC<PlateProps> = ({ progress, frame, width: W, height: H }) => {
  const t = frame / 30;
  const horizon = H * 0.36;
  const walkers = seeded("proc", 44);
  // curva em S do caminho, do horizonte até a câmera
  const pathAt = (d: number) => {
    const y = horizon + Math.pow(d, 1.9) * (H * 0.75);
    const x = W * 0.5 + Math.sin(d * Math.PI * 1.6 + 0.6) * W * 0.18 * d;
    return { x, y, scale: 0.08 + d * 1.4 };
  };

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="pr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#05070f" />
          <stop offset="70%" stopColor="#141626" />
          <stop offset="100%" stopColor="#2a1f1c" />
        </linearGradient>
        <radialGradient id="pr-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.candle} stopOpacity={0.9} />
          <stop offset="40%" stopColor={colors.candle} stopOpacity={0.25} />
          <stop offset="100%" stopColor={colors.candle} stopOpacity={0} />
        </radialGradient>
        <filter id="pr-soft">
          <feGaussianBlur stdDeviation={W * 0.004} />
        </filter>
      </defs>
      <rect width={W} height={horizon + 2} fill="url(#pr-sky)" />
      <rect y={horizon} width={W} height={H - horizon} fill="#08070a" />

      {/* igreja no horizonte */}
      <g transform={`translate(${W * 0.5}, ${horizon})`}>
        <path
          d={`M ${-W * 0.13} 0 L ${-W * 0.13} ${-H * 0.06} L 0 ${-H * 0.1} L ${W * 0.13} ${-H * 0.06} L ${W * 0.13} 0 Z`}
          fill="#0c0b10"
        />
        <rect x={-W * 0.035} y={-H * 0.17} width={W * 0.07} height={H * 0.1} fill="#0c0b10" />
        <path d={`M ${-W * 0.035} ${-H * 0.17} L 0 ${-H * 0.21} L ${W * 0.035} ${-H * 0.17} Z`} fill="#0c0b10" />
        <rect x={-W * 0.002} y={-H * 0.235} width={W * 0.004} height={H * 0.03} fill="#0c0b10" />
        <rect x={-W * 0.012} y={-H * 0.226} width={W * 0.024} height={W * 0.004} fill="#0c0b10" />
        <path d={`M ${-W * 0.018} 0 L ${-W * 0.018} ${-H * 0.03} Q 0 ${-H * 0.045} ${W * 0.018} ${-H * 0.03} L ${W * 0.018} 0 Z`} fill={colors.candle} opacity={0.85} />
        <circle cx={0} cy={-H * 0.12} r={W * 0.012} fill={colors.goldLight} opacity={0.7} />
        <ellipse cx={0} cy={-H * 0.02} rx={W * 0.2} ry={H * 0.05} fill="url(#pr-glow)" opacity={0.5} />
      </g>

      <g filter="url(#pr-soft)">
        {walkers
          .map((w) => {
            // cada pessoa avança lentamente em direção à câmera
            const d = (w.a + t * 0.006 + progress * 0.02) % 1;
            return { w, d };
          })
          .sort((a, b) => a.d - b.d)
          .map(({ w, d }) => {
            const p = pathAt(d);
            const side = (w.b - 0.5) * W * 0.12 * p.scale;
            const flick = 0.75 + 0.25 * smoothNoise(`pw${w.i}`, t * 6);
            const r = W * 0.012 * Math.min(p.scale, 0.9);
            return (
              <g key={w.i} opacity={Math.min(1, d * 6)}>
                <circle cx={p.x + side} cy={p.y - r * 6} r={r * 5.5 * flick} fill="url(#pr-glow)" />
                <ellipse cx={p.x + side} cy={p.y + r * 2} rx={r * 3.2} ry={r * 7} fill="#050405" />
                <circle cx={p.x + side} cy={p.y - r * 6} r={r * 0.9} fill="#fff1cf" />
              </g>
            );
          })}
      </g>
    </svg>
  );
};
