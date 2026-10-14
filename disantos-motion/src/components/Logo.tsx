import { Img, staticFile, useCurrentFrame } from "remotion";
import { BRAND } from "../config/brand";
import { hasLogo, LOGO_FILE } from "../config/assets";
import { rise } from "../lib/motion";
import { KineticText } from "./KineticText";

// Selo da marca: a logo original sobre o círculo branco, do mesmo jeito que aparece no perfil.
// `progress` (0–1) controla a revelação; `sweep` (0–1) é a passagem de luz sobre o selo.
// A logo nunca é recolorida nem recortada: só a posição e a luz mudam.
export const LogoBadge: React.FC<{
  diameter: number;
  progress: number;
  sweep?: number;
}> = ({ diameter, progress, sweep }) => {
  const logoWidth = diameter * 0.66;
  return (
    <div
      style={{
        position: "relative",
        width: diameter,
        height: diameter,
        borderRadius: "50%",
        background: "#FFFFFF",
        overflow: "hidden",
        boxShadow: `0 0 ${diameter * 0.35}px rgba(110,159,224,${0.18 * progress}), 0 ${diameter * 0.06}px ${diameter * 0.2}px rgba(0,0,0,0.55)`,
        transform: `scale(${0.94 + 0.06 * progress})`,
      }}
    >
      <Img
        src={staticFile(LOGO_FILE)}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: logoWidth,
          transform: "translate(-50%, -50%)",
          opacity: progress,
          filter: `blur(${(1 - progress) * 8}px)`,
        }}
      />
      {sweep !== undefined && sweep > 0 && sweep < 1 && (
        <div
          style={{
            position: "absolute",
            top: "-30%",
            left: `${-40 + sweep * 150}%`,
            width: "34%",
            height: "160%",
            transform: "rotate(-20deg)",
            background: `linear-gradient(90deg, transparent, rgba(110,159,224,0.42), transparent)`,
            mixBlendMode: "multiply",
          }}
        />
      )}
    </div>
  );
};

// Marca: selo com a logo oficial quando o arquivo existe; senão, o nome em tipografia.
export const Logo: React.FC<{ start: number; size?: number }> = ({ start, size = 150 }) => {
  const frame = useCurrentFrame();
  if (hasLogo) {
    return <LogoBadge diameter={size * 3.7} progress={rise(frame, start, 36)} sweep={rise(frame, start + 6, 52)} />;
  }
  return (
    <KineticText
      text="DISANTOS"
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
