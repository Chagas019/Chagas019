/**
 * Camada global por cima de tudo: grão on twos, vinheta e flashes de impacto (2 frames).
 * Usada no filme inteiro e nas cenas isoladas (mesmo frame absoluto).
 */
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { COLORS, GRAIN } from '../design/tokens';
import { Grao } from '../design/elements';
import { onTwos } from '../motion';
import { FLASHES, GRAIN_BREAK } from '../cues';

const FLASH_COLOR = { white: COLORS.white, amber: COLORS.amber, gold: COLORS.goldLight } as const;

export const FilmOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const { width, height } = useVideoConfig();
  const fl = FLASHES.find((x) => frame >= x.frame && frame < x.frame + x.dur);
  const grain = frame >= GRAIN_BREAK.from && frame <= GRAIN_BREAK.to ? GRAIN.opacityBreak : GRAIN.opacity;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {fl && <AbsoluteFill style={{ background: FLASH_COLOR[fl.color], opacity: fl.opacity, mixBlendMode: 'screen' }} />}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 48%, ${COLORS.navyNight}00 52%, ${COLORS.navyNight}66 86%, ${COLORS.navyNight}AA 100%)`,
        }}
      />
      <Grao seed={onTwos(frame)} opacity={grain} width={width} height={height} />
    </AbsoluteFill>
  );
};
