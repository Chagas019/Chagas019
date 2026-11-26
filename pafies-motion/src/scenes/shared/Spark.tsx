import React from 'react';
import { COLORS } from '../../design/tokens';

export type SparkProps = {
  x: number;
  y: number;
  /** escala geral (0 = invisível). */
  scale?: number;
  /** mostra os 4 raios-cruz (on twos, decidido por quem chama). */
  rays?: boolean;
  core?: string;
  halo?: string;
  /** raio do núcleo (doc: 14 px de diâmetro). */
  coreRadius?: number;
};

/** Faísca (docs/01 §5.2): núcleo âmbar + halo radial laranja + raios em cruz. */
export const Spark: React.FC<SparkProps> = ({
  x,
  y,
  scale = 1,
  rays = false,
  core = COLORS.amber,
  halo = COLORS.orange,
  coreRadius = 7,
}) => {
  if (scale <= 0.001) return null;
  const R = 70;
  return (
    <svg
      width={R * 2}
      height={R * 2}
      viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`}
      style={{ position: 'absolute', left: x - R, top: y - R, overflow: 'visible', transform: `scale(${scale})` }}
    >
      <defs>
        <radialGradient id="spark-halo">
          <stop offset={0} stopColor={halo} stopOpacity={0.85} />
          <stop offset={0.35} stopColor={halo} stopOpacity={0.35} />
          <stop offset={1} stopColor={halo} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle r={60} fill="url(#spark-halo)" />
      {rays &&
        [0, 90, 180, 270].map((a) => (
          <rect key={a} x={-1} y={-56} width={2} height={40} fill={COLORS.white} transform={`rotate(${a})`} opacity={0.9} />
        ))}
      <circle r={coreRadius} fill={core} />
      <circle r={coreRadius * 0.45} cx={-coreRadius * 0.2} cy={-coreRadius * 0.25} fill={COLORS.white} opacity={0.8} />
    </svg>
  );
};
