import React from "react";
import { colors } from "../../theme";
import { PlateProps, seeded, smoothNoise } from "./util";

/** Velas acesas em profundidade; opcionalmente o ostensório ao fundo (adoração eucarística). */
export const CandlesPlate: React.FC<PlateProps> = ({ frame, width: W, height: H, props }) => {
  const monstrance = Boolean(props.monstrance);
  const t = frame / 30;
  const back = seeded("cand-back", 18);
  const candles = [
    { x: 0.2, base: 0.9, s: 1.25, blur: 0.012 },
    { x: 0.78, base: 0.95, s: 1.45, blur: 0.016 },
    { x: 0.36, base: 0.78, s: 0.85, blur: 0 },
    { x: 0.58, base: 0.75, s: 0.75, blur: 0 },
    { x: 0.47, base: 0.7, s: 0.55, blur: 0.002 },
    { x: 0.68, base: 0.68, s: 0.5, blur: 0.004 },
    { x: 0.27, base: 0.66, s: 0.45, blur: 0.005 },
  ];
  const mx = W * 0.5;
  const my = H * 0.3;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="cp-bg" cx="50%" cy="40%" r="80%">
          <stop offset="0%" stopColor="#24170d" />
          <stop offset="100%" stopColor="#050304" />
        </radialGradient>
        <radialGradient id="cp-flame" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#fff0c2" />
          <stop offset="75%" stopColor={colors.candle} />
          <stop offset="100%" stopColor="#e07a24" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="cp-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.candle} stopOpacity={0.55} />
          <stop offset="100%" stopColor={colors.candle} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="cp-wax" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8d7d66" />
          <stop offset="45%" stopColor="#f3e8d2" />
          <stop offset="100%" stopColor="#6d604f" />
        </linearGradient>
        <filter id="cp-far">
          <feGaussianBlur stdDeviation={W * 0.014} />
        </filter>
        {candles.map((c, i) => (
          <filter key={i} id={`cp-b${i}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={Math.max(0.001, c.blur * W)} />
          </filter>
        ))}
      </defs>
      <rect width={W} height={H} fill="url(#cp-bg)" />

      {monstrance && (
        <g opacity={0.9}>
          <circle cx={mx} cy={my} r={W * 0.36} fill="url(#cp-glow)" />
          {Array.from({ length: 36 }).map((_, i) => {
            const a = (i / 36) * Math.PI * 2;
            const len = W * (i % 2 ? 0.17 : 0.22);
            return <line key={i} x1={mx + Math.cos(a) * W * 0.07} y1={my + Math.sin(a) * W * 0.07} x2={mx + Math.cos(a) * len} y2={my + Math.sin(a) * len} stroke={colors.gold} strokeWidth={W * 0.005} opacity={0.7} />;
          })}
          <circle cx={mx} cy={my} r={W * 0.065} fill="#fffaf0" />
          <circle cx={mx} cy={my} r={W * 0.075} fill="none" stroke={colors.gold} strokeWidth={W * 0.008} />
          <path d={`M ${mx - W * 0.012} ${my + W * 0.22} L ${mx + W * 0.012} ${my + W * 0.22} L ${mx + W * 0.06} ${my + W * 0.42} L ${mx - W * 0.06} ${my + W * 0.42} Z`} fill={colors.ember} />
        </g>
      )}

      {/* luzes distantes fora de foco */}
      <g filter="url(#cp-far)">
        {back.map((b) => (
          <circle
            key={b.i}
            cx={b.a * W}
            cy={H * (0.45 + b.b * 0.25)}
            r={W * (0.02 + 0.03 * b.c)}
            fill={colors.candle}
            opacity={(0.18 + 0.25 * b.d) * (0.8 + 0.2 * smoothNoise(`bk${b.i}`, t * 2))}
          />
        ))}
      </g>

      {candles
        .slice()
        .sort((a, b) => a.s - b.s)
        .map((c) => {
          const i = candles.indexOf(c);
          const x = c.x * W;
          const cw = W * 0.07 * c.s;
          const top = H * c.base - H * 0.22 * c.s;
          const flick = smoothNoise(`fl${i}`, t * 7);
          const sway = (smoothNoise(`sw${i}`, t * 2.2) - 0.5) * cw * 0.25;
          const fh = cw * (1.15 + 0.25 * flick);
          return (
            <g key={i} filter={c.blur ? `url(#cp-b${i})` : undefined}>
              <circle cx={x} cy={top - fh * 0.4} r={cw * 3.2} fill="url(#cp-glow)" opacity={0.8 + 0.2 * flick} />
              <rect x={x - cw / 2} y={top} width={cw} height={H * c.base - top + H * 0.2} fill="url(#cp-wax)" />
              <ellipse cx={x} cy={top} rx={cw / 2} ry={cw * 0.12} fill="#fbf2df" />
              <line x1={x} y1={top} x2={x + sway * 0.2} y2={top - cw * 0.18} stroke="#1a120c" strokeWidth={cw * 0.05} />
              <path
                d={`M ${x + sway * 0.2} ${top - cw * 0.1} C ${x - cw * 0.22} ${top - fh * 0.35}, ${x - cw * 0.12 + sway} ${top - fh * 0.85}, ${x + sway} ${top - fh} C ${x + cw * 0.12 + sway} ${top - fh * 0.85}, ${x + cw * 0.22} ${top - fh * 0.35}, ${x + sway * 0.2} ${top - cw * 0.1} Z`}
                fill="url(#cp-flame)"
              />
            </g>
          );
        })}
      <rect y={H * 0.92} width={W} height={H * 0.08} fill="#050304" opacity={0.8} />
    </svg>
  );
};
