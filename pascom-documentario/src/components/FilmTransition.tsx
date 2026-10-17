import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FPS, sec, shutterTimes, timeline } from "../data/timeline";
import { colors } from "../theme";
import { smoothNoise } from "./plates/util";

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

/** Planos onde entra um vazamento de luz de película (escolha fixa, não sistemática). */
const LEAKS = timeline.shots
  .filter((s) => (s.transition === "slow" || s.transition === "dissolve") && random(`leak-${s.id}`) < 0.5)
  .map((s) => ({ t: s.start, side: random(`side-${s.id}`) < 0.5 ? -1 : 1, hue: random(`hue-${s.id}`) }));

/**
 * O "portão" do projetor: a imagem nunca está perfeitamente parada nem perfeitamente nítida.
 * Pequena trepidação (gate weave), suavidade óptica e respiração de exposição.
 */
export const FilmGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const g = Math.floor(frame / 2);
  const t = frame / FPS;
  const wx = (smoothNoise("weave-x", t * 2.2) - 0.5) * 3 + (random(`wj-${g}`) - 0.5) * 0.8;
  const wy = (smoothNoise("weave-y", t * 1.7) - 0.5) * 4;
  const rot = (smoothNoise("weave-r", t * 0.9) - 0.5) * 0.08;
  const exposure = 1 + (random(`exp-${g}`) - 0.5) * 0.025 + (smoothNoise("exp", t * 0.5) - 0.5) * 0.04;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${wx}px, ${wy}px) rotate(${rot}deg) scale(1.006)`,
        filter: `blur(0.55px) brightness(${exposure}) contrast(1.04)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Poeira e fios de cabelo no fotograma: raros, irregulares, nunca no mesmo lugar. */
const Dust: React.FC = () => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const g = Math.floor(frame / 2);
  const count = Math.max(0, Math.floor(random(`dn-${g}`) * 5) - 2);
  const hairGroup = Math.floor(frame / 3);
  const hair = random(`hair-${hairGroup}`) < 0.035;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: count }).map((_, i) => {
        const x = random(`dx-${g}-${i}`) * W;
        const y = random(`dy-${g}-${i}`) * H;
        const r = 1.2 + random(`dr-${g}-${i}`) * 3.5;
        const light = random(`dl-${g}-${i}`) < 0.3;
        return (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx={r}
            ry={r * (0.5 + random(`de-${g}-${i}`))}
            transform={`rotate(${random(`da-${g}-${i}`) * 180} ${x} ${y})`}
            fill={light ? "#f4ead8" : "#0a0806"}
            opacity={light ? 0.35 : 0.55}
          />
        );
      })}
      {hair && (
        <path
          d={(() => {
            const x = random(`hx-${hairGroup}`) * W;
            const y = random(`hy-${hairGroup}`) * H;
            const l = 40 + random(`hl-${hairGroup}`) * 90;
            return `M ${x} ${y} q ${l * 0.4} ${-l * 0.3} ${l * 0.7} ${l * 0.1} t ${l * 0.5} ${l * 0.3}`;
          })()}
          stroke="#0a0806"
          strokeWidth={1.4}
          fill="none"
          opacity={0.5}
        />
      )}
    </svg>
  );
};

/** Granulação de 35 mm, halo de lente, vazamentos de luz e vinheta irregular. */
export const FilmLook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  // a granulação muda a 15 quadros/s, como em película projetada
  const g = Math.floor(frame / 2);
  const idx = Math.floor(random(`grain-${g}`) * 4);
  const ox = Math.floor(random(`gx-${g}`) * 640);
  const oy = Math.floor(random(`gy-${g}`) * 640);
  const flicker = 1 + (random(`fl-${g}`) - 0.5) * 0.08;
  const t = frame / FPS;
  const end = sec(timeline.durationSec);
  const fadeOut = interpolate(frame, [end - FPS * 0.8, end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vx = 50 + (smoothNoise("vig-x", t * 0.2) - 0.5) * 6;
  const vy = 46 + (smoothNoise("vig-y", t * 0.15) - 0.5) * 5;

  let leak = 0;
  let leakSide = 1;
  let leakHue = 0;
  for (const l of LEAKS) {
    const d = t - (l.t - 0.5);
    if (d > 0 && d < 1.6) {
      const v = Math.sin((d / 1.6) * Math.PI) ** 2;
      if (v > leak) {
        leak = v;
        leakSide = l.side;
        leakHue = l.hue;
      }
    }
  }
  const leakX = leakSide < 0 ? 0 : 100;
  const leakColor = leakHue < 0.5 ? "255,120,40" : "255,70,50";

  return (
    <>
      {leak > 0 && (
        <AbsoluteFill
          style={{
            mixBlendMode: "screen",
            opacity: leak * 0.42,
            background: `radial-gradient(ellipse 55% 70% at ${leakX}% ${30 + leakHue * 40}%, rgba(${leakColor},0.9), rgba(${leakColor},0.25) 45%, transparent 75%), radial-gradient(ellipse 30% 40% at ${leakX}% ${70 - leakHue * 30}%, rgba(255,210,150,0.7), transparent 70%)`,
          }}
        />
      )}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 78% 66% at ${vx}% ${vy}%, transparent 50%, rgba(0,0,0,0.68) 100%)` }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35), transparent 14%, transparent 86%, rgba(0,0,0,0.4))" }} />
      <Dust />
      <AbsoluteFill style={{ overflow: "hidden", opacity: 0.12 * flicker, mixBlendMode: "overlay" }}>
        <div
          style={{
            position: "absolute",
            left: -ox,
            top: -oy,
            width: width + 1280,
            height: height + 1280,
            backgroundImage: `url(${staticFile(`assets/images/grain-${idx}.png`)})`,
            backgroundSize: "640px 640px",
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
