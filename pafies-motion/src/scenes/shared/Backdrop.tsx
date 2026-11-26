import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../../design/tokens';
import { breathe } from '../../motion';

export type BackdropVariant = 'night' | 'navy' | 'electric';

const GRADIENT: Record<BackdropVariant, string> = {
  // S01/S04: mais navyNight (intro escura, respiro)
  night: `radial-gradient(ellipse at 50% 45%, ${COLORS.navySoft} 0%, ${COLORS.navy} 38%, ${COLORS.navyNight} 92%)`,
  // gradBg padrão
  navy: `radial-gradient(ellipse at 50% 45%, ${COLORS.navySoft} 0%, ${COLORS.navy} 55%, ${COLORS.navyNight} 100%)`,
  // gradElectric (S03)
  electric: `radial-gradient(ellipse at 50% 50%, ${COLORS.electricLight} 0%, ${COLORS.electric} 50%, ${COLORS.navy} 100%)`,
};

type BlobSpec = { x: number; y: number; r: number; period: number; phase: number };
// posições relativas (0..1) — blobs gigantes de fundo, deriva lenta
const BLOBS: BlobSpec[] = [
  { x: 0.18, y: 0.22, r: 0.36, period: 150, phase: 0 },
  { x: 0.84, y: 0.3, r: 0.3, period: 120, phase: 40 },
  { x: 0.55, y: 0.92, r: 0.4, period: 135, phase: 80 },
];

export type BackdropProps = {
  variant?: BackdropVariant;
  frame: number;
  width: number;
  height: number;
  /** opacidade dos blobs de fundo (0 = sem blobs). */
  blobs?: number;
  /** cor dos blobs (padrão navySoft; no electric, electricLight). */
  blobColor?: string;
  /** deslocamento de câmera (px) — blobs se movem ×0.3 (parallax). */
  parallax?: { x: number; y: number };
  /** escurecimento extra 0..1 (intro "quase total"). */
  dim?: number;
};

/** Fundo com profundidade: degradê radial + blobs desfocados em parallax + escurecimento opcional. */
export const Backdrop: React.FC<BackdropProps> = ({
  variant = 'navy',
  frame,
  width,
  height,
  blobs = 0.4,
  blobColor = COLORS.navySoft,
  parallax = { x: 0, y: 0 },
  dim = 0,
}) => {
  const L = Math.max(width, height);
  return (
    <AbsoluteFill style={{ background: GRADIENT[variant], overflow: 'hidden' }}>
      {blobs > 0 &&
        BLOBS.map((b, i) => {
          const r = b.r * L * (1 + 0.04 * breathe(frame, b.period, b.phase));
          const x = b.x * width + 40 * breathe(frame, b.period * 1.3, b.phase) + parallax.x * 0.3;
          const y = b.y * height + 30 * breathe(frame, b.period * 1.7, b.phase + 20) + parallax.y * 0.3;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x - r,
                top: y - r,
                width: r * 2,
                height: r * 2,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${blobColor} 0%, ${blobColor}00 68%)`,
                opacity: blobs,
              }}
            />
          );
        })}
      {dim > 0 && <AbsoluteFill style={{ background: COLORS.navyNight, opacity: dim }} />}
    </AbsoluteFill>
  );
};
