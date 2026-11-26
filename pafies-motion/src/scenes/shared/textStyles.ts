import type React from 'react';
import { COLORS, SHADOWS, TRACKING } from '../../design/tokens';
import { FONT_CONDENSED, FONT_DISPLAY, FONT_SANS, FONT_SCRIPT } from '../../design/fonts';

/** Estilos tipográficos do filme (docs/01 §3). */
export const displayStyle = (fontSize: number, shadow: string = SHADOWS.text): React.CSSProperties => ({
  fontFamily: FONT_DISPLAY,
  fontWeight: 900,
  fontSize,
  lineHeight: 1,
  letterSpacing: TRACKING.display900,
  color: COLORS.cream,
  textShadow: shadow,
  whiteSpace: 'pre',
});

export const condensedStyle = (fontSize: number): React.CSSProperties => ({
  fontFamily: FONT_CONDENSED,
  fontWeight: 400,
  fontSize,
  lineHeight: 1,
  letterSpacing: TRACKING.condensed,
  color: COLORS.cream,
  textShadow: SHADOWS.text,
  whiteSpace: 'pre',
});

export const scriptStyle = (fontSize: number): React.CSSProperties => ({
  fontFamily: FONT_SCRIPT,
  fontWeight: 400,
  fontSize,
  lineHeight: 1.25,
  color: COLORS.cream,
  textShadow: SHADOWS.text,
  whiteSpace: 'pre',
});

export const sansStyle = (fontSize: number, weight: 600 | 800, tracking: string): React.CSSProperties => ({
  fontFamily: FONT_SANS,
  fontWeight: weight,
  fontSize,
  lineHeight: 1,
  letterSpacing: tracking,
  color: COLORS.cream,
  whiteSpace: 'pre',
});

/** Elemento centrado em (x, y) — wrapper absoluto que não altera o layout interno. */
export const centeredAt = (x: number, y: number): React.CSSProperties => ({
  position: 'absolute',
  left: x,
  top: y,
  transform: 'translate(-50%, -50%)',
});
