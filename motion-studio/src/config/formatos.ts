// Formatos padrão do estúdio. Dono: agente CÓDIGO.
export const FPS = 60;

export const FORMATOS = {
  vertical: {width: 1080, height: 1920},
  horizontal: {width: 1920, height: 1080},
} as const;

export type Formato = keyof typeof FORMATOS;

/** Segundos → frames (arredondado, determinístico). */
export const seg = (s: number, fps = FPS) => Math.round(s * fps);
/** Milissegundos → frames. */
export const msParaFrame = (ms: number, fps = FPS) => Math.round((ms / 1000) * fps);
/** Frames → milissegundos. */
export const frameParaMs = (frame: number, fps = FPS) => (frame / fps) * 1000;

/** Margens seguras (título/ação) relativas ao formato. */
export const areaSegura = (width: number, height: number) => {
  const vertical = height > width;
  return {
    x: Math.round(width * (vertical ? 0.08 : 0.06)),
    topo: Math.round(height * (vertical ? 0.1 : 0.08)),
    // Vertical: reserva a faixa inferior usada pela interface de Reels/TikTok/Shorts.
    base: Math.round(height * (vertical ? 0.2 : 0.1)),
  };
};

/** Unidade responsiva: 1u = 1px no lado menor de 1080. */
export const unidade = (width: number, height: number) => Math.min(width, height) / 1080;
