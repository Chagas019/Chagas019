import { useCurrentFrame } from "remotion";
import { BRAND } from "../config/brand";
import { rise, fall } from "../lib/motion";

// Palavra-carimbo: entra grande e desfocada, assenta no tamanho final com o espaçamento
// das letras se fechando e uma linha dourada que se abre por baixo. Sai pelo `end`.
export const StampWord: React.FC<{
  text: string;
  start: number;
  end: number;
  size?: number;
  top?: number;
}> = ({ text, start, end, size = 150, top = 260 }) => {
  const frame = useCurrentFrame();
  const p = rise(frame, start, 22);
  const out = fall(frame, end - 10, 10);
  const line = rise(frame, start + 12, 26);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top,
        textAlign: "center",
        opacity: p * out,
        transform: `scale(${1.35 - 0.35 * p})`,
        filter: `blur(${(1 - p) * 14}px)`,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "inline-block",
          fontFamily: BRAND.fonts.display,
          fontWeight: 500,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: `${0.42 - 0.3 * p}em`,
          color: BRAND.colors.ivory,
          textTransform: "uppercase",
        }}
      >
        {text}
      </div>
      <div
        style={{
          margin: "18px auto 0",
          width: 360 * line,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${BRAND.colors.gold}, transparent)`,
        }}
      />
    </div>
  );
};
