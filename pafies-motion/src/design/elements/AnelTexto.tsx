import React from "react";
import { COLORS } from "../tokens";
import { FONT_CONDENSED } from "../fonts";
import { mixHex } from "./geom";
import { sparklePath } from "./Sparkle";

export type AnelTextoColors = {
  /** Faixa externa (face clara). */
  band: string;
  /** Texto da face externa. */
  text: string;
  /** Faixa interna (face escura, vista por dentro do anel). */
  inner: string;
  /** Texto espelhado visto por dentro. */
  innerText: string;
  /** Aro (filetes superior/inferior); null = sem aro. */
  rim: string | null;
};

export type AnelTextoProps = {
  /** Texto repetido em volta do cilindro (ex.: "SOLIDÁRIA ✦ "). "✦" vira estrela vetorial. */
  text: string;
  /** Raio do cilindro (px). */
  radius: number;
  rotateX?: number;
  /** Giro do anel em torno do próprio eixo (anime este). */
  rotateY?: number;
  rotateZ?: number;
  fontSize?: number;
  /** Altura da faixa (padrão 1.15 × fontSize). */
  bandHeight?: number;
  /** Número de repetições; padrão = o que couber na circunferência. */
  repeat?: number;
  colors?: Partial<AnelTextoColors>;
  perspective?: number;
  /** Sombreamento por ângulo (0 = chapado, 1 = forte). */
  shading?: number;
  /** Caixa do componente (padrão: quadrado 2R + folga). */
  width?: number;
  height?: number;
  style?: React.CSSProperties;
};

const DEFAULT_COLORS: AnelTextoColors = {
  band: COLORS.orange,
  text: COLORS.navy,
  inner: mixHex(COLORS.hotOrange, COLORS.navyNight, 0.62),
  innerText: mixHex(COLORS.amber, COLORS.navyNight, 0.35),
  rim: COLORS.amber,
};

/** Larguras aproximadas (em em) dos glifos da Anton — distribui as letras proporcionalmente. */
const glyphWidth = (ch: string): number => {
  if (ch === " ") return 0.26;
  if (ch === "✦") return 0.62;
  if ("IÍ1.,:;!|".includes(ch)) return 0.3;
  if ("JLTFE".includes(ch)) return 0.46;
  if ("MW".includes(ch)) return 0.66;
  return 0.52;
};

const Glyph: React.FC<{ ch: string; color: string; fontSize: number }> = ({ ch, color, fontSize }) =>
  ch === "✦" ? (
    <svg width={fontSize * 0.5} height={fontSize * 0.5} viewBox="-50 -50 100 100" style={{ display: "block" }}>
      <path d={sparklePath(50, 0.26)} fill={color} />
    </svg>
  ) : (
    <span style={{ color, display: "block", whiteSpace: "pre" }}>{ch}</span>
  );

export const AnelTexto: React.FC<AnelTextoProps> = ({
  text,
  radius,
  rotateX = -18,
  rotateY = 0,
  rotateZ = -8,
  fontSize = 110,
  bandHeight,
  repeat,
  colors,
  perspective = 1400,
  shading = 0.6,
  width,
  height,
  style,
}) => {
  const c = { ...DEFAULT_COLORS, ...colors };
  const chars = Array.from(text);
  const circ = 2 * Math.PI * radius;
  const unit = chars.reduce((a, ch) => a + glyphWidth(ch), 0) * fontSize * 1.08;
  const reps = repeat ?? Math.max(1, Math.round(circ / unit));
  const all = Array.from({ length: reps }, () => chars).flat();
  const widths = all.map(glyphWidth);
  const totalW = widths.reduce((a, b) => a + b, 0);
  // ângulo central de cada célula (proporcional à largura do glifo)
  let acc = 0;
  const cells = all.map((ch, i) => {
    const w = (widths[i] / totalW) * 360;
    const a = acc + w / 2;
    acc += w;
    return { ch, a, cellW: (widths[i] / totalW) * circ };
  });
  const bandH = bandHeight ?? fontSize * 1.18;
  const W = width ?? radius * 2 + fontSize * 2;
  const H = height ?? radius * 2 + fontSize * 2;
  const rimW = Math.max(2, fontSize * 0.05);

  return (
    <div style={{ position: "relative", width: W, height: H, perspective, ...style }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
          transform: `rotateZ(${rotateZ}deg) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        }}
      >
        {cells.map(({ ch, a, cellW }, i) => {
          const world = ((a + rotateY) * Math.PI) / 180;
          // face externa voltada p/ câmera quando cos > 0; luz vinda de cima-esquerda
          const light = 0.5 + 0.5 * Math.cos(world + 0.5);
          const band = mixHex(c.band, COLORS.navyNight, (1 - light) * 0.45 * shading);
          const bandHi = mixHex(c.band, COLORS.amber, light * 0.5 * shading);
          const innerBand = mixHex(c.inner, COLORS.navyNight, light * 0.35 * shading);
          const face: React.CSSProperties = {
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONT_CONDENSED,
            fontSize,
            lineHeight: 1,
            letterSpacing: 0,
            paddingTop: fontSize * 0.04,
            boxSizing: "border-box",
          };
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: -cellW / 2 - 0.75,
                top: -bandH / 2,
                width: cellW + 1.5,
                height: bandH,
                transformStyle: "preserve-3d",
                transform: `rotateY(${a}deg) translateZ(${radius}px)`,
              }}
            >
              <div
                style={{
                  ...face,
                  background: `linear-gradient(180deg, ${bandHi} 0%, ${band} 55%, ${mixHex(band, COLORS.hotOrange, 0.35)} 100%)`,
                  borderTop: c.rim ? `${rimW}px solid ${mixHex(c.rim, COLORS.white, 0.35 * light)}` : undefined,
                  borderBottom: c.rim ? `${rimW}px solid ${mixHex(c.rim, COLORS.navyNight, 0.35)}` : undefined,
                }}
              >
                <Glyph ch={ch} color={c.text} fontSize={fontSize} />
              </div>
              <div
                style={{
                  ...face,
                  transform: "rotateY(180deg)",
                  background: innerBand,
                  borderTop: c.rim ? `${rimW}px solid ${mixHex(c.rim, COLORS.navyNight, 0.55)}` : undefined,
                  borderBottom: c.rim ? `${rimW}px solid ${mixHex(c.rim, COLORS.navyNight, 0.7)}` : undefined,
                }}
              >
                <div style={{ transform: "scaleX(-1)", opacity: 0.55 }}>
                  <Glyph ch={ch} color={c.innerText} fontSize={fontSize} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
