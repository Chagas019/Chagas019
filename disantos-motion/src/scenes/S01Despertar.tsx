import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, Grain, Vignette } from "../components/Backdrop";
import { LightBeam, LightLine } from "../components/LightBeam";
import { Particles } from "../components/Particles";
import { KineticText } from "../components/KineticText";
import { LogoBadge } from "../components/Logo";
import { BRAND } from "../config/brand";
import { rise } from "../lib/motion";
import { hasLogo } from "../config/assets";
import { WIDTH } from "../config/timeline";

// CENA 01 — O DESPERTAR DA MARCA (0–3 s)
// Tela quase preta. A linha de luz azul se abre, o selo surge no escuro e a câmera
// se aproxima da cruz dourada (o "t" da logo). Depois, a frase entra embaixo.
const BADGE = 300;
const BADGE_TOP = 430;
// Ponto da cruz dentro da logo (medido na arte original): ~66% da largura e ~45% da altura.
// Dentro do selo, a logo ocupa 66% da largura e fica centralizada.
const CROSS_ORIGIN = `${50 + (0.665 - 0.5) * 66}% ${50 + (0.45 - 0.5) * 36 + 3}%`;

export const S01Despertar: React.FC = () => {
  const frame = useCurrentFrame();
  const push = 1.07 - 0.07 * rise(frame, 0, 90);
  const line = rise(frame, 8, 42);
  const badge = rise(frame, 6, 40);
  const toCross = 1 + 0.55 * rise(frame, 24, 66);

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "50% 48%" }}>
        <LightBeam progress={Math.min(1, frame / 90)} intensity={0.22} color={BRAND.colors.blueLight} width={380} />
        {hasLogo && (
          <div
            style={{
              position: "absolute",
              left: (WIDTH - BADGE) / 2,
              top: BADGE_TOP,
              transform: `scale(${toCross})`,
              transformOrigin: CROSS_ORIGIN,
            }}
          >
            <LogoBadge diameter={BADGE} progress={badge} />
          </div>
        )}
        <div style={{ position: "absolute", left: 0, right: 0, top: 790, textAlign: "center", fontFamily: BRAND.fonts.text, fontSize: 26, letterSpacing: "0.36em", textTransform: "uppercase", color: BRAND.colors.goldDim, opacity: rise(frame, 4, 30) }}>
          Streetwear católico
        </div>
        <LightLine progress={line} y={1120} />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 830,
            textAlign: "center",
            fontFamily: BRAND.fonts.display,
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 92,
            lineHeight: 1.12,
            color: BRAND.colors.ivory,
          }}
        >
          <KineticText text="Algumas histórias" start={18} stagger={1.1} duration={28} />
          <br />
          <KineticText text="nunca deixam de viver." start={36} stagger={1.1} duration={28} />
        </div>
      </AbsoluteFill>
      <Particles count={34} seed={11} speed={0.6} />
      <Vignette strength={0.7} />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};
