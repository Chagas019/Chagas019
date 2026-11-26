import React from 'react';
import { Respingos, type RespingosProps } from '../../design/elements';
import { onTwos, prog } from '../../motion';

export type SplashAtProps = Omit<RespingosProps, 'progress' | 'style'> & {
  frame: number;
  /** frame do impacto que dispara o respingo. */
  at: number;
  x: number;
  y: number;
  /** vida em frames (doc: 10–14). */
  life?: number;
};

/** Respingo posicionado e disparado por um impacto — animado ON TWOS (assinatura do filme). */
export const SplashAt: React.FC<SplashAtProps> = ({ frame, at, x, y, life = 14, canvas = 800, ...rest }) => {
  const f = onTwos(frame);
  if (f < at || f > at + life) return null;
  return (
    <Respingos
      {...rest}
      canvas={canvas}
      progress={prog(f, at, at + life)}
      style={{ position: 'absolute', left: x - canvas / 2, top: y - canvas / 2, pointerEvents: 'none' }}
    />
  );
};
