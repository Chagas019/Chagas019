import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, Grain, Vignette } from "../components/Backdrop";
import { LightBeam, LightLine } from "../components/LightBeam";
import { ProductPlate } from "../components/ProductPlate";
import { KineticText } from "../components/KineticText";
import { BRAND } from "../config/brand";
import { rise } from "../lib/motion";
import type { ProductSlot } from "../config/assets";

// CENA 03 — A IDENTIDADE (7–12 s)
// Cortes rítmicos entre os produtos. Cada corte é uma varredura horizontal com flash de
// luz, panorâmica e uma palavra-carimbo. Depois vêm as frases da identidade.
const SHOTS: { slot: ProductSlot; from: number; length: number; pan: number; scale: number; focus: string }[] = [
  { slot: "frenteCamiseta", from: 0, length: 22, pan: -46, scale: 1.16, focus: "50% 40%" },
  { slot: "detalheTecido", from: 22, length: 20, pan: 38, scale: 1.3, focus: "40% 55%" },
  { slot: "detalheGola", from: 42, length: 22, pan: -30, scale: 1.2, focus: "60% 30%" },
  { slot: "macroEstampa", from: 64, length: 22, pan: 34, scale: 1.25, focus: "50% 50%" },
  { slot: "frenteCamiseta", from: 86, length: 30, pan: -20, scale: 1.08, focus: "50% 36%" },
];

export const S03Identidade: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = rise(frame, 0, 16);
  const shot = SHOTS.find((s) => frame >= s.from && frame < s.from + s.length) ?? SHOTS[SHOTS.length - 1];
  const local = frame - shot.from;
  const cutIn = rise(local, 0, 9);
  const drift = shot.pan * (local / shot.length);
  const scale = shot.scale - 0.06 * rise(local, 0, shot.length) + 0.05 * (1 - cutIn);

  const textOut = 1 - rise(frame, 150, 12);
  const dim = 0.32 + 0.22 * rise(frame, 36, 40);

  return (
    <AbsoluteFill style={{ clipPath: `inset(0 ${(1 - enter) * 100}% 0 0)` }}>
      <Backdrop tint="navy" />
      <AbsoluteFill style={{ clipPath: `inset(0 ${(1 - cutIn) * 100}% 0 0)` }}>
        <ProductPlate slot={shot.slot} scale={scale} translateX={drift} focus={shot.focus} dim={dim} />
      </AbsoluteFill>
      <LightBeam progress={cutIn} color={BRAND.colors.blueLight} intensity={0.5 * (1 - local / 14)} width={200} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 42% at 50% 50%, rgba(3,4,6,0.78), rgba(3,4,6,0) 70%)` }} />


      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: textOut }}>
        <div style={{ position: "absolute", top: 760, width: "100%", textAlign: "center", fontFamily: BRAND.fonts.display, fontStyle: "italic", fontSize: 60, color: BRAND.colors.ivoryDim }}>
          <KineticText text="Não é apenas uma camiseta." start={38} stagger={0.9} duration={22} />
        </div>
        <LightLine progress={rise(frame, 60, 28)} y={846} width={520} />
        <div style={{ position: "absolute", top: 880, width: "100%", textAlign: "center", fontFamily: BRAND.fonts.display, fontWeight: 500, fontSize: 116, lineHeight: 1.04, color: BRAND.colors.ivory }}>
          <div><KineticText text="É fé." start={92} stagger={1.5} duration={20} /></div>
          <div><KineticText text="É história." start={106} stagger={1.5} duration={20} /></div>
          <div><KineticText text="É identidade." start={120} stagger={1.5} duration={20} /></div>
        </div>
      </AbsoluteFill>
      <Vignette strength={0.7} />
      <Grain opacity={0.07} />
    </AbsoluteFill>
  );
};
