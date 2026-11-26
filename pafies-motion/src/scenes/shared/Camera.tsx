import React from 'react';
import { AbsoluteFill } from 'remotion';
import { shake } from '../../motion';
import { SHAKES } from '../../cues';

export type CameraProps = {
  /** frame absoluto (para shakes da cue sheet). */
  frame: number;
  scale?: number;
  x?: number;
  y?: number;
  rotate?: number;
  /** ponto de origem do zoom em px (padrão centro). */
  originX?: number;
  originY?: number;
  /** multiplicador da amplitude do shake (ex.: escala do layout). */
  shakeScale?: number;
  noShake?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

/** Câmera viva: drift/zoom + shake de impacto (SHAKES em src/cues.ts). */
export const Camera: React.FC<CameraProps> = ({
  frame,
  scale = 1,
  x = 0,
  y = 0,
  rotate = 0,
  originX,
  originY,
  shakeScale = 1,
  noShake,
  children,
  style,
}) => {
  let sx = 0;
  let sy = 0;
  let sr = 0;
  if (!noShake) {
    for (const s of SHAKES) {
      const k = shake(frame, s.frame, s.dur, s.amp * shakeScale);
      sx += k.x;
      sy += k.y;
      sr += k.rot;
    }
  }
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${x + sx}px, ${y + sy}px) rotate(${rotate + sr}deg) scale(${scale})`,
        transformOrigin: originX !== undefined ? `${originX}px ${originY}px` : '50% 50%',
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
