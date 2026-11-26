import React from 'react';
import { COLORS, GRADIENT_STOPS, SKIN } from '../../design/tokens';
import { useSvgId, mixHex } from '../../design/elements';

export type BigArmProps = {
  /** posição da mão (px da composição). */
  x: number;
  y: number;
  /** direção da mão → ombro em graus (0 = ombro à direita, 180 = à esquerda). */
  angle: number;
  /** comprimento do antebraço+braço visível (px). */
  length: number;
  /** espessura da manga (px). */
  thickness: number;
  /** A = manga quente xadrez, pele clara · B = manga laranja, pele morena (docs/01 §5.6). */
  variant: 'A' | 'B';
  /** mão fechada segurando o bastão (A) ou aberta (B). */
  grip?: 'closed' | 'open';
  /** flexão do cotovelo (graus). */
  bend?: number;
};

const OUT = COLORS.navyNight;

/**
 * Braço em "câmera baixa" (S03) — extensão do <Pessoa />: mesmas primitivas (cápsulas, círculos),
 * contorno navyNight de esmalte, manga xadrez/laranja e tons de pele do design.
 */
export const BigArm: React.FC<BigArmProps> = ({ x, y, angle, length, thickness, variant, grip = 'open', bend = 0 }) => {
  const id = useSvgId('arm');
  const skin = variant === 'A' ? SKIN.light : SKIN.medium;
  const sleeveA = GRADIENT_STOPS.warm[0].color;
  const sleeveA2 = GRADIENT_STOPS.warm[1].color;
  // (gradiente em <line> falha: bbox de altura zero) → B usa laranja sólido + filete âmbar
  const sleeve = variant === 'A' ? `url(#${id}-plaid)` : COLORS.orange;
  const t = thickness;
  const ow = Math.max(4, t * 0.07);
  const fore = length * 0.42;
  const upper = length * 0.7;
  const hand = t * 0.62;
  return (
    <svg
      width={1}
      height={1}
      style={{ position: 'absolute', left: x, top: y, overflow: 'visible', pointerEvents: 'none' }}
    >
      <defs>
        <pattern id={`${id}-plaid`} width={t * 0.4} height={t * 0.4} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={t * 0.4} height={t * 0.4} fill={sleeveA} />
          <rect width={t * 0.4} height={t * 0.2} fill={sleeveA2} opacity={0.55} />
          <rect width={t * 0.08} height={t * 0.4} fill={COLORS.navySoft} opacity={0.45} />
        </pattern>
        <linearGradient id={`${id}-orange`} x1="0" y1="0" x2="1" y2="1">
          <stop offset={0} stopColor={COLORS.orange} />
          <stop offset={1} stopColor={COLORS.amber} />
        </linearGradient>
      </defs>
      <g transform={`rotate(${angle})`}>
        {/* antebraço (pele) da mão até o punho da manga */}
        <line x1={0} y1={0} x2={fore} y2={0} stroke={OUT} strokeWidth={t * 0.72 + ow * 2} strokeLinecap="round" />
        <line x1={0} y1={0} x2={fore} y2={0} stroke={skin} strokeWidth={t * 0.72} strokeLinecap="round" />
        {/* manga: do punho até fora de quadro, com cotovelo */}
        <g transform={`translate(${fore} 0) rotate(${bend})`}>
          <line x1={0} y1={0} x2={upper} y2={0} stroke={OUT} strokeWidth={t + ow * 2} strokeLinecap="round" />
          <line x1={0} y1={0} x2={upper} y2={0} stroke={sleeve} strokeWidth={t} strokeLinecap="round" />
          <line x1={t * 0.1} y1={-t * 0.18} x2={upper} y2={-t * 0.18} stroke={COLORS.white} strokeWidth={t * 0.1} strokeLinecap="round" opacity={0.22} />
          <line x1={upper * 0.3} y1={t * 0.28} x2={upper} y2={t * 0.28} stroke={OUT} strokeWidth={t * 0.16} strokeLinecap="round" opacity={0.25} />
          {/* punho da manga */}
          <rect x={-t * 0.08} y={-t / 2} width={t * 0.2} height={t} rx={t * 0.08} fill={mixHex(variant === 'A' ? sleeveA : COLORS.orange, OUT, 0.25)} stroke={OUT} strokeWidth={ow * 0.6} />
        </g>
        {/* mão */}
        <circle r={hand + ow} fill={OUT} />
        <circle r={hand} fill={skin} />
        {grip === 'open' ? (
          <>
            {[-0.55, -0.18, 0.18, 0.55].map((k, i) => (
              <g key={i} transform={`rotate(${180 + k * 50})`}>
                <line x1={hand * 0.5} y1={0} x2={hand * 1.55} y2={0} stroke={OUT} strokeWidth={hand * 0.42 + ow * 2} strokeLinecap="round" />
                <line x1={hand * 0.5} y1={0} x2={hand * 1.55} y2={0} stroke={skin} strokeWidth={hand * 0.42} strokeLinecap="round" />
              </g>
            ))}
            <g transform="rotate(115)">
              <line x1={hand * 0.4} y1={0} x2={hand * 1.25} y2={0} stroke={OUT} strokeWidth={hand * 0.45 + ow * 2} strokeLinecap="round" />
              <line x1={hand * 0.4} y1={0} x2={hand * 1.25} y2={0} stroke={skin} strokeWidth={hand * 0.45} strokeLinecap="round" />
            </g>
            <circle r={hand * 0.92} fill={skin} />
          </>
        ) : (
          <>
            {/* dedos fechados: arcos sobre o punho */}
            {[-0.5, 0, 0.5].map((k, i) => (
              <path key={i} d={`M${-hand * 0.65} ${k * hand * 0.75 - hand * 0.22} q ${-hand * 0.35} ${hand * 0.22} 0 ${hand * 0.44}`} fill="none" stroke={OUT} strokeWidth={ow * 0.7} strokeLinecap="round" />
            ))}
          </>
        )}
        <circle cx={-hand * 0.2} cy={-hand * 0.35} r={hand * 0.22} fill={COLORS.white} opacity={0.25} />
      </g>
    </svg>
  );
};
