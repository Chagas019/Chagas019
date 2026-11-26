/**
 * Utilitários das cenas V2: frame absoluto, fundo chapado, câmera com tremor de impacto.
 * Regras V2: fundo CHAPADO (uma cor sólida), sem degradê/vinheta/grão; trocas = corte seco.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { SCENE_V2, bgAt, shake, type SceneIdV2 } from '../../motion';
import type { LayoutMode } from '../../layout';

export type SceneV2Props = { layout?: LayoutMode };

/** Frame ABSOLUTO do filme dentro da cena (a cena vive numa <Sequence from={scene.from}>). */
export const useV2Frame = (id: SceneIdV2): number => useCurrentFrame() + SCENE_V2[id].from;

/** Fundo chapado vigente (corte seco pelo timeline-v2.json) ou cor fixa. */
export const Flat: React.FC<{ frame: number; color?: string }> = ({ frame, color }) => (
  <AbsoluteFill style={{ background: color ?? bgAt(frame) }} />
);

/** Câmera: tremor curto (on twos) nos impactos dados + escala/offset opcionais. */
export const Cam: React.FC<{
  frame: number;
  impacts?: number[];
  amp?: number;
  dur?: number;
  scale?: number;
  x?: number;
  y?: number;
  rot?: number;
  originX?: number;
  originY?: number;
  children: React.ReactNode;
}> = ({ frame, impacts = [], amp = 14, dur = 6, scale = 1, x = 0, y = 0, rot = 0, originX, originY, children }) => {
  const f2 = frame - (frame % 2);
  let sx = 0;
  let sy = 0;
  let sr = 0;
  for (const i of impacts) {
    const s = shake(f2, i, dur, amp, 'v2cam');
    sx += s.x;
    sy += s.y;
    sr += s.rot;
  }
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${x + sx}px, ${y + sy}px) rotate(${rot + sr}deg) scale(${scale})`,
        transformOrigin: originX != null ? `${originX}px ${originY ?? 0}px` : '50% 50%',
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Posiciona um filho com o centro em (x, y). */
export const at = (x: number, y: number): React.CSSProperties => ({
  position: 'absolute',
  left: x,
  top: y,
  transform: 'translate(-50%, -50%)',
});

/** Sombra chapada sólida (sem blur) para tipografia sobre fundo chapado. */
export const hardShadow = (color: string, dy = 8, dx = 0) => `${dx}px ${dy}px 0 ${color}`;
