import React, { useMemo } from "react";
import { getLength, getPointAtLength } from "@remotion/paths";
import { COLORS, GRADIENT_STOPS, GradientStop } from "../tokens";
import { clamp01, colorAt, mixHex, Pt, smoothstep, useSvgId } from "./geom";

export type FitaProps = {
  /** Path SVG (coordenadas do sistema do pai). */
  d: string;
  /** Trim: início visível (0..1 do comprimento) — a "cauda". */
  start?: number;
  /** Trim: fim visível (0..1) — a "cabeça". */
  end?: number;
  /** Largura do corpo em px (doc: 28). */
  width?: number;
  /** 0..1 intensidade do brilho difuso âmbar. */
  glow?: number;
  /** Stops do degradê ao longo do trecho visível (cauda -> cabeça). */
  stops?: readonly GradientStop[];
  /** Afina a cauda como cometa. */
  taper?: boolean;
  /** Multiplicador de largura ao longo do path inteiro (u 0..1) — ex.: torção 28→10→28. */
  widthAt?: (u: number) => number;
  shadow?: boolean;
  highlight?: boolean;
  opacity?: number;
};

const f2 = (v: number) => v.toFixed(2);
const poly = (pts: Pt[]) => (pts.length ? `M${pts.map((p) => `${f2(p.x)} ${f2(p.y)}`).join(" L")}` : "");

/** Versão <g> — use dentro de um <svg> seu. */
export const FitaPath: React.FC<FitaProps> = ({
  d,
  start = 0,
  end = 1,
  width = 28,
  glow = 0.5,
  stops = GRADIENT_STOPS.ribbon,
  taper = true,
  widthAt,
  shadow = true,
  highlight = true,
  opacity = 1,
}) => {
  const id = useSvgId("fita");
  const total = useMemo(() => getLength(d), [d]);
  const s = clamp01(Math.min(start, end));
  const e = clamp01(Math.max(start, end));
  const visible = (e - s) * total;
  if (visible < 0.5 || total === 0) return null;

  const n = Math.max(2, Math.min(260, Math.ceil(visible / 5)));
  const pts: Pt[] = [];
  const widths: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const L = s * total + t * visible;
    const p = getPointAtLength(d, L);
    pts.push({ x: p.x, y: p.y });
    const tw = taper ? 0.3 + 0.7 * smoothstep(t / 0.45) : 1;
    widths.push(width * tw * (widthAt ? widthAt(L / total) : 1));
  }
  // normais p/ o fio de brilho
  const hl: Pt[] = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const off = widths[i] * 0.22;
    return { x: p.x + (dy / len) * off, y: p.y - (dx / len) * off };
  });
  const whole = poly(pts);
  const shadowOff = Math.max(4, width * 0.36);

  return (
    <g opacity={opacity}>
      <defs>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={width * 0.7} />
        </filter>
      </defs>
      {glow > 0 && (
        <path d={whole} fill="none" stroke={COLORS.amber} strokeWidth={width * 1.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.55 * clamp01(glow)} filter={`url(#${id}-blur)`} />
      )}
      {shadow && (
        <g transform={`translate(0 ${shadowOff})`} opacity={0.3}>
          {pts.slice(0, -1).map((p, i) => (
            <line key={i} x1={p.x} y1={p.y} x2={pts[i + 1].x} y2={pts[i + 1].y} stroke={COLORS.navyNight} strokeWidth={widths[i]} strokeLinecap="round" />
          ))}
        </g>
      )}
      {pts.slice(0, -1).map((p, i) => (
        <line
          key={i}
          x1={p.x}
          y1={p.y}
          x2={pts[i + 1].x}
          y2={pts[i + 1].y}
          stroke={colorAt(stops, i / (pts.length - 2 || 1))}
          strokeWidth={widths[i]}
          strokeLinecap="round"
        />
      ))}
      {highlight && (
        <path
          d={poly(hl.slice(Math.floor(hl.length * 0.25)))}
          fill="none"
          stroke={mixHex(COLORS.amber, COLORS.white, 0.55)}
          strokeWidth={Math.max(1.5, width * 0.14)}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.6}
        />
      )}
      {/* cabeça luminosa */}
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={widths[widths.length - 1] * 0.22} fill={COLORS.white} opacity={0.55 * clamp01(glow + 0.3)} />
    </g>
  );
};

export type FitaSvgProps = FitaProps & {
  width?: number;
  /** Dimensões do <svg> (padrão 1920×1080, viewBox igual). */
  canvasWidth?: number;
  canvasHeight?: number;
  style?: React.CSSProperties;
};

/** Versão <svg> absoluta, cobrindo o canvas (padrão 1920×1080). */
export const Fita: React.FC<FitaSvgProps> = ({ canvasWidth = 1920, canvasHeight = 1080, style, ...rest }) => (
  <svg
    width={canvasWidth}
    height={canvasHeight}
    viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
    style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...style }}
  >
    <FitaPath {...rest} />
  </svg>
);
