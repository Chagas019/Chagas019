import {
  AdditiveBlending, CanvasTexture, Color, DoubleSide, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, type MeshStandardMaterialParameters,
  SRGBColorSpace, type Material, type Texture,
} from 'three';
import { getAsphaltTexture, getConcreteTexture, getRoughnessTexture, getGrassTexture, getStoneTexture, getWoodTexture } from './textures';

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
    color: new Color('#26384a'), metalness: 0.6, roughness: 0.03, transparent: true, opacity: 0.8, ior: 1.52, specularIntensity: 1,
    envMapIntensity: 2.4, reflectivity: 0.9, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false,
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
  paving: std('#94908a', 0.92),
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
  paint: new MeshPhysicalMaterial({ color: new Color('#ffffff'), roughness: 0.28, metalness: 0.65, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.4 }),
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

let real: ReturnType<typeof createRealMaterials> | null = null;

function createRealMaterials() {
  const tex = (t: Texture, rx: number, ry: number, rot = 0) => {
    const c = t.clone();
    c.needsUpdate = true;
    c.repeat.set(rx, ry);
    if (rot) {
      c.center.set(0.5, 0.5);
      c.rotation = rot;
    }
    return c;
  };
  const wood = getWoodTexture();
  // concreto branco com leve textura (UV em metros: 1 ladrilho a cada 4 m)
  MAT.concrete.map = tex(getConcreteTexture(), 0.25, 0.25);
  // microdetalhe: manchas de rugosidade e relevo sutil (superfícies menos "plásticas")
  const rough = (r: number) => tex(getRoughnessTexture(), r, r);
  MAT.concrete.roughnessMap = rough(0.3);
  MAT.concrete.bumpMap = MAT.concrete.map;
  MAT.concrete.bumpScale = 0.4;
  MAT.concrete.needsUpdate = true;
  return {
    wood: new MeshStandardMaterial({ map: tex(wood, 1, 0.5), bumpMap: tex(wood, 1, 0.5), bumpScale: 1.2, roughnessMap: rough(0.6), roughness: 0.75, color: new Color('#ffffff') }),
    soffit: new MeshStandardMaterial({ map: tex(wood, 0.5, 1, Math.PI / 2), bumpMap: tex(wood, 0.5, 1, Math.PI / 2), bumpScale: 0.8, roughness: 0.6, color: new Color('#f2e2d2') }),
    stone: new MeshStandardMaterial({ map: tex(getStoneTexture(), 0.5, 0.5), bumpMap: tex(getStoneTexture(), 0.5, 0.5), bumpScale: 0.9, roughnessMap: rough(0.4), roughness: 0.7 }),
    graphite: new MeshStandardMaterial({ color: new Color('#2a2d32'), roughness: 0.42, metalness: 0.55, roughnessMap: rough(0.5) }),
    plants: new MeshStandardMaterial({ color: new Color('#4d7240'), roughness: 0.85, flatShading: true }),
    ledWarm: new MeshBasicMaterial({ color: new Color('#ffcf8f'), toneMapped: false }),
    grass: (repeat: number) => new MeshStandardMaterial({ map: tex(getGrassTexture(), repeat, repeat), roughness: 1 }),
    asphalt: (repeat: number) => new MeshStandardMaterial({ map: tex(getAsphaltTexture(), repeat, repeat), roughness: 0.92 }),
  };
}

/** Materiais com textura (criados sob demanda, só no navegador). */
export function realMaterials() {
  if (!real) real = createRealMaterials();
  return real;
}
