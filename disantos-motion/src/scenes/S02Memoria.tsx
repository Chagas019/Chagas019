import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, Grain, Vignette } from "../components/Backdrop";
import { LightBeam } from "../components/LightBeam";
import { Particles } from "../components/Particles";
import { KineticText } from "../components/KineticText";
import { BRAND as B } from "../config/brand";
import { ProductPlate } from "../components/ProductPlate";
import { BRAND } from "../config/brand";
import { fall, rise } from "../lib/motion";

// CENA 02 — A MEMÓRIA (3–7 s)
// Abertura por máscara circular. A foto da estampa entra em macro e recua (dolly-out),
// com foco que se fecha (rack focus) e uma passagem de luz.
export const S02Memoria: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = rise(frame, 0, 24);
  const maskRadius = reveal * 1400;
  const zoom = 1.32 - 0.32 * rise(frame, 0, 150);
  const parallaxX = 30 - 60 * rise(frame, 0, 150); // a imagem se desloca mais devagar que a luz
  const focus = Math.max(0, 1 - frame / 28);
  const dim = rise(frame, 96, 24) * 0.45;

  return (
    <AbsoluteFill style={{ clipPath: `circle(${maskRadius}px at 50% 50%)` }}>
      <Backdrop />
      <ProductPlate slot="macroEstampa" scale={zoom} translateX={parallaxX} focus="50% 44%" blur={focus * 9} dim={dim} />
      <LightBeam progress={rise(frame, 34, 60)} color={BRAND.colors.ivory} intensity={0.32} width={240} angle={-24} />
      <Particles count={28} seed={23} color={BRAND.colors.gold} speed={0.8} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", fontFamily: B.fonts.display, fontStyle: "italic", fontSize: 84, lineHeight: 1.12, color: B.colors.ivory, opacity: fall(frame, 116, 14) }}>
        <div><KineticText text="A fé que vestimos." start={56} stagger={1.1} duration={24} /></div>
        <div><KineticText text="A história que carregamos." start={72} stagger={0.9} duration={24} /></div>
      </div>
      <Vignette strength={0.6} />
      <Grain opacity={0.07} />
    </AbsoluteFill>
  );
};
