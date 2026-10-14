import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BRAND } from "../config/brand";

// Grão de filme em SVG (feTurbulence), animado por deslocamento discreto do frame.
// Não usa Math.random: o mesmo frame sempre gera o mesmo grão.
const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const frame = useCurrentFrame();
  const x = (frame * 37) % 240;
  const y = (frame * 61) % 240;
  return (
    <AbsoluteFill
      style={{
        backgroundImage: GRAIN,
        backgroundSize: "240px 240px",
        transform: `translate(${-x}px, ${-y}px)`,
        opacity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

// Fundo preto com cone de luz quente e vinheta. Base de todas as cenas.
export const Backdrop: React.FC<{ tint?: "navy" | "black" }> = ({ tint = "black" }) => (
  <AbsoluteFill
    style={{
      background:
        tint === "navy"
          ? `radial-gradient(ellipse 80% 60% at 50% 42%, ${BRAND.colors.navyMid} 0%, ${BRAND.colors.navy} 38%, ${BRAND.colors.black} 100%)`
          : `radial-gradient(ellipse 70% 55% at 50% 45%, #0A1426 0%, ${BRAND.colors.black} 70%)`,
    }}
  />
);

// Vinheta de acabamento: escurece as bordas e mantém o olhar no centro do quadro.
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 75% 65% at 50% 46%, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);
