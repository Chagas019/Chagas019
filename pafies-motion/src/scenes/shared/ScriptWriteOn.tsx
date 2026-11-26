import React from 'react';
import { COLORS } from '../../design/tokens';
import { FLUID, prog } from '../../motion';
import { scriptStyle } from './textStyles';

export type ScriptWriteOnProps = {
  text: string;
  frame: number;
  start: number;
  end: number;
  fontSize: number;
  /** brilho na ponta da "caneta". */
  penGlow?: boolean;
  style?: React.CSSProperties;
};

/**
 * Script (Yellowtail) que se escreve da esquerda para a direita: máscara inclinada (como o traço
 * de uma caneta) + ponto de luz na ponta. Adaptação do "write-on" por traço: fontes não expõem o
 * caminho da pena, então a máscara segue a inclinação natural da letra cursiva.
 */
export const ScriptWriteOn: React.FC<ScriptWriteOnProps> = ({ text, frame, start, end, fontSize, penGlow = true, style }) => {
  const p = prog(frame, start, end, FLUID);
  if (p <= 0) return null;
  const slant = 18; // % de inclinação da borda da máscara
  const edge = -slant * 0.3 + p * (100 + slant * 1.3);
  const clip = p >= 1 ? undefined : `polygon(-10% -30%, ${edge + slant}% -30%, ${edge - slant}% 130%, -10% 130%)`;
  const glow = penGlow && p > 0 && p < 1;
  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      <div style={{ ...scriptStyle(fontSize), padding: '0 0.18em', clipPath: clip, WebkitClipPath: clip }}>{text}</div>
      {glow && (
        <div
          style={{
            position: 'absolute',
            left: `${edge}%`,
            top: '58%',
            width: fontSize * 0.5,
            height: fontSize * 0.5,
            marginLeft: -fontSize * 0.25,
            marginTop: -fontSize * 0.25,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${COLORS.white} 0%, ${COLORS.amber}AA 22%, ${COLORS.amber}00 70%)`,
          }}
        />
      )}
    </div>
  );
};
