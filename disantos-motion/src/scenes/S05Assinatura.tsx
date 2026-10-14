import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, Grain, Vignette } from "../components/Backdrop";
import { LightBeam, LightLine } from "../components/LightBeam";
import { Logo } from "../components/Logo";
import { BRAND } from "../config/brand";
import { rise } from "../lib/motion";
import { HEIGHT, WIDTH } from "../config/timeline";

// CENA 05 — ASSINATURA FINAL (16–20 s)
// A máscara abre sobre fundo escuro. O selo entra centralizado com passagem de luz, a
// linha dourada se estende e a assinatura aparece abaixo. O quadro termina com a marca.
export const S05Assinatura: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = rise(frame, 0, 26);
  const iris = (1 - reveal) * 50;
  const rule = rise(frame, 56, 34);
  const signature = rise(frame, 76, 30);
  const badgeCenter = HEIGHT / 2 - 160;

  return (
    <AbsoluteFill style={{ clipPath: `inset(${iris}% ${iris}% ${iris}% ${iris}% round ${(1 - reveal) * 240}px)` }}>
      <Backdrop />
      <LightBeam progress={rise(frame, 6, 60)} color={BRAND.colors.gold} intensity={0.16} width={420} angle={-12} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start" }}>
        <div style={{ position: "absolute", top: badgeCenter - 280, width: "100%", display: "flex", justifyContent: "center" }}>
          <Logo start={14} size={150} />
        </div>
        <LightLine progress={rule} y={badgeCenter + 340} width={460} />
        <div
          style={{
            position: "absolute",
            top: badgeCenter + 380,
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
