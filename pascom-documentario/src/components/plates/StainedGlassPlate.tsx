import React from "react";
import { colors } from "../../theme";
import { PlateProps, seeded, smoothNoise } from "./util";

const PANE_COLORS = [colors.glassBlue, colors.glassRuby, colors.glassAmber, colors.glassGreen, colors.glassViolet, colors.glassBlue];

/** Igreja vazia: vitral gótico, feixes de luz e poeira suspensa dentro dos feixes. */
export const StainedGlassPlate: React.FC<PlateProps> = ({ progress, frame, width: W, height: H, props }) => {
  const intensity = (props.intensity as number) ?? 0.8;
  const t = frame / 30;
  const wx = W * 0.5;
  const ww = Math.min(W, H) * 0.42;
  const top = H * 0.08;
  const bottom = top + ww * 2.2;
  const archY = top + ww * 0.62;
  const arch = `M ${wx - ww / 2} ${bottom} L ${wx - ww / 2} ${archY} Q ${wx - ww / 2} ${top} ${wx} ${top} Q ${wx + ww / 2} ${top} ${wx + ww / 2} ${archY} L ${wx + ww / 2} ${bottom} Z`;
  const cols = 4;
  const rows = 9;
  const cw = ww / cols;
  const rh = (bottom - top) / rows;
  const shimmer = 0.85 + 0.15 * smoothNoise("glass", t * 0.6);
  const rays = seeded("ray", 7);
  const dust = seeded("dust", 46);
  const beamAngle = 0.32; // inclinação dos feixes
  const floorY = H * 0.88;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="sg-bg" cx="50%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#2a2118" />
          <stop offset="45%" stopColor="#120e0b" />
          <stop offset="100%" stopColor={colors.night} />
        </radialGradient>
        <clipPath id="sg-arch">
          <path d={arch} />
        </clipPath>
        <linearGradient id="sg-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.goldLight} stopOpacity={0.55 * intensity} />
          <stop offset="60%" stopColor={colors.gold} stopOpacity={0.16 * intensity} />
          <stop offset="100%" stopColor={colors.gold} stopOpacity={0} />
        </linearGradient>
        <filter id="sg-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={W * 0.012} />
        </filter>
        <filter id="sg-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={W * 0.03} />
        </filter>
      </defs>
      <rect width={W} height={H} fill="url(#sg-bg)" />

      {/* paredes de pedra: duas colunas escuras em primeiro plano */}
      <rect x={0} y={0} width={W * 0.13} height={H} fill="#070608" />
      <rect x={W * 0.87} y={0} width={W * 0.13} height={H} fill="#070608" />

      {/* brilho atrás do vitral */}
      <path d={arch} fill={colors.goldLight} opacity={0.35 * intensity * shimmer} filter="url(#sg-glow)" />

      {/* vitral */}
      <g clipPath="url(#sg-arch)">
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((__, c) => {
            const idx = (r * 3 + c * 5 + (r % 2)) % PANE_COLORS.length;
            const pulse = 0.75 + 0.25 * smoothNoise(`p${r}-${c}`, t * 0.4);
            return (
              <rect
                key={`${r}-${c}`}
                x={wx - ww / 2 + c * cw}
                y={top + r * rh}
                width={cw}
                height={rh}
                fill={PANE_COLORS[idx]}
                opacity={(0.55 + 0.4 * pulse) * intensity}
              />
            );
          }),
        )}
        <circle cx={wx} cy={top + ww * 0.55} r={ww * 0.26} fill={colors.glassAmber} opacity={0.9 * intensity} />
        <circle cx={wx} cy={top + ww * 0.55} r={ww * 0.12} fill={colors.goldLight} opacity={0.85 * intensity} />
        {/* chumbo do vitral */}
        {Array.from({ length: cols + 1 }).map((_, c) => (
          <line key={`v${c}`} x1={wx - ww / 2 + c * cw} y1={top} x2={wx - ww / 2 + c * cw} y2={bottom} stroke="#0a0806" strokeWidth={W * 0.006} />
        ))}
        {Array.from({ length: rows + 1 }).map((_, r) => (
          <line key={`h${r}`} x1={wx - ww / 2} y1={top + r * rh} x2={wx + ww / 2} y2={top + r * rh} stroke="#0a0806" strokeWidth={W * 0.006} />
        ))}
        <circle cx={wx} cy={top + ww * 0.55} r={ww * 0.26} fill="none" stroke="#0a0806" strokeWidth={W * 0.007} />
        {/* cruz no medalhão central */}
        <rect x={wx - ww * 0.012} y={top + ww * 0.38} width={ww * 0.024} height={ww * 0.34} fill="#0a0806" />
        <rect x={wx - ww * 0.11} y={top + ww * 0.49} width={ww * 0.22} height={ww * 0.024} fill="#0a0806" />
      </g>
      <path d={arch} fill="none" stroke="#050405" strokeWidth={W * 0.02} />

      {/* feixes de luz */}
      <g style={{ mixBlendMode: "screen" }} filter="url(#sg-soft)">
        {rays.map((r) => {
          const x0 = wx - ww / 2 + (r.i + 0.5) * (ww / rays.length);
          const len = H * (0.9 + 0.2 * r.a);
          const spread = ww * (0.05 + 0.06 * r.b);
          const drift = Math.sin(t * 0.25 + r.c * 6) * W * 0.004;
          const x1 = x0 + len * beamAngle + drift;
          const op = (0.5 + 0.5 * smoothNoise(`ray${r.i}`, t * 0.35)) * shimmer;
          return (
            <path
              key={r.i}
              d={`M ${x0 - spread * 0.4} ${top + ww * 0.6} L ${x0 + spread * 0.4} ${top + ww * 0.6} L ${x1 + spread * 3} ${top + len} L ${x1 - spread * 3} ${top + len} Z`}
              fill="url(#sg-beam)"
              opacity={op}
            />
          );
        })}
      </g>

      {/* luz colorida projetada no chão */}
      <g filter="url(#sg-glow)" opacity={0.45 * intensity}>
        {[0, 1, 2, 3].map((k) => (
          <ellipse
            key={k}
            cx={wx + H * 0.32 * beamAngle * 1.7 - ww * 0.3 + k * ww * 0.22}
            cy={floorY}
            rx={ww * 0.16}
            ry={H * 0.025}
            fill={PANE_COLORS[k + 1]}
          />
        ))}
      </g>

      {/* poeira: só onde a luz alcança */}
      {dust.map((d) => {
        const along = (d.a + t * 0.012 * (0.5 + d.b)) % 1;
        const y = top + ww * 0.7 + along * H * 0.75;
        const x = wx - ww * 0.45 + d.c * ww * 0.9 + (y - top) * beamAngle + Math.sin(t * 0.7 + d.d * 9) * W * 0.008;
        const tw = 0.4 + 0.6 * smoothNoise(`d${d.i}`, t * 1.3);
        return <circle key={d.i} cx={x} cy={y} r={W * (0.0012 + 0.0022 * d.b)} fill={colors.goldLight} opacity={tw * 0.75 * intensity} />;
      })}

      {/* piso */}
      <rect x={0} y={floorY} width={W} height={H - floorY} fill="#0a0807" opacity={0.75} />
      <rect width={W} height={H} fill="black" opacity={0.15 * (1 - progress)} />
    </svg>
  );
};
