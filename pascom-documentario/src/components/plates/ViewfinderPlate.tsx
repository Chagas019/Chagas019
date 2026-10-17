import React from "react";
import { interpolate } from "remotion";
import { colors, fonts } from "../../theme";
import { PlateProps, personPath, seeded, smoothNoise } from "./util";

/**
 * O mundo visto pelo visor: a cena fora de foco ganha nitidez (rack focus)
 * e o ponto de foco confirma. O conteúdo muda conforme o momento narrativo.
 */
export const ViewfinderPlate: React.FC<PlateProps> = ({ progress, frame, width: W, height: H, props }) => {
  const label = (props.label as string) ?? "ALTAR";
  const t = frame / 30;
  const focus = interpolate(progress, [0.05, 0.45], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blur = 2 + focus * W * 0.02;
  const locked = progress > 0.47;
  const bokeh = seeded(`vf-${label}`, 22);
  const cx = W / 2;
  const cy = H * 0.48;
  const frameW = W * 0.84;
  const frameH = Math.min(H * 0.62, frameW * 1.3);
  const fx = cx - frameW / 2;
  const fy = cy - frameH / 2;

  const scene = () => {
    if (label === "ENCONTRO") {
      // duas pessoas se abraçando, contraluz quente
      return (
        <g>
          <ellipse cx={cx} cy={cy - H * 0.05} rx={W * 0.32} ry={H * 0.2} fill={colors.goldLight} opacity={0.5} />
          <path d={personPath(cx - W * 0.09, cy + H * 0.26, W * 0.42)} fill="#140d08" transform={`rotate(8 ${cx - W * 0.09} ${cy})`} />
          <path d={personPath(cx + W * 0.1, cy + H * 0.26, W * 0.4)} fill="#1a110b" transform={`rotate(-10 ${cx + W * 0.1} ${cy})`} />
        </g>
      );
    }
    if (label === "SANTA MISSA") {
      // altar ao fundo, assembleia em primeiro plano
      return (
        <g>
          <rect x={cx - W * 0.22} y={cy - H * 0.02} width={W * 0.44} height={H * 0.05} fill="#e9d2a2" opacity={0.75} />
          <rect x={cx - W * 0.006} y={cy - H * 0.18} width={W * 0.012} height={H * 0.15} fill="#2a1d12" />
          <rect x={cx - W * 0.05} y={cy - H * 0.15} width={W * 0.1} height={W * 0.012} fill="#2a1d12" />
          <path d={personPath(cx, cy + H * 0.0, W * 0.12)} fill="#2a1d12" />
          {Array.from({ length: 7 }).map((_, i) => (
            <path key={i} d={personPath(fx + frameW * (0.07 + i * 0.145), cy + H * 0.3, W * (0.2 + 0.03 * (i % 2)))} fill="#0d0907" />
          ))}
        </g>
      );
    }
    // ALTAR: cruz e velas
    return (
      <g>
        <rect x={cx - W * 0.008} y={cy - H * 0.17} width={W * 0.016} height={H * 0.22} fill="#3a2716" />
        <rect x={cx - W * 0.07} y={cy - H * 0.12} width={W * 0.14} height={W * 0.016} fill="#3a2716" />
        <rect x={cx - W * 0.3} y={cy + H * 0.06} width={W * 0.6} height={H * 0.06} fill="#e6d0a4" opacity={0.6} />
        {[-0.22, -0.12, 0.12, 0.22].map((k) => (
          <g key={k}>
            <rect x={cx + W * k - W * 0.008} y={cy + H * 0.0} width={W * 0.016} height={H * 0.06} fill="#efe2c6" />
            <ellipse cx={cx + W * k} cy={cy - H * 0.008} rx={W * 0.006} ry={W * 0.014} fill={colors.candle} />
          </g>
        ))}
      </g>
    );
  };

  const ex = locked ? 1 : 0;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="vf-bg" cx="50%" cy="42%" r="70%">
          <stop offset="0%" stopColor="#4a3420" />
          <stop offset="60%" stopColor="#1a120c" />
          <stop offset="100%" stopColor="#070506" />
        </radialGradient>
        <filter id="vf-focus" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={blur} />
        </filter>
        <filter id="vf-bokeh">
          <feGaussianBlur stdDeviation={W * 0.006 + focus * W * 0.01} />
        </filter>
        <clipPath id="vf-clip">
          <rect x={fx} y={fy} width={frameW} height={frameH} rx={W * 0.02} />
        </clipPath>
      </defs>
      <rect width={W} height={H} fill="#030304" />
      <g clipPath="url(#vf-clip)">
        <rect x={fx} y={fy} width={frameW} height={frameH} fill="url(#vf-bg)" />
        <g filter="url(#vf-bokeh)">
          {bokeh.map((b) => (
            <circle
              key={b.i}
              cx={fx + b.a * frameW}
              cy={fy + b.b * frameH * 0.7}
              r={W * (0.015 + 0.04 * b.c) * (0.6 + 0.6 * focus)}
              fill={b.d > 0.7 ? "#fff1d2" : colors.candle}
              opacity={0.12 + 0.2 * b.d}
            />
          ))}
        </g>
        <g filter="url(#vf-focus)">{scene()}</g>
        <rect x={fx} y={fy} width={frameW} height={frameH} fill="black" opacity={0.12} />
      </g>

      {/* moldura e informações do visor */}
      <rect x={fx} y={fy} width={frameW} height={frameH} rx={W * 0.02} fill="none" stroke="#000" strokeWidth={W * 0.01} />
      {[
        [fx + W * 0.05, fy + W * 0.05, 1, 1],
        [fx + frameW - W * 0.05, fy + W * 0.05, -1, 1],
        [fx + W * 0.05, fy + frameH - W * 0.05, 1, -1],
        [fx + frameW - W * 0.05, fy + frameH - W * 0.05, -1, -1],
      ].map(([x, y, sx, sy], i) => (
        <path key={i} d={`M ${x} ${y + sy * W * 0.05} L ${x} ${y} L ${x + sx * W * 0.05} ${y}`} stroke="#f4ead8" strokeOpacity={0.55} strokeWidth={W * 0.0025} fill="none" />
      ))}
      {[-1, 0, 1].map((gx) =>
        [-1, 0, 1].map((gy) => {
          const active = gx === 0 && gy === (label === "SANTA MISSA" ? -1 : 0);
          const s = W * 0.035;
          const x = cx + gx * W * 0.16;
          const y = cy + gy * H * 0.09;
          return (
            <rect
              key={`${gx}${gy}`}
              x={x - s / 2}
              y={y - s / 2}
              width={s}
              height={s}
              fill="none"
              stroke={active && locked ? colors.gold : "#f4ead8"}
              strokeOpacity={active ? 0.95 : 0.25}
              strokeWidth={W * (active ? 0.003 : 0.0018)}
            />
          );
        }),
      )}
      <g fontFamily={fonts.sans} fontSize={W * 0.026} fill="#f4ead8" opacity={0.8} letterSpacing={W * 0.002}>
        <text x={fx + W * 0.02} y={fy + frameH + W * 0.06}>1/125</text>
        <text x={fx + frameW * 0.27} y={fy + frameH + W * 0.06}>F2.8</text>
        <text x={fx + frameW * 0.5} y={fy + frameH + W * 0.06}>ISO 1600</text>
        <circle cx={fx + frameW - W * 0.03} cy={fy + frameH + W * 0.05} r={W * 0.011} fill={locked ? colors.gold : "#5b554c"} opacity={0.6 + 0.4 * ex * smoothNoise("vf", t * 3)} />
      </g>
    </svg>
  );
};
