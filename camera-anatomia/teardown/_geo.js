// ---------- materiais ----------
const allEdgeMats = [];
function edgeMat(opacity = .55, color = 0xf2f4f6, width = 1.25) {
  const m = new LineMaterial({ color, linewidth: width * DPR, transparent: true, opacity, depthWrite: false });
  m.resolution.copy(RES); m.userData.base = opacity; allEdgeMats.push(m); return m;
}
function std(color, rough = .5, metal = .3, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMap: ENV, envMapIntensity: .9,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, ...extra });
}
const C = { body: 0x1b1d21, body2: 0x24272c, metal: 0x8d939b, alu: 0x6f757d, rubber: 0x121315, pcb: 0x16201c,
  chip: 0x0f1012, red: 0xd8322a, gold: 0xb8954f, glass: 0xa9c6e8 };

function withEdges(mesh, { thr = 28, op = .55, color, width } = {}) {
  const eg = new THREE.EdgesGeometry(mesh.geometry, thr);
  const lg = new LineSegmentsGeometry().fromEdgesGeometry(eg);
  const ln = new LineSegments2(lg, edgeMat(op, color, width));
  ln.computeLineDistances();
  mesh.add(ln); mesh.edgeLine = ln;
  return mesh;
}
function mesh(geo, mat, edgeOpts) { const m = new THREE.Mesh(geo, mat); return edgeOpts === false ? m : withEdges(m, edgeOpts); }

// ---------- geometria ----------
function rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function circlePath(r, n = 64, rev = false) {
  const p = new THREE.Path(); for (let i = 0; i <= n; i++) { const a = (rev ? -1 : 1) * i / n * Math.PI * 2; i ? p.lineTo(Math.cos(a) * r, Math.sin(a) * r) : p.moveTo(r, 0); } return p;
}
// placa arredondada w×h (XY), profundidade d (Z), centrada, com chanfro
function slab(w, h, d, r = 2, bev = .8) {
  const b = Math.min(bev, d / 3);
  const g = new THREE.ExtrudeGeometry(rrShape(w - 2 * b, h - 2 * b, Math.max(.3, r - b)), { depth: d - 2 * b, bevelEnabled: b > 0, bevelSize: b, bevelThickness: b, bevelSegments: 1, curveSegments: 6 });
  g.translate(0, 0, -(d - 2 * b) / 2); return g;
}
function slabHole(w, h, d, r, holes, bev = .6) {
  const sh = rrShape(w - 2 * bev, h - 2 * bev, Math.max(.3, r - bev));
  for (const ho of holes) { const p = new THREE.Path(); const s = rrShape(ho.w + 2 * bev, ho.h + 2 * bev, ho.r ?? 1); s.getPoints(6).reverse().forEach((q, i) => i ? p.lineTo(q.x + (ho.x || 0), q.y + (ho.y || 0)) : p.moveTo(q.x + (ho.x || 0), q.y + (ho.y || 0))); sh.holes.push(p); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: d - 2 * bev, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 1, curveSegments: 6 });
  g.translate(0, 0, -(d - 2 * bev) / 2); return g;
}
// anel/engrenagem extrudado ao longo de Z (serrilhado = dentes)
function ring(rOut, rIn, d, teeth = 0, tooth = .6, bev = .3) {
  const s = new THREE.Shape(); const n = teeth ? teeth * 2 : 96;
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; const r = teeth ? (i % 2 ? rOut - tooth : rOut) : rOut; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(r, 0); }
  if (rIn > 0) s.holes.push(circlePath(rIn, 96, true));
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.05, d - 2 * bev), bevelEnabled: bev > 0, bevelSize: bev, bevelThickness: bev, bevelSegments: 1, curveSegments: 4 });
  g.translate(0, 0, -(d - 2 * bev) / 2); return g;
}
const cylY = (r, h, n = 48) => new THREE.CylinderGeometry(r, r, h, n);
function cylZ(r, h, n = 48) { const g = new THREE.CylinderGeometry(r, r, h, n); g.rotateX(Math.PI / 2); return g; }
// sólido de revolução ao longo de Z: pontos [r, z]
function latheZ(pts, n = 96) { const g = new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), n); g.rotateX(Math.PI / 2); return g; }
// elemento óptico: raio, espessura central, curvaturas (sag) frente/trás (+ convexo)
function lensEl(r, t, sf, sb, n = 18) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const x = i / n; pts.push([x * r, t / 2 + sf * (1 - x * x) - (sf < 0 ? sf : 0) * 0]); }
  const edge = .9;
  const back = [];
  for (let i = n; i >= 0; i--) { const x = i / n; back.push([x * r, -t / 2 - sb * (1 - x * x)]); }
  const prof = [[0.001, pts[0][1]], ...pts.slice(1), [r, pts[n][1] - 0.001], [r, back[0][1] + .001], ...back.slice(1), [0.001, back[n][1]]];
  // revolve: Lathe needs points from bottom to top in "y" = z here; order is fine as a closed outline
  void edge;
  return latheZ(prof.map(([a, b]) => [Math.max(a, .001), b]).reverse(), 72);
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

