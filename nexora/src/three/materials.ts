/**
 * Materiais do gerador arquitetônico. As texturas são procedurais (canvas), então o modelo não depende
 * de arquivos externos. Os nomes "nx_*" são lidos pelo visualizador (ex.: nx_lamp acende no modo noturno).
 */
import * as THREE from 'three';

export type FacadeStyle = 'concreto' | 'branco' | 'madeira' | 'grafite';

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat: [number, number] = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  // o exportador GLB grava JPEG (bem menor que PNG)
  t.userData.mimeType = 'image/jpeg';
  return t;
}

/** Ruído determinístico para que os renders saiam iguais a cada execução */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function noise(ctx: CanvasRenderingContext2D, s: number, base: string, amount: number, seed: number, dot = 1) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  const r = rng(seed);
  for (let i = 0; i < s * s * 0.12; i++) {
    const v = (r() - 0.5) * amount;
    ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    ctx.fillRect(r() * s, r() * s, dot, dot);
  }
}

const woodPlanks = (light: boolean, seed: number) =>
  canvasTexture(512, (ctx, s) => {
    const r = rng(seed);
    const rows = 8;
    for (let i = 0; i < rows; i++) {
      const tone = light ? 178 + r() * 26 : 112 + r() * 26;
      ctx.fillStyle = `rgb(${tone}, ${tone * 0.78}, ${tone * 0.56})`;
      ctx.fillRect(0, (i * s) / rows, s, s / rows);
      for (let g = 0; g < 40; g++) {
        ctx.strokeStyle = `rgba(60,35,15,${0.04 + r() * 0.06})`;
        ctx.lineWidth = 1;
        const y = (i * s) / rows + r() * (s / rows);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(s * 0.3, y + (r() - 0.5) * 6, s * 0.7, y + (r() - 0.5) * 6, s, y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,18,8,0.35)';
      ctx.fillRect(0, (i * s) / rows, s, 1.5);
      ctx.fillRect(((i * 0.37) % 1) * s, (i * s) / rows, 1.5, s / rows);
    }
  });

const slats = () =>
  canvasTexture(512, (ctx, s) => {
    const r = rng(7);
    const n = 24;
    for (let i = 0; i < n; i++) {
      const tone = 120 + r() * 30;
      ctx.fillStyle = `rgb(${tone}, ${tone * 0.74}, ${tone * 0.5})`;
      ctx.fillRect((i * s) / n, 0, s / n - 3, s);
      ctx.fillStyle = 'rgb(28,22,18)';
      ctx.fillRect(((i + 1) * s) / n - 3, 0, 3, s);
    }
  });

export interface MaterialSet {
  facade: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  slab: THREE.MeshStandardMaterial;
  floorWood: THREE.MeshStandardMaterial;
  floorStone: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  deck: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  frame: THREE.MeshStandardMaterial;
  water: THREE.MeshPhysicalMaterial;
  poolTile: THREE.MeshStandardMaterial;
  coping: THREE.MeshStandardMaterial;
  fabric: THREE.MeshStandardMaterial;
  fabricDark: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  white: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  rug: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  leafDark: THREE.MeshStandardMaterial;
  trunk: THREE.MeshStandardMaterial;
  car: THREE.MeshStandardMaterial;
  lamp: THREE.MeshStandardMaterial;
}

const std = (name: string, p: THREE.MeshStandardMaterialParameters) => Object.assign(new THREE.MeshStandardMaterial(p), { name });

export function createMaterials(style: FacadeStyle = 'concreto'): MaterialSet {
  const concreteTex = canvasTexture(512, (ctx, s) => noise(ctx, s, '#b9b7b1', 0.09, 3, 2), [1, 1]);
  const plasterTex = canvasTexture(256, (ctx, s) => noise(ctx, s, '#f1efea', 0.05, 5, 1));
  const grassTex = canvasTexture(512, (ctx, s) => noise(ctx, s, '#71894f', 0.2, 11, 2), [40, 40]);
  const stoneTex = canvasTexture(512, (ctx, s) => {
    noise(ctx, s, '#d9d4cb', 0.08, 13, 2);
    ctx.strokeStyle = 'rgba(80,70,60,0.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(0, (i * s) / 4); ctx.lineTo(s, (i * s) / 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo((i * s) / 2, 0); ctx.lineTo((i * s) / 2, s); ctx.stroke();
    }
  });
  const facadeMap: Record<FacadeStyle, () => THREE.MeshStandardMaterial> = {
    concreto: () => std('nx_facade', { map: concreteTex, roughness: 0.92 }),
    branco: () => std('nx_facade', { map: plasterTex, color: '#ffffff', roughness: 0.85 }),
    madeira: () => std('nx_facade', { map: slats(), roughness: 0.7 }),
    grafite: () => std('nx_facade', { map: concreteTex.clone(), color: '#55585e', roughness: 0.8 }),
  };
  const floorWoodTex = woodPlanks(true, 17);
  floorWoodTex.repeat.set(0.35, 0.35);
  const deckTex = woodPlanks(false, 19);
  deckTex.repeat.set(0.5, 0.5);
  stoneTex.repeat.set(0.5, 0.5);
  return {
    facade: facadeMap[style](),
    wall: std('nx_wall', { map: plasterTex, color: '#f4f2ee', roughness: 0.9 }),
    slab: std('nx_slab', { map: plasterTex, color: '#f7f6f3', roughness: 0.9 }),
    floorWood: std('nx_floor_wood', { map: floorWoodTex, roughness: 0.55 }),
    floorStone: std('nx_floor_stone', { map: stoneTex, roughness: 0.45 }),
    concrete: std('nx_concrete', { map: concreteTex, color: '#cfcbc4', roughness: 0.95 }),
    deck: std('nx_deck', { map: deckTex, roughness: 0.7 }),
    grass: std('nx_grass', { map: grassTex, roughness: 1 }),
    glass: Object.assign(new THREE.MeshPhysicalMaterial({ color: '#c9d8e6', metalness: 0, roughness: 0.04, transmission: 0.92, thickness: 0.02, ior: 1.5, transparent: true, opacity: 0.35, envMapIntensity: 1.4, side: THREE.DoubleSide }), { name: 'nx_glass' }),
    frame: std('nx_frame', { color: '#24272c', roughness: 0.4, metalness: 0.6 }),
    water: Object.assign(new THREE.MeshPhysicalMaterial({ color: '#1f7896', roughness: 0.03, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.78, envMapIntensity: 1.6 }), { name: 'nx_water' }),
    poolTile: std('nx_pool_tile', { color: '#6fc1d6', roughness: 0.4 }),
    coping: std('nx_coping', { map: stoneTex, color: '#efe9de', roughness: 0.6 }),
    fabric: std('nx_fabric', { color: '#d8d2c6', roughness: 0.95 }),
    fabricDark: std('nx_fabric_dark', { color: '#3b3f46', roughness: 0.95 }),
    wood: std('nx_wood', { map: woodPlanks(false, 23), roughness: 0.55 }),
    stone: std('nx_stone', { color: '#2d2f33', roughness: 0.25, metalness: 0.1 }),
    white: std('nx_white', { color: '#f3f3f1', roughness: 0.3 }),
    metal: std('nx_metal', { color: '#9aa0a8', roughness: 0.3, metalness: 0.9 }),
    rug: std('nx_rug', { color: '#b9ad99', roughness: 1 }),
    leaf: std('nx_leaf', { color: '#5f7848', roughness: 0.9, flatShading: true }),
    leafDark: std('nx_leaf_dark', { color: '#44593a', roughness: 0.9, flatShading: true }),
    trunk: std('nx_trunk', { color: '#5a4636', roughness: 1 }),
    car: std('nx_car', { color: '#1c2026', roughness: 0.25, metalness: 0.7 }),
    lamp: std('nx_lamp', { color: '#fff6e5', emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 0.15, roughness: 0.5 }),
  };
}
