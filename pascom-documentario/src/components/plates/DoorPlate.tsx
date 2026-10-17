import React from "react";
import { interpolate, Easing } from "remotion";
import { colors } from "../../theme";
import { PlateProps, seeded } from "./util";

/** Uma porta pesada se abre: a luz da manhã entra na igreja escura. */
export const DoorPlate: React.FC<PlateProps> = ({ progress, frame, width: W, height: H }) => {
  const open = interpolate(progress, [0.06, 0.75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.45, 0, 0.2, 1),
  });
  const cx = W * 0.5;
  const doorW = W * 0.5;
  const doorTop = H * 0.2;
  const doorBottom = H * 0.74;
  const gap = doorW * open * 0.92;
  const archR = doorW / 2;
  const t = frame / 30;
  const motes = seeded("door-dust", 26);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="dp-out" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6e2" />
          <stop offset="100%" stopColor={colors.goldLight} />
        </linearGradient>
        <linearGradient id="dp-spill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.goldLight} stopOpacity={0.55} />
          <stop offset="100%" stopColor={colors.gold} stopOpacity={0} />
        </linearGradient>
        <filter id="dp-bloom" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={W * 0.045} />
        </filter>
        <filter id="dp-soft">
          <feGaussianBlur stdDeviation={W * 0.006} />
        </filter>
        <clipPath id="dp-opening">
          <path d={`M ${cx - archR} ${doorBottom} L ${cx - archR} ${doorTop + archR} A ${archR} ${archR} 0 0 1 ${cx + archR} ${doorTop + archR} L ${cx + archR} ${doorBottom} Z`} />
        </clipPath>
      </defs>
      <rect width={W} height={H} fill={colors.night} />

      {/* moldura de pedra */}
      <path
        d={`M ${cx - archR * 1.18} ${doorBottom} L ${cx - archR * 1.18} ${doorTop + archR} A ${archR * 1.18} ${archR * 1.18} 0 0 1 ${cx + archR * 1.18} ${doorTop + archR} L ${cx + archR * 1.18} ${doorBottom} Z`}
        fill="#16120f"
        opacity={0.4 + 0.6 * open}
      />

      {/* exterior luminoso visto pela fresta */}
      <g clipPath="url(#dp-opening)">
        <rect x={cx - gap / 2} y={doorTop} width={gap} height={doorBottom - doorTop} fill="url(#dp-out)" />
        {/* folhas da porta, em perspectiva, girando para dentro */}
        <path
          d={`M ${cx - archR} ${doorTop} L ${cx - gap / 2} ${doorTop + H * 0.02 * open} L ${cx - gap / 2} ${doorBottom + H * 0.01 * open} L ${cx - archR} ${doorBottom} Z`}
          fill="#1b130d"
        />
        <path
          d={`M ${cx + archR} ${doorTop} L ${cx + gap / 2} ${doorTop + H * 0.02 * open} L ${cx + gap / 2} ${doorBottom + H * 0.01 * open} L ${cx + archR} ${doorBottom} Z`}
          fill="#1b130d"
        />
        {/* tábuas e ferragens */}
        {[0.25, 0.5, 0.75].map((k) => (
          <React.Fragment key={k}>
            <line x1={cx - archR + (archR - gap / 2) * k} y1={doorTop} x2={cx - archR + (archR - gap / 2) * k} y2={doorBottom} stroke="#0d0906" strokeWidth={W * 0.003} />
            <line x1={cx + archR - (archR - gap / 2) * k} y1={doorTop} x2={cx + archR - (archR - gap / 2) * k} y2={doorBottom} stroke="#0d0906" strokeWidth={W * 0.003} />
          </React.Fragment>
        ))}
        {/* borda iluminada das folhas */}
        <rect x={cx - gap / 2 - W * 0.004} y={doorTop} width={W * 0.004} height={doorBottom - doorTop} fill={colors.goldLight} opacity={0.6 * open} />
        <rect x={cx + gap / 2} y={doorTop} width={W * 0.004} height={doorBottom - doorTop} fill={colors.goldLight} opacity={0.6 * open} />
      </g>

      {/* brilho da luz entrando */}
      <rect x={cx - gap / 2} y={doorTop} width={gap} height={doorBottom - doorTop} fill={colors.goldLight} opacity={0.55 * open} filter="url(#dp-bloom)" style={{ mixBlendMode: "screen" }} />

      {/* luz derramada no chão da nave */}
      <path
        d={`M ${cx - gap / 2} ${doorBottom} L ${cx + gap / 2} ${doorBottom} L ${cx + gap * 1.6} ${H} L ${cx - gap * 1.6} ${H} Z`}
        fill="url(#dp-spill)"
        opacity={open}
        filter="url(#dp-soft)"
      />

      {/* poeira levantada pela porta */}
      {motes.map((m) => {
        const y = doorBottom - (m.a * (doorBottom - doorTop) * 0.9 + t * H * 0.004 * m.b) % ((doorBottom - doorTop) * 0.9);
        const x = cx + (m.c - 0.5) * gap * 1.1 + Math.sin(t * 0.8 + m.d * 7) * W * 0.006;
        return <circle key={m.i} cx={x} cy={y} r={W * 0.0018 * (0.5 + m.b)} fill="#fff3d6" opacity={0.6 * open * m.d} />;
      })}
    </svg>
  );
};
