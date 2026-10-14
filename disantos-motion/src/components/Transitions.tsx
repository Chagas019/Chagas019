import { AbsoluteFill, interpolate } from "remotion";
import { BRAND } from "../config/brand";

// Pulso de luz no corte: o quadro clareia em poucos frames e volta. Vai no topo da composição,
// então vale para qualquer cena. `frame` é o frame absoluto da composição.
export const FlashCut: React.FC<{ frame: number; at: number; peak?: number }> = ({ frame, at, peak = 0.9 }) => {
  const o = interpolate(frame, [at - 4, at, at + 4, at + 14], [0, peak, peak * 0.3, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (o <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 70% 50% at 50% 46%, #E8F1FF 0%, ${BRAND.colors.blueLight} 38%, transparent 78%)`,
        opacity: o,
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}
    />
  );
};

// Vazamento de luz diagonal que atravessa o quadro ao redor do corte. `dir` troca o sentido.
export const LightLeak: React.FC<{ frame: number; at: number; dir?: 1 | -1; color?: string }> = ({
  frame,
  at,
  dir = 1,
  color = BRAND.colors.gold,
}) => {
  const p = interpolate(frame, [at - 6, at + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (p <= 0 || p >= 1) return null;
  const x = dir === 1 ? -50 + p * 150 : 150 - p * 150;
  const alpha = Math.sin(p * Math.PI) * 0.5;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: `${x}%`,
          width: 320,
          height: "140%",
          transform: `rotate(${dir === 1 ? -28 : 28}deg)`,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: alpha,
          filter: "blur(34px)",
        }}
      />
    </AbsoluteFill>
  );
};

// Linha dourada que atravessa o quadro de lado a lado no corte.
export const SweepLine: React.FC<{ frame: number; at: number; y?: number }> = ({ frame, at, y = 960 }) => {
  const p = interpolate(frame, [at - 2, at + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (p <= 0 || p >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 0,
        width: "100%",
        height: 2,
        background: `linear-gradient(90deg, transparent, ${BRAND.colors.gold}, #FFFFFF, ${BRAND.colors.gold}, transparent)`,
        transform: `translateX(${-100 + 200 * p}%)`,
        boxShadow: `0 0 16px 2px rgba(240,166,42,0.35)`,
        opacity: Math.sin(p * Math.PI),
        pointerEvents: "none",
      }}
    />
  );
};
