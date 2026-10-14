import { Img, staticFile, useCurrentFrame } from "remotion";
import { BRAND } from "../config/brand";
import { hasLogo, LOGO_FILE } from "../config/assets";
import { rise } from "../lib/motion";
import { KineticText } from "./KineticText";

// Marca DISANTOS. Se public/marca/logo.png existir, usa a logo original (sem alterações).
// Enquanto não existir, mostra o nome em tipografia, sem inventar símbolo ou cruz.
export const Logo: React.FC<{ start: number; size?: number }> = ({ start, size = 150 }) => {
  const frame = useCurrentFrame();
  if (hasLogo) {
    const p = rise(frame, start, 36);
    return (
      <Img
        src={staticFile(LOGO_FILE)}
        style={{
          width: size * 3.4,
          opacity: p,
          filter: `blur(${(1 - p) * 10}px)`,
          transform: `scale(${1.06 - 0.06 * p})`,
        }}
      />
    );
  }
  return (
    <KineticText
      text={BRAND.name}
      start={start}
      stagger={2.2}
      duration={30}
      style={{
        fontFamily: BRAND.fonts.display,
        fontWeight: 400,
        fontSize: size,
        letterSpacing: "0.12em",
        color: BRAND.colors.ivory,
        lineHeight: 1,
      }}
    />
  );
};
