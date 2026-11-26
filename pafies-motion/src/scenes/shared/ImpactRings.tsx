import React from 'react';
import { COLORS } from '../../design/tokens';
import { EXPO_OUT, prog } from '../../motion';

export type ImpactRingsProps = {
  /** frame absoluto atual e frame do impacto. */
  frame: number;
  at: number;
  x: number;
  y: number;
  /** raio final (doc: 600). */
  radius?: number;
  /** duração (doc: 14 f). */
  dur?: number;
  colors?: readonly string[];
  /** espessura inicial do traço (doc: 6 → 0). */
  stroke?: number;
  /** atraso entre anéis. */
  gap?: number;
};

/** Anéis de impacto (docs/01 §5.10): 2–3 círculos de traço expandindo e afinando. */
export const ImpactRings: React.FC<ImpactRingsProps> = ({
  frame,
  at,
  x,
  y,
  radius = 600,
  dur = 14,
  colors = [COLORS.amber, COLORS.white, COLORS.amber],
  stroke = 6,
  gap = 3,
}) => {
  if (frame < at || frame > at + dur + gap * colors.length) return null;
  const pad = radius + stroke * 2;
  return (
    <svg
      width={pad * 2}
      height={pad * 2}
      viewBox={`${-pad} ${-pad} ${pad * 2} ${pad * 2}`}
      style={{ position: 'absolute', left: x - pad, top: y - pad, overflow: 'visible', pointerEvents: 'none' }}
    >
      {colors.map((c, i) => {
        const t = prog(frame, at + i * gap, at + i * gap + dur);
        if (t <= 0 || t >= 1) return null;
        const e = EXPO_OUT(t);
        const r = radius * (0.08 + 0.92 * e) * (1 - i * 0.18);
        return <circle key={i} r={r} fill="none" stroke={c} strokeWidth={Math.max(0.1, stroke * (1 - t))} opacity={1 - t * 0.4} />;
      })}
    </svg>
  );
};
