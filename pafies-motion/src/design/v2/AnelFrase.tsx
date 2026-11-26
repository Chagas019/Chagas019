/**
 * AnelFrase — anel tipográfico 3D (ref 3) em CSS 3D.
 * Fita cilíndrica com espessura: face externa = cor do fundo (vazado) com letras
 * brancas; face interna amarelo-ouro com letras marinho (lidas corretamente por
 * dentro); bordas (topo/base) amarelo-ouro. Gira nos 3 eixos.
 *
 * Legível de frente: rotateX≈-10, rotateY=0, rotateZ=0 → a 1ª repetição do texto
 * fica centralizada na frente.
 */
import React from "react";
import { FONT_CONDENSED } from "../fonts";
import { sparklePath } from "../elements/Sparkle";
import { BG_V2, INK_V2 } from "./tokensV2";

export type AnelFraseColors = {
  /** Fundo da face externa — use a MESMA cor do fundo da cena (efeito vazado). */
  outer: string;
  outerText: string;
  inner: string;
  innerText: string;
  /** Bordas/espessura da fita. */
  rim: string;
};

export type AnelFraseProps = {
  /** Frase repetida em volta (ex.: "ESTÃO PREPARADOS ✦ "). "✦" vira estrela vetorial. */
  text: string;
  radius: number;
  /** Altura da fita (px). */
  bandHeight: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  /** Padrão: 1.02 × bandHeight (letras enchem a fita, como na ref). */
  fontSize?: number;
  /** Espessura da fita (px). Padrão 0.09 × bandHeight. */
  thickness?: number;
  /** Repetições da frase; padrão = o que couber. */
  repeat?: number;
  colors?: Partial<AnelFraseColors>;
  perspective?: number;
  /** Caixa (padrão quadrado 2R + 1.2×bandHeight). O anel fica centrado. */
  width?: number;
  height?: number;
  style?: React.CSSProperties;
};

const DEF: AnelFraseColors = {
  outer: BG_V2.electric,
  outerText: INK_V2.white,
  inner: INK_V2.gold,
  innerText: INK_V2.navy,
  rim: INK_V2.gold,
};

/** Larguras de avanço aproximadas da Anton (em em). */
const adv = (ch: string): number => {
  if (ch === " ") return 0.2;
  if (ch === "✦") return 0.56;
  if ("IÍ1.,:;!|'".includes(ch)) return 0.27;
  if ("J".includes(ch)) return 0.36;
  if ("LTFEÉ".includes(ch)) return 0.42;
  if ("MW".includes(ch)) return 0.62;
  if ("?".includes(ch)) return 0.44;
  return 0.48;
};

const Glyph: React.FC<{ ch: string; color: string; fontSize: number }> = ({ ch, color, fontSize }) =>
  ch === "✦" ? (
    <svg width={fontSize * 0.46} height={fontSize * 0.46} viewBox="-50 -50 100 100" style={{ display: "block" }}>
      <path d={sparklePath(50, 0.24)} fill={color} />
    </svg>
  ) : (
    <span style={{ color, display: "block", whiteSpace: "pre" }}>{ch}</span>
  );

type Cell = { ch: string; a: number; w: number };

const layout = (chars: string[], reps: number, circ: number): Cell[] => {
  const all = Array.from({ length: reps }, () => chars).flat();
  const widths = all.map(adv);
  const total = widths.reduce((a, b) => a + b, 0);
  const repW = chars.reduce((a, ch) => a + adv(ch), 0);
  // centraliza a 1ª repetição (sem o espaço/estrela final) em a = 0
  const trimmed = [...chars];
  let tail = 0;
  while (trimmed.length && (trimmed[trimmed.length - 1] === " " || trimmed[trimmed.length - 1] === "✦")) {
    tail += adv(trimmed.pop() as string);
  }
  const offset = (((repW - tail) / 2) / total) * 360;
  let acc = 0;
  return all.map((ch, i) => {
    const w = widths[i] / total;
    const a = (acc + w / 2) * 360 - offset;
    acc += w;
    return { ch, a, w: w * circ };
  });
};

export const AnelFrase: React.FC<AnelFraseProps> = ({
  text,
  radius,
  bandHeight,
  rotateX = -12,
  rotateY = 0,
  rotateZ = 0,
  fontSize,
  thickness,
  repeat,
  colors,
  perspective = 1800,
  width,
  height,
  style,
}) => {
  const c = { ...DEF, ...colors };
  const fs = fontSize ?? bandHeight * 1.02;
  const th = thickness ?? Math.max(3, bandHeight * 0.09);
  const chars = Array.from(text);
  const circ = 2 * Math.PI * radius;
  const unit = chars.reduce((a, ch) => a + adv(ch), 0) * fs;
  const reps = repeat ?? Math.max(1, Math.floor(circ / unit));
  const cells = layout(chars, reps, circ);
  const W = width ?? radius * 2 + bandHeight * 1.2;
  const H = height ?? radius * 2 + bandHeight * 1.2;
  const rIn = radius - th;
  const circIn = 2 * Math.PI * rIn;

  const face: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT_CONDENSED,
    fontSize: fs,
    lineHeight: 1,
    // Anton tem caixa-alta alta: empurra levemente para baixo p/ centralizar a cap-height
    paddingTop: fs * 0.03,
    boxSizing: "border-box",
    overflow: "visible",
  };
  const pad = 1.2; // sobreposição p/ esconder frestas entre células

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
        {/* face externa: letras brancas sobre a cor do fundo */}
        {cells.map(({ ch, a, w }, i) => (
          <div
            key={`o${i}`}
            style={{
              position: "absolute",
              left: -w / 2 - pad / 2,
              top: -bandHeight / 2,
              width: w + pad,
              height: bandHeight,
              transformStyle: "preserve-3d",
              transform: `rotateY(${a}deg) translateZ(${radius}px)`,
            }}
          >
            <div style={{ ...face, background: c.outer }}>
              <Glyph ch={ch} color={c.outerText} fontSize={fs} />
            </div>
          </div>
        ))}
        {/* face interna: ouro com texto marinho, ordem invertida → lê certo por dentro */}
        {cells.map(({ ch, a, w }, i) => {
          const wi = (w / circ) * circIn;
          return (
            <div
              key={`i${i}`}
              style={{
                position: "absolute",
                left: -wi / 2 - pad / 2,
                top: -bandHeight / 2,
                width: wi + pad,
                height: bandHeight,
                transformStyle: "preserve-3d",
                transform: `rotateY(${180 - a}deg) translateZ(${-rIn}px)`,
              }}
            >
              <div style={{ ...face, background: c.inner }}>
                <Glyph ch={ch} color={c.innerText} fontSize={fs * (rIn / radius)} />
              </div>
            </div>
          );
        })}
        {/* bordas (topo e base) — dão a espessura amarela da fita */}
        {cells.map(({ a, w }, i) =>
          [-1, 1].map((sgn) => (
            <div
              key={`r${i}${sgn}`}
              style={{
                position: "absolute",
                left: -w / 2 - pad,
                top: -th / 2,
                width: w + pad * 2,
                height: th,
                background: c.rim,
                transform: `rotateY(${a}deg) translateY(${(sgn * bandHeight) / 2}px) translateZ(${radius - th / 2}px) rotateX(90deg)`,
              }}
            />
          )),
        )}
      </div>
    </div>
  );
};
