import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, Grain, Vignette } from "../components/Backdrop";
import { LightBeam } from "../components/LightBeam";
import { Logo } from "../components/Logo";
import { BRAND } from "../config/brand";
import { rise } from "../lib/motion";
import { HEIGHT, WIDTH } from "../config/timeline";

// CENA 05 — ASSINATURA FINAL (16–20 s)
// A máscara abre sobre fundo escuro. A marca entra centralizada com uma passagem de luz,
// a linha dourada se estende, e a assinatura aparece abaixo. O quadro termina com a marca.
export const S05Assinatura: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = rise(frame, 0, 26);
  const maskRadius = reveal * 1500;
  const rule = rise(frame, 50, 34);
  const signature = rise(frame, 72, 30);
  const center = HEIGHT / 2 - 90;

  return (
    <AbsoluteFill style={{ clipPath: `circle(${maskRadius}px at 50% 50%)` }}>
      <Backdrop />
      <LightBeam progress={rise(frame, 18, 54)} color={BRAND.colors.ivory} intensity={0.28} width={320} angle={-10} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", top: center - 110, width: "100%", display: "flex", justifyContent: "center" }}>
          <Logo start={20} size={150} />
        </div>
        <div
          style={{
            position: "absolute",
            top: center + 118,
            width: 420 * rule,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${BRAND.colors.gold}, transparent)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: center + 160,
            width: WIDTH - 160,
            textAlign: "center",
            fontFamily: BRAND.fonts.display,
            fontStyle: "italic",
            fontSize: 56,
            color: BRAND.colors.ivoryDim,
            opacity: signature,
            transform: `translateY(${(1 - signature) * 14}px)`,
          }}
        >
          {BRAND.signature}
        </div>
      </AbsoluteFill>
      <Vignette strength={0.65} />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};
