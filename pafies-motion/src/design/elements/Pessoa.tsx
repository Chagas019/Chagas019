import React from "react";
import { COLORS, GRADIENT_STOPS, SKIN } from "../tokens";
import { clamp01, lerp, mixHex, useSvgId } from "./geom";

export type PessoaVariant = "A" | "B" | "C";

export type PessoaProps = {
  /** Altura em px (largura = size * 200/240). */
  size: number;
  /** 0 = braço abaixado, 1 = braço estendido para a frente/cima. */
  reach?: number;
  /** Espelha (pessoa olhando para a esquerda). */
  flip?: boolean;
  /** A = manga xadrez quente (pele clara) · B = blusa laranja (pele morena) · C = turquesa/azul. */
  variant?: PessoaVariant;
  /** Sobrescreve a cor principal da roupa. */
  color?: string;
  /** Inclinação leve do corpo em graus (micro-vida). */
  lean?: number;
  style?: React.CSSProperties;
};

const VB_W = 200;
const VB_H = 240;
const SHOULDER = { x: 116, y: 150 };
const UPPER = 50;
const FORE = 44;

const angles = (reach: number) => {
  const r = clamp01(reach);
  return { a1: lerp(-6, -112, r), a2: lerp(-38, -8, r) };
};

/** Posição da mão (px, relativa ao canto sup. esquerdo do <svg>) — útil p/ prender a fita. */
export const pessoaHandPosition = (size: number, reach: number, flip = false) => {
  const { a1, a2 } = angles(reach);
  const r1 = (a1 * Math.PI) / 180;
  const r2 = ((a1 + a2) * Math.PI) / 180;
  // vetor "para baixo" (0,1) rotacionado por a: (-sin a, cos a)
  const ex = SHOULDER.x - Math.sin(r1) * UPPER;
  const ey = SHOULDER.y + Math.cos(r1) * UPPER;
  const hx = ex - Math.sin(r2) * (FORE + 6);
  const hy = ey + Math.cos(r2) * (FORE + 6);
  const k = size / VB_H;
  return { x: (flip ? VB_W - hx : hx) * k, y: hy * k };
};

const PALETTES: Record<PessoaVariant, { shirt: string; shirt2: string; skin: string; hair: string; plaid: boolean; sleeveLong: boolean }> = {
  A: { shirt: GRADIENT_STOPS.warm[0].color, shirt2: GRADIENT_STOPS.warm[1].color, skin: SKIN.light, hair: COLORS.navyNight, plaid: true, sleeveLong: true },
  B: { shirt: COLORS.orange, shirt2: COLORS.amber, skin: SKIN.medium, hair: COLORS.navyNight, plaid: false, sleeveLong: false },
  C: { shirt: COLORS.teal, shirt2: COLORS.electricLight, skin: SKIN.medium, hair: COLORS.navyNight, plaid: false, sleeveLong: false },
};

const OUT = COLORS.navyNight;
const OW = 4;

export const Pessoa: React.FC<PessoaProps> = ({ size, reach = 0, flip = false, variant = "A", color, lean = 0, style }) => {
  const id = useSvgId("pes");
  const p = PALETTES[variant];
  const shirt = color ?? p.shirt;
  const shirt2 = color ? mixHex(color, COLORS.white, 0.25) : p.shirt2;
  const shirtFill = `url(#${id}-shirt)`;
  const { a1, a2 } = angles(reach);
  const backA1 = lerp(8, -30, clamp01(reach));
  const sleeve = p.plaid ? `url(#${id}-plaid)` : shirt; // linhas: sem gradiente objectBoundingBox
  const shade = mixHex(shirt, COLORS.navyNight, 0.35);

  const Arm: React.FC<{ x: number; y: number; r1: number; r2: number; dark?: boolean }> = ({ x, y, r1, r2, dark }) => {
    const sl = dark ? shade : sleeve;
    const skin = dark ? mixHex(p.skin, COLORS.navyNight, 0.3) : p.skin;
    return (
      <g transform={`translate(${x} ${y}) rotate(${r1})`}>
        <line x1={0} y1={0} x2={0} y2={UPPER} stroke={OUT} strokeWidth={22 + OW * 2} strokeLinecap="round" />
        <g transform={`translate(0 ${UPPER}) rotate(${r2})`}>
          <line x1={0} y1={0} x2={0} y2={FORE} stroke={OUT} strokeWidth={18 + OW * 2} strokeLinecap="round" />
          <circle cx={0} cy={FORE + 6} r={10 + OW} fill={OUT} />
          <line x1={0} y1={0} x2={0} y2={FORE} stroke={p.sleeveLong ? sl : skin} strokeWidth={18} strokeLinecap="round" />
          {p.sleeveLong && <rect x={-10} y={FORE - 8} width={20} height={6} rx={3} fill={dark ? shade : mixHex(shirt, COLORS.navyNight, 0.15)} />}
          <circle cx={0} cy={FORE + 6} r={10} fill={skin} />
        </g>
        <line x1={0} y1={0} x2={0} y2={UPPER} stroke={sl} strokeWidth={22} strokeLinecap="round" />
      </g>
    );
  };

  const torso = "M44 244 C42 186 58 142 96 138 C134 142 150 186 148 244 Z";

  return (
    <svg
      width={(size * VB_W) / VB_H}
      height={size}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      style={{ overflow: "visible", ...style }}
    >
      <defs>
        <linearGradient id={`${id}-shirt`} x1="0" y1="0" x2="1" y2="1">
          <stop offset={0} stopColor={shirt} />
          <stop offset={1} stopColor={shirt2} />
        </linearGradient>
        <pattern id={`${id}-plaid`} width={12} height={12} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={12} height={12} fill={shirt} />
          <rect width={12} height={6} fill={shirt2} opacity={0.55} />
          <rect x={0} y={0} width={3} height={12} fill={COLORS.navySoft} opacity={0.45} />
          <rect x={0} y={7} width={12} height={2} fill={COLORS.navySoft} opacity={0.35} />
        </pattern>
        <clipPath id={`${id}-waist`}>
          <rect x={-300} y={-300} width={800} height={300 + VB_H} />
        </clipPath>
        <clipPath id={`${id}-torso`}>
          <path d={torso} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-waist)`}>
      <g transform={`${flip ? `translate(${VB_W} 0) scale(-1 1)` : ""} rotate(${lean} 96 240)`}>
        {/* braço de trás */}
        <Arm x={80} y={156} r1={backA1} r2={10} dark />
        {/* tronco */}
        <path d={torso} fill={OUT} stroke={OUT} strokeWidth={OW * 2} strokeLinejoin="round" />
        <path d={torso} fill={p.plaid ? `url(#${id}-plaid)` : shirtFill} />
        <g clipPath={`url(#${id}-torso)`}>
          <path d="M44 244 C46 196 60 160 82 146 C70 176 66 210 70 244 Z" fill={COLORS.navyNight} opacity={0.18} />
          {/* gola */}
          <path d="M80 138 Q96 158 112 138" fill={p.skin} stroke={OUT} strokeWidth={3} />
        </g>
        {/* pescoço */}
        <rect x={88} y={114} width={17} height={28} rx={6} fill={p.skin} stroke={OUT} strokeWidth={3} />
        {/* cabeça: cabelo meia-lua atrás + rosto */}
        <circle cx={92} cy={94} r={31} fill={p.hair} />
        {variant === "A" && <ellipse cx={64} cy={110} rx={12} ry={18} fill={p.hair} transform="rotate(20 64 110)" />}
        <circle cx={99} cy={101} r={25} fill={p.skin} />
        <path d="M70 92 C76 66 112 60 126 86 C114 80 96 80 82 96 Z" fill={p.hair} />
        <circle cx={92} cy={94} r={31} fill="none" stroke={OUT} strokeWidth={OW} />
        {/* olhos + sorriso */}
        <circle cx={104} cy={101} r={2.6} fill={OUT} />
        <circle cx={116} cy={100} r={2.6} fill={OUT} />
        <path d="M105 111 Q111 116 117 110" fill="none" stroke={OUT} strokeWidth={2.2} strokeLinecap="round" />
        <circle cx={100} cy={109} r={3.5} fill={COLORS.coral} opacity={0.45} />
        {/* braço da frente */}
        <Arm x={SHOULDER.x} y={SHOULDER.y} r1={a1} r2={a2} />
      </g>
      </g>
    </svg>
  );
};
