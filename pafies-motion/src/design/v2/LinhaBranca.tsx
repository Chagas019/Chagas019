/**
 * LinhaBranca — linha fina condutora (ref 1). Chapada, ponta redonda, sem brilho.
 * Path arbitrário em coordenadas do quadro (padrão 1920×1080) com trim start/end.
 */
import React from "react";
import { INK_V2 } from "./tokensV2";

export type LinhaBrancaProps = {
  /** Path SVG em px do quadro (use os helpers linha*). */
  d: string;
  /** Início visível (0..1 do comprimento). */
  start?: number;
  /** Fim visível (0..1 do comprimento). */
  end?: number;
  /** Espessura em px (briefing: 6–10). */
  thickness?: number;
  color?: string;
  /** Caixa (padrão 1920×1080). */
  width?: number;
  height?: number;
  cap?: "round" | "butt" | "square";
  style?: React.CSSProperties;
};

export const LinhaBranca: React.FC<LinhaBrancaProps> = ({
  d,
  start = 0,
  end = 1,
  thickness = 8,
  color = INK_V2.white,
  width = 1920,
  height = 1080,
  cap = "round",
  style,
}) => {
  const a = Math.max(0, Math.min(1, Math.min(start, end)));
  const b = Math.max(0, Math.min(1, Math.max(start, end)));
  const len = b - a;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none", ...style }}
    >
      {len > 0.0005 ? (
        <path
          d={d}
          pathLength={1}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap={cap}
          strokeLinejoin="round"
          strokeDasharray={`${len} 2`}
          strokeDashoffset={-a}
        />
      ) : null}
    </svg>
  );
};

/* ---------- helpers de path ---------- */

/** Reta de (x1,y1) a (x2,y2) — use pontos fora do quadro para "cortar" a tela. */
export const linhaReta = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1} L${x2} ${y2}`;

/** Arco de círculo (graus; 0 = →, 90 = ↓), sentido horário se a1 > a0. */
export const linhaArco = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  if (Math.abs(a1 - a0) >= 359.9) {
    const [xm, ym] = p(a0 + 180);
    return `M${x0} ${y0} A${r} ${r} 0 1 ${sweep} ${xm} ${ym} A${r} ${r} 0 1 ${sweep} ${x0} ${y0}`;
  }
  return `M${x0} ${y0} A${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
};

/** Círculo completo começando no ângulo a0 (para "desenhar" o selo). */
export const linhaCirculo = (cx: number, cy: number, r: number, a0 = -90) => linhaArco(cx, cy, r, a0, a0 + 360);

/** Diagonal que entra reta e termina em arco (o gesto da ref 1). */
export const linhaDiagonalArco = (
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  r: number,
  sweepDeg = 200,
) => {
  // reta até a tangente superior do círculo, depois arco
  const a0 = -90;
  const sx = cx + r * Math.cos((a0 * Math.PI) / 180);
  const sy = cy + r * Math.sin((a0 * Math.PI) / 180);
  const a1 = a0 + sweepDeg;
  const ex = cx + r * Math.cos((a1 * Math.PI) / 180);
  const ey = cy + r * Math.sin((a1 * Math.PI) / 180);
  return `M${x1} ${y1} L${sx} ${sy} A${r} ${r} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${ex} ${ey}`;
};
