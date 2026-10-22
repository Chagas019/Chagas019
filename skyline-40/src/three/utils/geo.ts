import { BoxGeometry, BufferGeometry, CylinderGeometry, Matrix4, Euler, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Caixa já posicionada (centro x, y, z). */
export function box(w: number, h: number, d: number, x = 0, y = 0, z = 0, rotY = 0, rotX = 0): BufferGeometry {
  const g = new BoxGeometry(Math.max(w, 0.001), Math.max(h, 0.001), Math.max(d, 0.001));
  metricUV(g, w, h, d);
  if (rotX) g.rotateX(rotX);
  if (rotY) g.rotateY(rotY);
  g.translate(x, y, z);
  return g;
}

/**
 * Coordenadas de textura em metros (1 unidade de UV = 1 m) para as texturas de madeira,
 * pedra e concreto manterem a escala real em peças de tamanhos diferentes.
 * Ordem das faces do BoxGeometry: +x, -x (d × h), +y, -y (w × d), +z, -z (w × h).
 */
export function metricUV(g: BufferGeometry, w: number, h: number, d: number) {
  const uv = g.attributes.uv;
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
    }
  }
  uv.needsUpdate = true;
}

export function cyl(rTop: number, rBottom: number, h: number, x = 0, y = 0, z = 0, seg = 12): BufferGeometry {
  const g = new CylinderGeometry(rTop, rBottom, h, seg);
  g.translate(x, y, z);
  return g;
}

/** Une várias geometrias numa só (menos draw calls). Descarta as originais. */
export function merge(parts: BufferGeometry[]): BufferGeometry {
  const clean = parts.filter(Boolean);
  if (clean.length === 0) return new BufferGeometry();
  const normalized = clean.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(normalized, false) ?? new BufferGeometry();
  clean.forEach((g) => g.dispose());
  normalized.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}

/** Aplica translação/rotação/escala a uma geometria (retorna a mesma instância). */
export function transform(g: BufferGeometry, opts: { x?: number; y?: number; z?: number; rotY?: number; sx?: number; sz?: number }): BufferGeometry {
  const m = new Matrix4().compose(
    new Vector3(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0),
    new Quaternion().setFromEuler(new Euler(0, opts.rotY ?? 0, 0)),
    new Vector3(opts.sx ?? 1, 1, opts.sz ?? 1),
  );
  g.applyMatrix4(m);
  // Espelhamento ímpar inverte a orientação das faces: corrige a ordem dos vértices.
  if ((opts.sx ?? 1) * (opts.sz ?? 1) < 0) flipWinding(g);
  return g;
}

export function flipWinding(g: BufferGeometry) {
  if (g.index) {
    const idx = g.index.array as Uint16Array | Uint32Array;
    for (let i = 0; i < idx.length; i += 3) {
      const t = idx[i + 1];
      idx[i + 1] = idx[i + 2];
      idx[i + 2] = t;
    }
    g.index.needsUpdate = true;
    return;
  }
  const attrs = Object.values(g.attributes);
  const count = g.attributes.position.count;
  for (const attr of attrs) {
    const size = attr.itemSize;
    const arr = attr.array as Float32Array;
    for (let v = 0; v < count; v += 3) {
      for (let k = 0; k < size; k++) {
        const a = (v + 1) * size + k;
        const b = (v + 2) * size + k;
        const t = arr[a];
        arr[a] = arr[b];
        arr[b] = t;
      }
    }
    attr.needsUpdate = true;
  }
}

/** Gerador pseudoaleatório determinístico (mesma cena em todas as visitas). */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
