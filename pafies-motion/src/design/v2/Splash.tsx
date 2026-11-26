/**
 * Splash — explosão de respingos líquidos chapados (ref 1).
 * Gotas alongadas na direção do movimento, coroa de splash + poça no chão,
 * linhas finas radiais de impacto. Controlado por `progress` (0 = impacto, 1 = fim).
 *
 * Coordenadas: o ponto de impacto (chão) fica na âncora SPLASH_ANCHOR do SVG.
 */
import React from "react";
import { INK_V2 } from "./tokensV2";
import { P, blobPath, dropPath, rng, clamp, easeOutCubic } from "./liquid";

export type SplashColors = {
  /** Cor dominante das gotas. */
  main: string;
  /** Segunda cor (mistura ~40%). */
  second: string;
  /** Linhas de impacto no chão; null = sem linhas. */
  lines: string | null;
};

export type SplashProps = {
  /** 0..1 — tempo do splash (0 = instante do impacto). */
  progress: number;
  seed?: number;
  colors?: Partial<SplashColors>;
  /** true = impacto no chão (coroa + poça + gravidade); false = explosão no ar (radial). */
  ground?: boolean;
  /** Escala (1 = caixa de 400×320 px). */
  scale?: number;
  /** Quantidade de gotas. */
  count?: number;
  /** Direção dominante do respingo em graus (0 = →, -90 = ↑). Padrão: ↑ no chão, radial no ar. */
  direction?: number;
  /** Se x/y forem dados, posiciona em absoluto com o ponto de impacto em (x, y). */
  x?: number;
  y?: number;
  style?: React.CSSProperties;
};

const VB = { x: -200, y: -250, w: 400, h: 320 };
export const SPLASH_ANCHOR = { x: -VB.x / VB.w, y: -VB.y / VB.h } as const;

const DEF: SplashColors = { main: INK_V2.blue, second: INK_V2.amber, lines: "#FFFFFF" };

export const Splash: React.FC<SplashProps> = ({
  progress,
  seed = 0,
  colors,
  ground = true,
  scale = 1,
  count = 22,
  direction,
  x,
  y,
  style,
}) => {
  const c = { ...DEF, ...colors };
  const t = clamp(progress);
  const R = rng(seed + 7);
  const els: React.ReactNode[] = [];
  const g = ground ? 520 : 60; // gravidade (u/s²)
  const T = 0.9 * t; // tempo físico

  /* linhas de impacto no chão (finas, achatadas em perspectiva) */
  if (ground && c.lines) {
    const n = 9;
    const grow = easeOutCubic(t * 2.2);
    const fade = 1 - clamp((t - 0.35) / 0.4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R() * 0.3;
      const r0 = 40 + R() * 30;
      const r1 = r0 + (90 + R() * 120) * grow;
      const sx = Math.cos(a);
      const sy = Math.sin(a) * 0.22;
      if (fade <= 0) continue;
      els.push(
        <line
          key={`l${i}`}
          x1={sx * r0}
          y1={sy * r0}
          x2={sx * r1}
          y2={sy * r1}
          stroke={c.lines}
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={fade}
        />,
      );
    }
  }

  /* poça */
  if (ground) {
    const pw = 50 + 70 * easeOutCubic(t * 1.6);
    const shrink = 1 - clamp((t - 0.7) / 0.3) * 0.6;
    els.push(<path key="poca" d={blobPath({ x: 0, y: 0 }, pw * shrink, 10 * shrink, 0, seed * 3 + 1, 0.22, 11)} fill={c.main} />);
    els.push(
      <path key="poca2" d={blobPath({ x: -pw * 0.2, y: -1 }, pw * 0.5 * shrink, 6 * shrink, 0, seed * 3 + 2, 0.3, 9)} fill={c.second} />,
    );
  }

  /* núcleo do impacto (massa que se abre) */
  const core = 1 - clamp(t / 0.28);
  if (core > 0) {
    const cr = 46 * core;
    els.push(
      <path key="core" d={blobPath({ x: 0, y: ground ? -cr * 0.5 : 0 }, cr * 1.25, cr * (ground ? 0.7 : 1), 0, seed + 3, 0.28, 10)} fill={c.main} />,
    );
  }

  /* coroa: espinhos que sobem do chão e caem */
  if (ground) {
    const n = 9;
    const rise = Math.sin(Math.PI * clamp(t * 1.5));
    const rx = 42 + 50 * easeOutCubic(t * 1.6);
    for (let i = 0; i < n; i++) {
      const Rc = rng(seed * 31 + i + 100);
      const a = Math.PI * (0.05 + (0.9 * i) / (n - 1)) + (Rc() - 0.5) * 0.15; // arco de trás
      const bx = Math.cos(a) * rx;
      const by = -Math.sin(a) * rx * 0.2;
      const h = (44 + Rc() * 60) * rise;
      if (h < 2) continue;
      const tilt = Math.cos(a) * 0.55;
      const ang = -Math.PI / 2 + tilt;
      const r = 6 + Rc() * 6;
      const tip: P = { x: bx + Math.cos(ang) * h, y: by + Math.sin(ang) * h };
      els.push(<path key={`c${i}`} d={dropPath(tip, r * (0.6 + 0.4 * rise), ang, h + 4, (Rc() - 0.5) * 0.3)} fill={i % 3 === 1 ? c.second : c.main} />);
      // gotinha que se desprende do topo
      if (t > 0.18 && Rc() > 0.35) {
        const up = (t - 0.18) * 90;
        els.push(
          <circle key={`cd${i}`} cx={tip.x + Math.cos(ang) * up} cy={tip.y + Math.sin(ang) * up + 120 * (t - 0.18) * (t - 0.18) * 6} r={r * 0.55 * (1 - t)} fill={c.main} />,
        );
      }
    }
  }

  /* gotas voando */
  for (let i = 0; i < count; i++) {
    const Rd = rng(seed * 53 + i + 500);
    const rv = [Rd(), Rd(), Rd(), Rd(), Rd(), Rd(), Rd(), Rd()];
    let ri = 0;
    const Rn = () => rv[ri++ % rv.length];
    const base = direction != null ? (direction * Math.PI) / 180 : ground ? -Math.PI / 2 : Rn() * Math.PI * 2;
    const spread = ground || direction != null ? (Rn() - 0.5) * (ground ? 2.6 : 1.6) : 0;
    const a = base + spread;
    const v = 120 + Rn() * 280;
    const vx = Math.cos(a) * v;
    const vy = Math.sin(a) * v;
    const px = vx * T;
    const py = vy * T + 0.5 * g * T * T;
    if (ground && py > 4) continue; // já caiu no chão
    const velx = vx;
    const vely = vy + g * T;
    const sp = Math.hypot(velx, vely);
    const r0 = 4 + Rn() * 11;
    const r = r0 * (1 - Math.pow(t, 2.2)) * (0.6 + 0.4 * easeOutCubic(t * 6));
    if (r < 0.4) continue;
    const len = r * (1.4 + (sp / 120) * (1 - t * 0.6) * 1.8);
    els.push(
      <path key={`d${i}`} d={dropPath({ x: px, y: py }, r, Math.atan2(vely, velx), len, (Rn() - 0.5) * 0.25)} fill={Rn() < 0.6 ? c.main : c.second} />,
    );
    // satélite menor
    if (Rn() > 0.55) {
      const k = 0.78;
      els.push(<circle key={`s${i}`} cx={vx * T * k} cy={vy * T * k + 0.5 * g * T * T * k} r={r * 0.4} fill={c.main} />);
    }
  }

  const W = VB.w * scale;
  const H = VB.h * scale;
  const pos: React.CSSProperties =
    x != null && y != null ? { position: "absolute", left: x - SPLASH_ANCHOR.x * W, top: y - SPLASH_ANCHOR.y * H } : {};
  return (
    <svg width={W} height={H} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} style={{ overflow: "visible", ...pos, ...style }}>
      {els}
    </svg>
  );
};
