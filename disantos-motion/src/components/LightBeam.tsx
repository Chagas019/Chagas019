import { AbsoluteFill } from "remotion";
import { BRAND } from "../config/brand";

// Faixa de luz diagonal que atravessa o quadro. `progress` vai de 0 a 1.
// Usa blend "screen" para parecer luz real sobre o tecido, não uma forma colada.
export const LightBeam: React.FC<{
  progress: number;
  color?: string;
  angle?: number;
  intensity?: number;
  width?: number;
}> = ({ progress, color = BRAND.colors.blueLight, angle = -18, intensity = 0.5, width = 260 }) => {
  const x = -60 + progress * 220; // percentual de deslocamento horizontal
  const alpha = Math.sin(Math.min(1, Math.max(0, progress)) * Math.PI) * intensity;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      <div
        style={{
          position: "absolute",
          left: `${x}%`,
          top: "-30%",
          width: `${width}px`,
          height: "160%",
          transform: `rotate(${angle}deg)`,
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
          opacity: alpha,
          filter: "blur(28px)",
        }}
      />
    </AbsoluteFill>
  );
};

// Linha de luz fina (a "linha azul" do despertar). `progress` de 0 a 1 cresce do centro.
export const LightLine: React.FC<{ progress: number; y: number; width?: number }> = ({
  progress,
  y,
  width = 920,
}) => (
  <div
    style={{
      position: "absolute",
      left: "50%",
      top: y,
      width,
      height: 2,
      transform: `translateX(-50%) scaleX(${progress})`,
      background: `linear-gradient(90deg, transparent, ${BRAND.colors.blueLight}, #FFFFFF, ${BRAND.colors.blueLight}, transparent)`,
      boxShadow: `0 0 18px 3px ${BRAND.colors.blueGlow}`,
      opacity: 0.95,
    }}
  />
);
