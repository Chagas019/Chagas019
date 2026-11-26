/**
 * PinceladasVelocidade — speed lines em pinceladas (ref 2): faixas longas cônicas,
 * borda levemente irregular, saindo de um ponto de fuga. Cor = tom mais claro/escuro
 * do fundo chapado (ex.: TONE_V2.strokeOnOrangeLight).
 *
 * `progress` empurra as pinceladas para fora (loop contínuo: progress 0 e 1 são iguais
 * se `speed` for inteiro). Troque `seed` a cada 2 frames para o "on twos".
 */
import React from "react";
import { TONE_V2 } from "./tokensV2";
import { P, closedSmooth, rng } from "./liquid";

export type PinceladasVelocidadeProps = {
  /** Fase do movimento (0..1, ciclo). */
  progress?: number;
  seed?: number;
  /** Ponto de fuga em px (padrão: centro-esquerda baixa, câmera baixa). */
  center?: { x: number; y: number };
  count?: number;
  /** Cor única (padrão: laranja claro sobre fundo laranja). */
  color?: string;
  /** Lista de cores alternadas (sobrepõe `color`). */
  colors?: string[];
  opacity?: number;
  /** Raio livre em volta do ponto de fuga (px). */
  innerRadius?: number;
  /** Espessura máx. das pinceladas (px). */
  maxWidth?: number;
  /** Quantas voltas de ciclo por progress 0→1 (inteiro = loop perfeito). */
  speed?: number;
  /** Limita a um leque de ângulos (graus), ex. [-60, 60]. Padrão: 360°. */
  arc?: [number, number];
  width?: number;
  height?: number;
  style?: React.CSSProperties;
};

const strokePath = (c: P, ang: number, r0: number, r1: number, w: number, R: () => number): string => {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const nx = -sa;
  const ny = ca;
  const N = 6;
  const left: P[] = [];
  const right: P[] = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const r = r0 + (r1 - r0) * s;
    const hw = (w / 2) * Math.pow(s, 0.85) * (1 + (R() - 0.5) * 0.35);
    const off = (R() - 0.5) * w * 0.12;
    left.push({ x: c.x + ca * r + nx * (hw + off), y: c.y + sa * r + ny * (hw + off) });
    right.push({ x: c.x + ca * r - nx * (hw - off), y: c.y + sa * r - ny * (hw - off) });
  }
  // ponta externa "pincel seco": dentes irregulares
  const end: P[] = [];
  const teeth = 3;
  for (let k = teeth - 1; k >= 1; k--) {
    const u = k / teeth - 0.5;
    const back = (k % 2 === 0 ? 0.02 : 0.06 + R() * 0.05) * (r1 - r0);
    end.push({ x: c.x + ca * (r1 - back) + nx * u * w, y: c.y + sa * (r1 - back) + ny * u * w });
  }
  const tip: P = { x: c.x + ca * (r0 - 4), y: c.y + sa * (r0 - 4) };
  return closedSmooth([tip, ...left.slice(1), ...end.reverse(), ...right.slice(1).reverse()], 0.6);
};

export const PinceladasVelocidade: React.FC<PinceladasVelocidadeProps> = ({
  progress = 0,
  seed = 0,
  center,
  count = 64,
  color = TONE_V2.strokeOnOrangeLight,
  colors,
  opacity = 1,
  innerRadius = 120,
  maxWidth = 120,
  speed = 1,
  arc,
  width = 1920,
  height = 1080,
  style,
}) => {
  const C = center ?? { x: width * 0.42, y: height * 0.62 };
  const diag = Math.hypot(width, height);
  const palette = colors && colors.length ? colors : [color];
  const els: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    // propriedades estáveis do traço (não mudam com seed → sem "pular" de lugar)
    const S = rng(i * 7.13 + 3);
    const base = arc
      ? ((arc[0] + ((arc[1] - arc[0]) * (i + S() * 0.8)) / count) * Math.PI) / 180
      : ((i + S() * 0.85) / count) * Math.PI * 2;
    const len = diag * (0.45 + S() * 0.5);
    const w = maxWidth * (0.25 + S() * 0.75);
    const phase0 = S();
    const spd = speed * (S() > 0.5 ? 1 : 2);
    // jitter "on twos" (forma da borda)
    const J = rng(seed * 101 + i);
    const phase = (((phase0 + progress * spd) % 1) + 1) % 1;
    const r0 = innerRadius + phase * diag * 0.42;
    const r1 = r0 + len;
    const ang = base + (J() - 0.5) * 0.015;
    const fill = palette[i % palette.length];
    // alguns traços quebrados em dois (pincel seco)
    if (S() > 0.7) {
      const cut = r0 + len * (0.35 + S() * 0.2);
      els.push(<path key={`a${i}`} d={strokePath(C, ang, r0, cut, w * 0.7, J)} fill={fill} />);
      els.push(<path key={`b${i}`} d={strokePath(C, ang + 0.004, cut + len * 0.05, r1, w, J)} fill={fill} />);
    } else {
      els.push(<path key={`a${i}`} d={strokePath(C, ang, r0, r1, w, J)} fill={fill} />);
    }
  }
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", left: 0, top: 0, opacity, pointerEvents: "none", ...style }}
    >
      {els}
    </svg>
  );
};
