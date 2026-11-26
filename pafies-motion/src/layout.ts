/**
 * layout.ts — layout horizontal (1920×1080) × vertical (1080×1920).
 * Cada cena recebe `layout` ('h' | 'v'); sem prop, deduz pelo tamanho da composição.
 */
import { useVideoConfig } from 'remotion';

export type LayoutMode = 'h' | 'v';
export type SceneProps = { layout?: LayoutMode };

/** Zona segura (docs/02 §4): vertical tem UI de redes sociais em cima e embaixo. */
export const SAFE = {
  h: { left: 96, right: 96, top: 60, bottom: 60 },
  v: { left: 90, right: 90, top: 220, bottom: 300 },
} as const;

/** Largura média de um caractere (em em) por família — para caber palavras sem medir no DOM. */
export const EM_PER_CHAR = {
  display: 0.94, // Unbounded 900 (larga)
  condensed: 0.56, // Anton (medido: ~0,55 em/caractere em caixa alta)
  sans: 0.72, // Bricolage
} as const;

export type Layout = ReturnType<typeof useLayout>;

export const useLayout = (mode?: LayoutMode) => {
  const { width: W, height: H } = useVideoConfig();
  const isV = mode ? mode === 'v' : H > W;
  const safe = isV ? SAFE.v : SAFE.h;
  const usableW = W - safe.left - safe.right;
  /** escolhe valor horizontal ou vertical. */
  const pick = <T,>(h: T, v: T): T => (isV ? v : h);
  /** maior dimensão (speed lines, blobs de fundo, vinheta). */
  const long = Math.max(W, H);
  /** fontSize que cabe na largura útil: min(base, usableW / (n × em/char)). */
  const fit = (text: string, base: number, emPerChar: number = EM_PER_CHAR.display, maxW = usableW) =>
    Math.min(base, maxW / (Array.from(text).length * emPerChar));
  return { isV, W, H, cx: W / 2, cy: H / 2, safe, usableW, pick, long, fit };
};
