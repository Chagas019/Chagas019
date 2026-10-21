import {
  AdditiveBlending, CanvasTexture, Color, DoubleSide, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, type MeshStandardMaterialParameters,
  SRGBColorSpace, type Material,
} from 'three';

/**
 * Biblioteca de materiais compartilhados (paleta: grafite, branco, cinza mineral, azul profundo
 * e detalhes metálicos discretos). Criados uma única vez e reaproveitados por toda a cena.
 */
function std(color: string, roughness: number, metalness = 0, extra: MeshStandardMaterialParameters = {}) {
  return new MeshStandardMaterial({ color: new Color(color), roughness, metalness, ...extra });
}

export const MAT = {
  concrete: std('#e4e5e2', 0.82, 0.0),
  concreteRaw: std('#a9adb0', 0.9),
  core: std('#8b9096', 0.9),
  glass: new MeshPhysicalMaterial({
    color: new Color('#5b7c9e'), metalness: 0.35, roughness: 0.05, transparent: true, opacity: 0.58,
    envMapIntensity: 2.1, reflectivity: 0.9, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false,
  }),
  railGlass: new MeshPhysicalMaterial({
    color: new Color('#cfe2f0'), metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.22,
    envMapIntensity: 1.2, depthWrite: false, side: DoubleSide,
  }),
  metal: std('#59626d', 0.4, 0.55),
  metalLight: std('#b9bec5', 0.3, 0.9),
  bronze: std('#7d6a52', 0.42, 0.8),
  interiorWall: std('#f1efea', 0.95),
  wood: std('#a88563', 0.62),
  woodDark: std('#5d4633', 0.55),
  stone: std('#d8d4cc', 0.5),
  fabric: std('#cfc8bd', 0.98),
  fabricDark: std('#4a4f57', 0.95),
  fabricBlue: std('#2e4a6b', 0.95),
  white: std('#f6f6f4', 0.45),
  black: std('#16181b', 0.4, 0.3),
  plant: std('#4c6b45', 0.85),
  plantDark: std('#2f4a33', 0.9),
  soil: std('#5a4636', 1),
  deck: std('#9b7656', 0.7),
  paving: std('#bdbab3', 0.92),
  asphalt: std('#2b2e33', 0.95),
  lawn: std('#5f7d4f', 1),
  water: std('#2c6f8f', 0.1),
  tile: std('#7fc0d6', 0.35),
  glow: new MeshBasicMaterial({ color: new Color('#ffffff'), toneMapped: false, transparent: true, blending: AdditiveBlending, depthWrite: false }),
  lightWarm: new MeshBasicMaterial({ color: new Color('#ffd7a1'), toneMapped: false }),
  lightCool: new MeshBasicMaterial({ color: new Color('#e9f2ff'), toneMapped: false }),
  highlight: new MeshBasicMaterial({ color: new Color('#79a8ff'), transparent: true, opacity: 0.12, depthWrite: false }),
  carGlass: std('#101418', 0.15, 0.6),
  tire: std('#141414', 0.9),
  paint: std('#ffffff', 0.32, 0.6),
  marking: std('#e9e7df', 0.7),
  markingYellow: std('#d9b23a', 0.7),
} satisfies Record<string, Material>;

export type MatKey = keyof typeof MAT;

/** Placa com texto (sinalização, numeração) desenhada em canvas. */
export function makeLabelTexture(text: string, opts: { w?: number; h?: number; bg?: string; fg?: string; font?: string; sub?: string } = {}) {
  const w = opts.w ?? 512;
  const h = opts.h ?? 192;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = opts.bg ?? '#1d2229';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = opts.fg ?? '#f2f2ee';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // reduz a fonte até o texto caber em 90% da largura da placa
  let size = Math.round(h * 0.5);
  const family = opts.font ? null : 'Inter, Arial, sans-serif';
  ctx.font = opts.font ?? `600 ${size}px ${family}`;
  while (!opts.font && ctx.measureText(text).width > w * 0.9 && size > 10) {
    size -= 2;
    ctx.font = `600 ${size}px ${family}`;
  }
  ctx.fillText(text, w / 2, opts.sub ? h * 0.4 : h / 2);
  if (opts.sub) {
    ctx.font = `500 ${Math.round(h * 0.2)}px Inter, Arial, sans-serif`;
    ctx.globalAlpha = 0.75;
    ctx.fillText(opts.sub, w / 2, h * 0.78);
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
