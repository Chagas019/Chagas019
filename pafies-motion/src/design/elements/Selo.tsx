import React, { useMemo } from "react";
import { COLORS, GRADIENT_STOPS } from "../tokens";
import { clamp01, Pt, smoothClosedPath, useSvgId } from "./geom";

export type SeloProps = {
  /** Diâmetro externo em px. */
  size: number;
  /** Número de ondas da borda (doc: 14). */
  waves?: number;
  /** Amplitude relativa da onda (0.05 = ±5% do raio). */
  amplitude?: number;
  /** 0..1 — desenha o contorno dourado (strokeDasharray). */
  draw?: number;
  /** 0..1 — opacidade do miolo azul-marinho + sombra. */
  fill?: number;
  /** Fase da ondulação em radianos (anima a borda "respirando"). */
  wobble?: number;
  /** Posição do brilho diagonal na borda (0..1 varre esq->dir); undefined = sem brilho. */
  shimmer?: number;
  /** Conteúdo SVG extra no miolo (coordenadas -100..100, centro 0,0). */
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

/** Contorno do selo em coordenadas normalizadas (-100..100). */
export const seloPath = (R: number, waves: number, amp: number, wobble: number): string => {
  const N = waves * 8;
  const pts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2 - Math.PI / 2;
    // |sin|^0.8 -> lóbulos cheios e vales mais marcados (como esmalte cunhado)
    const s = Math.abs(Math.sin((waves * th) / 2 + wobble / 2));
    const bump = Math.pow(s, 0.8);
    const r = R * (1 - amp + 2 * amp * bump);
    pts.push({ x: Math.cos(th) * r, y: Math.sin(th) * r });
  }
  return smoothClosedPath(pts);
};

export const Selo: React.FC<SeloProps> = ({
  size,
  waves = 14,
  amplitude = 0.05,
  draw = 1,
  fill = 1,
  wobble = 0,
  shimmer,
  children,
  style,
}) => {
  const id = useSvgId("selo");
  const R = 86;
  const outer = useMemo(() => seloPath(R, waves, amplitude, wobble), [waves, amplitude, wobble]);
  const inner = useMemo(
    () => seloPath(R * 0.925, waves, amplitude * 0.92, wobble),
    [waves, amplitude, wobble],
  );
  const d = clamp01(draw);
  const f = clamp01(fill);
  const dash = d >= 1 ? {} : ({ pathLength: 1, strokeDasharray: `${d} 1`, strokeDashoffset: 0 } as const);
  const sh = shimmer === undefined ? null : -0.4 + clamp01(shimmer) * 1.8;

  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ overflow: "visible", ...style }}>
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="-100" x2="0" y2="100" gradientUnits="userSpaceOnUse">
          {GRADIENT_STOPS.gold.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
        <linearGradient id={`${id}-gold2`} x1="-100" y1="-60" x2="100" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset={0} stopColor={COLORS.goldLight} />
          <stop offset={0.35} stopColor={COLORS.gold} />
          <stop offset={0.7} stopColor={COLORS.goldDeep} />
          <stop offset={1} stopColor={COLORS.gold} />
        </linearGradient>
        <radialGradient id={`${id}-bg`} cx="0.5" cy="0.42" r="0.62">
          {GRADIENT_STOPS.bg.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </radialGradient>
        {sh !== null && (
          <linearGradient
            id={`${id}-shine`}
            x1="-100" y1="0" x2="100" y2="0"
            gradientUnits="userSpaceOnUse"
            gradientTransform="rotate(-20)"
          >
            <stop offset={Math.max(0, sh - 0.12)} stopColor={COLORS.goldLight} stopOpacity={0} />
            <stop offset={clamp01(sh)} stopColor={COLORS.white} stopOpacity={0.95} />
            <stop offset={Math.min(1, sh + 0.12)} stopColor={COLORS.goldLight} stopOpacity={0} />
          </linearGradient>
        )}
        <clipPath id={`${id}-clip`}>
          <path d={inner} />
        </clipPath>
      </defs>

      {/* sombra sólida (esmalte) */}
      <path d={outer} fill={COLORS.navyNight} opacity={0.55 * f} transform="translate(0 4.5)" />
      {/* miolo */}
      <path d={outer} fill={`url(#${id}-bg)`} opacity={f} />
      <g opacity={f} clipPath={`url(#${id}-clip)`}>
        {/* brilho de esmalte (crescente) */}
        <ellipse cx={-22} cy={-48} rx={60} ry={30} fill={COLORS.white} opacity={0.05} transform="rotate(-24 -22 -48)" />
        {children}
      </g>

      {/* aro dourado: bisel escuro + corpo em degradê + fio de luz */}
      <path d={outer} fill="none" stroke={COLORS.goldDeep} strokeWidth={9} strokeLinejoin="round" {...dash} transform="translate(0 1.2)" />
      <path d={outer} fill="none" stroke={`url(#${id}-gold)`} strokeWidth={7.5} strokeLinejoin="round" strokeLinecap="round" {...dash} />
      <path d={outer} fill="none" stroke={`url(#${id}-gold2)`} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" opacity={0.55} {...dash} />
      <path d={outer} fill="none" stroke={COLORS.goldLight} strokeWidth={0.9} strokeLinecap="round" opacity={0.9} transform="translate(-0.5 -1.6) scale(1.004)" {...dash} />
      <path d={inner} fill="none" stroke={COLORS.goldDeep} strokeWidth={1.4} strokeLinecap="round" {...dash} />
      {sh !== null && (
        <path d={outer} fill="none" stroke={`url(#${id}-shine)`} strokeWidth={8} strokeLinejoin="round" {...dash} style={{ mixBlendMode: "screen" }} />
      )}
    </svg>
  );
};
