// Logo "PAfies" da camiseta: P cursivo + "A" em forma de manto/triângulo com cruz + "fies" cursivo.
// Elemento SVG (<g>) para ser usado dentro de um <svg>.
import React from 'react';
import { SCRIPT_FONT } from '../lib/fonts';

const fontFamily = SCRIPT_FONT;

export const PafiesLogo: React.FC<{ width?: number; color?: string; accent?: string; glow?: number }> = ({
  width = 300,
  color = '#ffffff',
  accent = '#8fd0ff',
  glow = 0,
}) => {
  const s = width / 300;
  return (
    <g transform={`scale(${s})`} style={glow ? { filter: `drop-shadow(0 0 ${glow}px ${accent})` } : undefined}>
      <text x={-150} y={30} fontFamily={fontFamily} fontSize={118} fill={color}>
        P
      </text>
      {/* "A": manto triangular com cruz e auréola */}
      <g transform="translate(-44,0)">
        <path d="M0 -62 L-30 42 L30 42 Z" fill={accent} stroke={color} strokeWidth={4} strokeLinejoin="round" />
        <path d="M0 -40 L-12 40 M0 -40 L12 40" stroke={color} strokeWidth={3} />
        <circle cx={0} cy={-70} r={9} fill="none" stroke={color} strokeWidth={3.5} />
        <path d="M0 -98 L0 -80 M-7 -91 L7 -91" stroke={color} strokeWidth={3.5} strokeLinecap="round" />
      </g>
      <text x={-6} y={30} fontFamily={fontFamily} fontSize={104} fill={color}>
        fies
      </text>
    </g>
  );
};
