import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, Grain, Vignette } from "../components/Backdrop";
import { LightBeam } from "../components/LightBeam";
import { Particles } from "../components/Particles";
import { ProductPlate, pickSlot } from "../components/ProductPlate";
import { BRAND } from "../config/brand";
import { rise } from "../lib/motion";
import { HEIGHT } from "../config/timeline";

// CENA 04 — A CONEXÃO (12–16 s)
// A música cresce. A câmera se aproxima devagar do detalhe mais importante da estampa.
// Se existir uso real autorizado (pessoas vestindo a peça), ele é preferido ao produto
// isolado. A narração é legendada pelo componente Captions.
export const S04Conexao: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = rise(frame, 0, 26);
  const maskRadius = reveal * 1500;
  const zoom = 1 + 0.26 * rise(frame, 0, 120);
  const slot = pickSlot("usoReal", "composicaoHero", "frenteCamiseta");
  const glow = rise(frame, 20, 90);
  const rule = rise(frame, 70, 40);

  return (
    <AbsoluteFill style={{ clipPath: `circle(${maskRadius}px at 50% 50%)` }}>
      <Backdrop tint="navy" />
      <ProductPlate slot={slot} scale={zoom} focus="48% 40%" dim={0.18} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 90% 45% at 50% 100%, rgba(110,159,224,${0.32 * glow}), rgba(6,16,31,0) 70%)`,
          mixBlendMode: "screen",
        }}
      />
      <LightBeam progress={rise(frame, 10, 110)} color={BRAND.colors.gold} intensity={0.22} width={300} angle={-12} />
      <Particles count={30} seed={41} color={BRAND.colors.ivory} speed={0.7} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: HEIGHT - 380,
          width: 360 * rule,
          height: 1,
          transform: "translateX(-50%)",
          background: BRAND.colors.gold,
          opacity: 0.8,
        }}
      />
      <Vignette strength={0.6} />
      <Grain opacity={0.07} />
    </AbsoluteFill>
  );
};
