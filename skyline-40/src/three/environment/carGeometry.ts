import { CylinderGeometry, ExtrudeGeometry, Shape, type BufferGeometry } from 'three';

let cache: { body: BufferGeometry; glass: BufferGeometry; wheel: BufferGeometry; lights: BufferGeometry } | null = null;

function profile(points: [number, number][]) {
  const s = new Shape();
  s.moveTo(...points[0]);
  points.slice(1).forEach((p) => s.lineTo(...p));
  s.closePath();
  return s;
}

/**
 * Carro esportivo de baixa complexidade: perfil lateral extrudado com chanfro (silhueta real,
 * ~600 triângulos). Comprimento ao longo de +Z (frente), origem no chão, centro do carro.
 */
export function carGeometries() {
  if (cache) return cache;
  const bodyShape = profile([
    [-2.3, 0.3], [-2.36, 0.62], [-2.28, 0.8], [-1.85, 0.88], [-1.05, 1.2], [0.25, 1.24], [0.95, 0.92],
    [1.9, 0.78], [2.3, 0.62], [2.34, 0.36], [2.1, 0.22], [1.75, 0.22], [1.6, 0.42], [1.05, 0.42], [0.9, 0.22],
    [-0.95, 0.22], [-1.1, 0.42], [-1.65, 0.42], [-1.8, 0.22], [-2.15, 0.22],
  ]);
  const body = new ExtrudeGeometry(bodyShape, { depth: 1.72, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 3, curveSegments: 4 });
  body.translate(0, 0, -0.86);
  body.rotateY(-Math.PI / 2);
  const glassShape = profile([[-1.72, 0.92], [-1.02, 1.17], [0.22, 1.2], [0.86, 0.95], [-0.2, 0.9]]);
  const glass = new ExtrudeGeometry(glassShape, { depth: 1.82, bevelEnabled: false });
  glass.translate(0, 0.02, -0.91);
  glass.rotateY(-Math.PI / 2);
  const wheel = new CylinderGeometry(0.36, 0.36, 0.26, 20);
  wheel.rotateZ(Math.PI / 2);
  const lights = new ExtrudeGeometry(profile([[2.18, 0.66], [2.33, 0.6], [2.3, 0.55], [2.12, 0.6]]), { depth: 1.5, bevelEnabled: false });
  lights.translate(0, 0, -0.75);
  lights.rotateY(-Math.PI / 2);
  cache = { body, glass, wheel, lights };
  return cache;
}

/** Posições das rodas (relativas ao centro do carro, frente em +Z). */
export const WHEELS: [number, number, number][] = [[-0.86, 0.36, 1.35], [0.86, 0.36, 1.35], [-0.86, 0.36, -1.4], [0.86, 0.36, -1.4]];
