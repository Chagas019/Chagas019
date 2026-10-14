import { useCurrentFrame, interpolate } from "remotion";
import { NARRATION_CAPTIONS } from "../config/captions";
import { BRAND } from "../config/brand";
import { WIDTH } from "../config/timeline";

// Legendas da narração. Ficam na faixa média-inferior, acima da área que a interface
// do Reels ocupa, com fundo translúcido para garantir leitura sobre qualquer imagem.
export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const active = NARRATION_CAPTIONS.find((c) => frame >= c.from && frame < c.to);
  if (!active) return null;
  const fade = interpolate(frame, [active.from, active.from + 6, active.to - 8, active.to], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 1150,
        display: "flex",
        justifyContent: "center",
        opacity: fade,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: WIDTH - 200,
          padding: "28px 40px",
          borderRadius: 10,
          background: "rgba(6, 16, 31, 0.56)",
          backdropFilter: "blur(10px)",
          fontFamily: BRAND.fonts.text,
          fontWeight: 500,
          fontSize: 40,
          lineHeight: 1.36,
          letterSpacing: "0.01em",
          textAlign: "center",
          color: BRAND.colors.ivory,
          textShadow: "0 2px 14px rgba(0,0,0,0.5)",
        }}
      >
        {active.text}
      </div>
    </div>
  );
};
