/** Perfis de qualidade gráfica. A detecção inicial é conservadora; o monitor de FPS ajusta em tempo real. */
export type Quality = 'low' | 'medium' | 'high';

export interface QualityProfile {
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  postprocessing: boolean;
  antialias: boolean;
  cityBlocks: number;
  trees: number;
  envResolution: number;
  /** Distância a partir da qual detalhes finos (montantes, guarda-corpos, paredes internas) somem. */
  detailDistance: number;
}

export const QUALITY: Record<Quality, QualityProfile> = {
  low: { dpr: [0.75, 1], shadows: false, shadowMapSize: 512, postprocessing: false, antialias: false, cityBlocks: 70, trees: 60, envResolution: 64, detailDistance: 220 },
  medium: { dpr: [1, 1.5], shadows: true, shadowMapSize: 1024, postprocessing: false, antialias: true, cityBlocks: 140, trees: 130, envResolution: 128, detailDistance: 360 },
  high: { dpr: [1, 2], shadows: true, shadowMapSize: 2048, postprocessing: true, antialias: false, cityBlocks: 220, trees: 220, envResolution: 256, detailDistance: 520 },
};

export const QUALITY_LABEL: Record<Quality, string> = { low: 'Leve', medium: 'Equilibrada', high: 'Máxima' };

export function detectQuality(): Quality {
  if (typeof navigator === 'undefined') return 'medium';
  // ?quality=low|medium|high força um perfil (útil para apresentações e testes)
  const forced = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('quality') : null;
  if (forced === 'low' || forced === 'medium' || forced === 'high') return forced;
  const ua = navigator.userAgent || '';
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (mobile) return cores >= 8 && memory >= 6 ? 'medium' : 'low';
  if (cores <= 2 || memory <= 2) return 'low';
  if (cores >= 8 && memory >= 8) return 'high';
  return 'medium';
}

export type WebGLSupport = { ok: true; webgl2: boolean } | { ok: false; reason: string };

export function checkWebGL(): WebGLSupport {
  try {
    if (typeof window === 'undefined') return { ok: false, reason: 'Sem janela do navegador.' };
    if (new URLSearchParams(window.location.search).has('no3d')) return { ok: false, reason: 'Modo sem 3D solicitado.' };
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    if (gl2) return { ok: true, webgl2: true };
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) return { ok: true, webgl2: false };
    return { ok: false, reason: 'Este navegador ou dispositivo não oferece WebGL.' };
  } catch {
    return { ok: false, reason: 'Não foi possível iniciar o WebGL neste dispositivo.' };
  }
}
