import React from 'react';
import { COLORS } from '../../design/tokens';
import { useSvgId } from '../../design/elements';

export type StitchLineProps = {
  d: string;
  /** 0..1 quanto do pesponto está desenhado. */
  progress?: number;
  opacity?: number;
  width: number;
  height: number;
  color?: string;
  strokeWidth?: number;
};

/** Pesponto (docs/01 §5.13): tracejado 14/10, 3 px — eco da costura do pin. */
export const StitchLine: React.FC<StitchLineProps> = ({
  d,
  progress = 1,
  opacity = 1,
  width,
  height,
  color = COLORS.navySoft,
  strokeWidth = 3,
}) => {
  const id = useSvgId('stitch');
  return (
  <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity }}>
    <defs>
      <mask id={id}>
        <path d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth={strokeWidth * 4} strokeDasharray={`${progress} 1`} />
      </mask>
    </defs>
    <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray="14 10" strokeLinecap="round" mask={`url(#${id})`} />
  </svg>
  );
};
