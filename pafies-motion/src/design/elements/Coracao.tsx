import React, { useMemo } from "react";
import { noise2D } from "@remotion/noise";
import { COLORS, GRADIENT_STOPS } from "../tokens";
import { clamp01, lerp, Pt, smoothClosedPath, smoothstep, useSvgId } from "./geom";

export type CoracaoProps = {
  /** Largura em px. */
  size: number;
  /** 0 = blob amorfo, 1 = coração. */
  morph?: number;
  /** Escala extra (0.08 = +8%). Use para pulso/respiração. */
  pulse?: number;
  /** Fase (rad) da linha d'água interna. */
  wave?: number;
  /** Altura da linha d'água (0 = topo, 1 = base). */
  waterLevel?: number;
  /** Semente/fase do blob inicial. */
  seed?: string | number;
  blobPhase?: number;
  /** Mostrar realce (vírgula branca) e linha d'água. */
  details?: number;
  style?: React.CSSProperties;
};

const N = 120;

/** Pontos do coração (assimétrico, gordinho) em -100..100. */
const heartPoints = (): Pt[] => {
  const pts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    let x = 16 * Math.pow(Math.sin(t), 3);
    let y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    // gordinho: incha o miolo lateral
    x *= 1.1;
    // lóbulo esquerdo 8% maior
    if (x < 0) {
      const k = 1.08;
      x *= k;
      y = (y - 6) * (1 + (k - 1) * smoothstep((6 - y) / 18)) + 6;
    }
    // ponta deslocada levemente à direita
    x += 2.2 * smoothstep((y - 4) / 13);
    pts.push({ x: x * 5.4, y: (y - 2.5) * 5.4 });
  }
  return pts;
};

const HEART = heartPoints();
const CENTER: Pt = HEART.reduce((a, p) => ({ x: a.x + p.x / N, y: a.y + p.y / N }), { x: 0, y: 0 });

export const coracaoPath = (morph: number, seed: string | number = "heart", blobPhase = 0): string => {
  const m = clamp01(morph);
  const pts = HEART.map((p) => {
    const ang = Math.atan2(p.y - CENTER.y, p.x - CENTER.x);
    const n = noise2D(seed, Math.cos(ang) * 0.9 + blobPhase, Math.sin(ang) * 0.9 - blobPhase * 0.7);
    const r = 70 * (1 + 0.16 * n);
    const bx = CENTER.x + Math.cos(ang) * r;
    const by = CENTER.y + Math.sin(ang) * r;
    return { x: lerp(bx, p.x, m), y: lerp(by, p.y, m) };
  });
  return smoothClosedPath(pts);
};

export const Coracao: React.FC<CoracaoProps> = ({
  size,
  morph = 1,
  pulse = 0,
  wave = 0,
  waterLevel = 0.42,
  seed = "heart",
  blobPhase = 0,
  details = 1,
  style,
}) => {
  const id = useSvgId("cor");
  const d = useMemo(() => coracaoPath(morph, seed, blobPhase), [morph, seed, blobPhase]);
  const wy = lerp(-80, 80, waterLevel);
  const wavePts: string[] = [];
  for (let x = -120; x <= 120; x += 6) {
    wavePts.push(`${x} ${(wy + Math.sin(x * 0.045 + wave) * 5 + Math.sin(x * 0.11 - wave * 1.6) * 2).toFixed(2)}`);
  }
  const waveLine = `M${wavePts.join(" L")}`;
  const det = clamp01(details) * smoothstep((morph - 0.4) / 0.6);
  const s = 1 + pulse;

  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ overflow: "visible", ...style }}>
      <defs>
        <radialGradient id={`${id}-g`} cx="0.35" cy="0.3" r="0.8">
          {GRADIENT_STOPS.heart.map((st) => (
            <stop key={st.offset} offset={st.offset} stopColor={st.color} />
          ))}
        </radialGradient>
        <clipPath id={`${id}-c`}>
          <path d={d} />
        </clipPath>
      </defs>
      <g transform={`translate(0 6) scale(${s}) translate(0 -6)`}>
        <path d={d} fill={COLORS.navyNight} opacity={0.35} transform="translate(0 5)" />
        <path d={d} fill={`url(#${id}-g)`} />
        <g clipPath={`url(#${id}-c)`} opacity={det}>
          {/* corpo d'água inferior (mais denso) */}
          <path d={`${waveLine} L120 120 L-120 120 Z`} fill={COLORS.tealDeep} opacity={0.28} />
          <path d={waveLine} fill="none" stroke={COLORS.tealLight} strokeWidth={2.6} strokeLinecap="round" opacity={0.75} />
          {/* borda interna luminosa */}
          <path d={d} fill="none" stroke={COLORS.tealLight} strokeWidth={5} opacity={0.35} transform="translate(2 3)" />
        </g>
        {/* reflexo em vírgula no lóbulo esquerdo */}
        <g opacity={0.4 * det + 0.1 * (1 - det)}>
          <path d="M-74 -42 C-80 -26 -78 -10 -68 2" fill="none" stroke={COLORS.white} strokeWidth={9} strokeLinecap="round" />
          <circle cx={-62} cy={14} r={4.2} fill={COLORS.white} />
        </g>
      </g>
    </svg>
  );
};
