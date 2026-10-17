import React from "react";
import { interpolate, Easing } from "remotion";
import { colors, fonts } from "../../theme";
import { PlateProps, smoothNoise } from "./util";

const DISTANCES = ["∞", "10", "5", "3", "2", "1.5", "1", "0.7"];

/**
 * Plano fechado de uma lente.
 * phase "reveal": a câmera sai da bolsa, a luz desliza pelo vidro.
 * phase "focus": o anel de foco gira e o diafragma fecha.
 * phase "rest": a câmera abaixada, imóvel, depois do momento.
 */
export const LensPlate: React.FC<PlateProps> = ({ progress, frame, width: W, height: H, props }) => {
  const phase = (props.phase as string) ?? "focus";
  const t = frame / 30;
  const cx = W * 0.5;
  const cy = H * (phase === "rest" ? 0.56 : 0.47);
  const R = Math.min(W, H) * 0.46;

  const rise = phase === "reveal" ? interpolate(progress, [0, 0.7], [H * 0.18, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }) : 0;
  const ringTurn =
    phase === "focus"
      ? interpolate(progress, [0.05, 0.85], [0, 118], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) })
      : phase === "reveal"
        ? 20
        : 60;
  const aperture =
    phase === "focus"
      ? interpolate(progress, [0.35, 0.9], [0.62, 0.36], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) })
      : 0.62;
  const sweep = phase === "reveal" ? interpolate(progress, [0.1, 0.9], [-1, 1.2]) : Math.sin(t * 0.3) * 0.4;
  const dim = phase === "rest" ? 0.55 : 1;
  const blades = 9;
  const holeR = R * 0.42 * aperture;
  const rot = ringTurn * 0.6;

  const bladePoly = Array.from({ length: blades }, (_, i) => {
    const a = (i / blades) * Math.PI * 2 + (rot * Math.PI) / 180;
    return `${cx + Math.cos(a) * holeR},${cy + rise + Math.sin(a) * holeR}`;
  }).join(" ");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="lp-bg" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor="#1c1612" />
          <stop offset="100%" stopColor={colors.night} />
        </radialGradient>
        <radialGradient id="lp-glass" cx="42%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#2d2a3a" />
          <stop offset="55%" stopColor="#0d0c14" />
          <stop offset="100%" stopColor="#050508" />
        </radialGradient>
        <linearGradient id="lp-coat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7d4bd6" stopOpacity={0} />
          <stop offset="45%" stopColor="#7d4bd6" stopOpacity={0.55} />
          <stop offset="55%" stopColor="#3fbf8f" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#3fbf8f" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="lp-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3632" />
          <stop offset="50%" stopColor="#141210" />
          <stop offset="100%" stopColor="#2a2622" />
        </linearGradient>
        <filter id="lp-blur">
          <feGaussianBlur stdDeviation={W * 0.01} />
        </filter>
        <clipPath id="lp-front">
          <circle cx={cx} cy={cy + rise} r={R * 0.66} />
        </clipPath>
      </defs>
      <rect width={W} height={H} fill="url(#lp-bg)" />
      <g opacity={dim}>
        {/* corpo da lente */}
        <circle cx={cx} cy={cy + rise} r={R} fill="url(#lp-metal)" />
        {/* anel de foco com serrilhado e escala de distância */}
        <circle cx={cx} cy={cy + rise} r={R * 0.93} fill="#0e0d0c" />
        <g transform={`rotate(${ringTurn} ${cx} ${cy + rise})`}>
          {Array.from({ length: 120 }).map((_, i) => {
            const a = (i / 120) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={cx + Math.cos(a) * R * 0.86}
                y1={cy + rise + Math.sin(a) * R * 0.86}
                x2={cx + Math.cos(a) * R * 0.92}
                y2={cy + rise + Math.sin(a) * R * 0.92}
                stroke="#2b2825"
                strokeWidth={W * 0.004}
              />
            );
          })}
          {DISTANCES.map((d, i) => {
            const a = -Math.PI / 2 + (i - 3) * 0.22;
            return (
              <text
                key={d}
                x={cx + Math.cos(a) * R * 0.79}
                y={cy + rise + Math.sin(a) * R * 0.79}
                fill={i === 4 ? colors.gold : "#c9c2b6"}
                fontFamily={fonts.sans}
                fontSize={R * 0.055}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${(a * 180) / Math.PI + 90} ${cx + Math.cos(a) * R * 0.79} ${cy + rise + Math.sin(a) * R * 0.79})`}
              >
                {d}
              </text>
            );
          })}
        </g>
        {/* índice fixo */}
        <rect x={cx - W * 0.002} y={cy + rise - R * 0.97} width={W * 0.004} height={R * 0.05} fill={colors.gold} />
        <circle cx={cx} cy={cy + rise} r={R * 0.72} fill="#070608" stroke="#24211e" strokeWidth={W * 0.004} />

        {/* vidro frontal */}
        <circle cx={cx} cy={cy + rise} r={R * 0.66} fill="url(#lp-glass)" />
        <g clipPath="url(#lp-front)">
          {/* diafragma */}
          <circle cx={cx} cy={cy + rise} r={R * 0.5} fill="#030304" />
          <polygon points={bladePoly} fill="#1a1820" stroke="#2c2a33" strokeWidth={W * 0.002} />
          {Array.from({ length: blades }).map((_, i) => {
            const a = (i / blades) * Math.PI * 2 + (rot * Math.PI) / 180;
            const x0 = cx + Math.cos(a) * holeR;
            const y0 = cy + rise + Math.sin(a) * holeR;
            const a2 = a + 1.2;
            return <line key={i} x1={x0} y1={y0} x2={cx + Math.cos(a2) * R * 0.5} y2={cy + rise + Math.sin(a2) * R * 0.5} stroke="#26242c" strokeWidth={W * 0.002} />;
          })}
          {/* reflexos do revestimento */}
          <ellipse
            cx={cx + sweep * R * 0.45}
            cy={cy + rise - R * 0.18}
            rx={R * 0.42}
            ry={R * 0.16}
            fill="url(#lp-coat)"
            transform={`rotate(-28 ${cx} ${cy + rise})`}
            filter="url(#lp-blur)"
          />
          <ellipse cx={cx - R * 0.22 + sweep * R * 0.1} cy={cy + rise - R * 0.3} rx={R * 0.1} ry={R * 0.05} fill="#fff4dc" opacity={0.65} filter="url(#lp-blur)" />
          <circle cx={cx + R * 0.2} cy={cy + rise + R * 0.24} r={R * 0.03} fill={colors.goldLight} opacity={0.4 + 0.3 * smoothNoise("lens", t)} />
        </g>
        <circle cx={cx} cy={cy + rise} r={R * 0.66} fill="none" stroke="#3b3733" strokeWidth={W * 0.003} />
        <text x={cx} y={cy + rise + R * 0.6} fill="#8d867b" fontFamily={fonts.sans} fontSize={R * 0.04} textAnchor="middle" letterSpacing={R * 0.01}>
          50mm  1:1.4
        </text>
      </g>
      {/* luz lateral quente, como de uma janela */}
      <rect width={W} height={H} fill={colors.gold} opacity={0.06} style={{ mixBlendMode: "screen" }} />
    </svg>
  );
};
