import React from 'react';
import { AbsoluteFill } from 'remotion';

export type HeadRevealProps = {
  /** x da cabeça da fita (px da composição). */
  headX: number;
  /** progresso da passada (0 = antes, 1 = já passou; entre = cabeça sobre a palavra). */
  pass: number;
  direction?: 'ltr' | 'rtl';
  width: number;
  children: React.ReactNode;
};

/**
 * Revelação por máscara "atrás da cabeça da fita": a palavra só existe do lado por onde a fita
 * já passou. Máscara em coordenadas de tela, então funciona com palavras inclinadas.
 */
export const HeadReveal: React.FC<HeadRevealProps> = ({ headX, pass, direction = 'ltr', width, children }) => {
  if (pass <= 0) return null;
  let clip: string | undefined;
  if (pass < 1) {
    clip =
      direction === 'ltr'
        ? `polygon(-50% -50%, ${headX}px -50%, ${headX}px 150%, -50% 150%)`
        : `polygon(${headX}px -50%, ${width * 1.5}px -50%, ${width * 1.5}px 150%, ${headX}px 150%)`;
  }
  return <AbsoluteFill style={{ clipPath: clip, WebkitClipPath: clip }}>{children}</AbsoluteFill>;
};
