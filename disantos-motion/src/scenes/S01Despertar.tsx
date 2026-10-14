import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, Grain, Vignette } from "../components/Backdrop";
import { LightBeam, LightLine } from "../components/LightBeam";
import { Particles } from "../components/Particles";
import { KineticText } from "../components/KineticText";
import { BRAND } from "../config/brand";
import { rise } from "../lib/motion";
import { HEIGHT } from "../config/timeline";

// CENA 01 — O DESPERTAR DA MARCA (0–3 s)
// Tela quase preta, linha de luz azul que se abre, texto que surge devagar.
// A câmera virtual empurra (dolly-in) enquanto a linha se estabiliza.
export const S01Despertar: React.FC = () => {
  const frame = useCurrentFrame();
  const push = 1.07 - 0.07 * rise(frame, 0, 90);
  const line = rise(frame, 8, 42);
  const textY = HEIGHT / 2;

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: "50% 48%" }}>
        <LightBeam progress={Math.min(1, frame / 90)} intensity={0.22} color={BRAND.colors.blueLight} width={380} />
        <LightLine progress={line} y={textY + 58} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              fontFamily: BRAND.fonts.display,
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: 96,
              lineHeight: 1.12,
              textAlign: "center",
              color: BRAND.colors.ivory,
              marginTop: -120,
              width: 900,
            }}
          >
            <KineticText text="Algumas histórias" start={22} stagger={1.1} duration={28} />
            <br />
            <KineticText text="nunca deixam de viver." start={50} stagger={1.1} duration={28} />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
      <Particles count={34} seed={11} speed={0.6} />
      <Vignette strength={0.7} />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};
