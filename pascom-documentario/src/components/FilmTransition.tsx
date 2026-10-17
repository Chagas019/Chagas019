import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FPS, sec, shutterTimes, timeline } from "../data/timeline";
import { colors } from "../theme";

/**
 * Transições por luminosidade que não pertencem a um plano só:
 * o clarão quente de cada clique de câmera e a respiração (quase apagão)
 * da pausa musical antes do clímax.
 */
export const FilmTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const { from, to, depth } = timeline.breath;
  const climax = sec(Number(timeline.music.climax));

  const breath = interpolate(frame, [sec(from), sec(to) - 6, sec(to)], [0, depth, depth], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const inBreath = frame >= sec(from) && frame < climax ? breath : 0;

  let flash = 0;
  for (const t of shutterTimes) {
    const f = sec(t);
    if (frame >= f && frame < f + 8) {
      const strength = f === climax ? 0.75 : 0.16;
      flash = Math.max(flash, strength * Math.exp(-(frame - f) / (f === climax ? 4 : 1.6)));
    }
  }

  return (
    <>
      <AbsoluteFill style={{ backgroundColor: colors.night, opacity: inBreath }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, #fff6e0, ${colors.goldLight} 45%, ${colors.gold})`, opacity: flash, mixBlendMode: "screen" }} />
    </>
  );
};

/** Granulação de filme discreta, vinheta e leve respiração de exposição. */
export const FilmLook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  // a granulação muda a 15 quadros/s, como em película projetada
  const g = Math.floor(frame / 2);
  const idx = Math.floor(random(`grain-${g}`) * 4);
  const ox = Math.floor(random(`gx-${g}`) * 512);
  const oy = Math.floor(random(`gy-${g}`) * 512);
  const flicker = 1 + (random(`fl-${g}`) - 0.5) * 0.012;
  const end = sec(timeline.durationSec);
  const fadeOut = interpolate(frame, [end - FPS * 0.8, end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 65% at 50% 46%, transparent 55%, rgba(0,0,0,0.62) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35), transparent 14%, transparent 86%, rgba(0,0,0,0.4))" }} />
      <AbsoluteFill style={{ overflow: "hidden", opacity: 0.075 * flicker, mixBlendMode: "overlay" }}>
        <div
          style={{
            position: "absolute",
            left: -ox,
            top: -oy,
            width: width + 1024,
            height: height + 1024,
            backgroundImage: `url(${staticFile(`assets/images/grain-${idx}.png`)})`,
            backgroundSize: "512px 512px",
          }}
        />
      </AbsoluteFill>
      {/* pré-carrega as quatro texturas para não haver quadro sem grão */}
      <div style={{ display: "none" }}>
        {[0, 1, 2, 3].map((i) => (
          <Img key={i} src={staticFile(`assets/images/grain-${i}.png`)} />
        ))}
      </div>
      <AbsoluteFill style={{ backgroundColor: "black", opacity: fadeOut }} />
    </>
  );
};
