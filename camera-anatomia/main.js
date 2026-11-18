// Anatomia de uma Câmera — cena 3D determinística: render(t) desenha o quadro do instante t (s).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

const W = 1920, H = 1080;
const DPR = window.devicePixelRatio || 1;
const TL = await (await fetch('audio/timeline.json')).json();
const SC = Object.fromEntries(TL.scenes.map(s => [s.id, s]));
const L = (id, i) => SC[id].lines[i];

// ---------- utilidades ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, fi = .5, fo = .5) => ease(seg(t, a, a + fi)) * (1 - ease(seg(t, b - fo, b)));
const D2R = Math.PI / 180;
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---------- renderizador ----------
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(DPR);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const RES = new THREE.Vector2(W * DPR, H * DPR);
const pmrem = new THREE.PMREMGenerator(renderer);
const ENV = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const cam = new THREE.PerspectiveCamera(28, W / H, 1, 6000);

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

// ---------- cena principal ----------
const sMain = new THREE.Scene();
sMain.background = new THREE.Color(0x0a0c0f);
sMain.environment = ENV;
sMain.fog = new THREE.Fog(0x0a0c0f, 900, 2600);
const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x0b0c0e, .35); sMain.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-300, 420, 520); sMain.add(key);
const rim = new THREE.DirectionalLight(0xbcd2ff, 1.2); rim.position.set(420, 180, -480); sMain.add(rim);
const sweep = new THREE.SpotLight(0xffffff, 0, 1400, 6 * D2R, .55, 0); sMain.add(sweep); sMain.add(sweep.target);

// piso técnico: grade sutil + sombra de contato
const grid = new THREE.GridHelper(2400, 120, 0x2a2f36, 0x161a1f); grid.position.y = -120; grid.material.transparent = true; grid.material.opacity = .55; sMain.add(grid);
const shadowTex = canvasTex(256, 256, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,.75)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
const contact = new THREE.Mesh(new THREE.PlaneGeometry(320, 200), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
contact.rotation.x = -Math.PI / 2; contact.position.set(0, -119.5, 20); sMain.add(contact);

const rig = new THREE.Group(); sMain.add(rig);           // gira na apresentação
const AX = new THREE.Vector3(8, -2, 0);                     // eixo óptico (x,y)
const parts = {};
function part(name, grp, off, label) { rig.add(grp); grp.userData.rest = grp.position.clone(); grp.userData.off = off; parts[name] = grp; return grp; }

// ===== 1. corpo (frente + tampa traseira) =====
const mBody = std(C.body, .62, .25), mBody2 = std(C.body2, .5, .35), mRub = std(C.rubber, .9, 0), mMetal = std(C.metal, .3, .9), mAlu = std(C.alu, .38, .85);
const body = new THREE.Group();
{
  const shell = mesh(slabHole(124, 70, 30, 5, [], 1.2), mBody); shell.position.set(0, 0, 4); body.add(shell);
  const grip = mesh(slab(28, 66, 26, 9, 1.5), mRub); grip.position.set(-46, -1, 26); body.add(grip);
  const gripCap = mesh(slab(30, 8, 27, 3, .8), mBody); gripCap.position.set(-46, 31, 26); body.add(gripCap);
  const plate = mesh(slab(118, 4, 30, 2, .6), mBody2); plate.position.set(0, 36.5, 4); body.add(plate);   // chapa superior
  const hump = mesh(slab(40, 15, 34, 4, 1), mBody2); hump.position.set(AX.x, 44, 2); body.add(hump);          // capô do visor
  const shoe = mesh(slab(20, 2.4, 20, .6, .3), mMetal); shoe.position.set(AX.x, 52.6, 2); body.add(shoe);       // sapata
  const throat = new THREE.Mesh(new THREE.CircleGeometry(23, 64), new THREE.MeshBasicMaterial({ color: 0x030304 })); throat.position.set(AX.x, AX.y, 19.05); body.add(throat);
  const mountRing = mesh(ring(30, 23, 3.2, 0, 0, .4), mMetal); mountRing.position.set(AX.x, AX.y, 20.6); body.add(mountRing);
  for (let i = 0; i < 4; i++) { const a = (45 + i * 90) * D2R; const sc = mesh(cylZ(1, 1, 16), mAlu, { thr: 40, op: .4 }); sc.position.set(AX.x + Math.cos(a) * 26.5, AX.y + Math.sin(a) * 26.5, 22.4); body.add(sc); }
  for (let i = 0; i < 3; i++) { const a = (90 + i * 120) * D2R; const tab = mesh(slab(11, 3, 1.2, .5, .2), mMetal, { op: .4 }); tab.position.set(AX.x + Math.cos(a) * 21.8, AX.y + Math.sin(a) * 21.8, 19.6); tab.rotation.z = a - Math.PI / 2; body.add(tab); }
  const release = mesh(cylZ(3.2, 2.4, 32), mMetal); release.position.set(AX.x + 36, AX.y - 18, 20); body.add(release);
  // controles do topo
  const btnBase = mesh(cylY(6.5, 2, 48), mMetal); btnBase.position.set(-44, 36.5, 30); body.add(btnBase);
  const shutterBtn = mesh(cylY(4.4, 3.4, 48), mMetal); shutterBtn.position.set(-44, 38.7, 30); body.add(shutterBtn);
  const modeG = ring(11, 0, 6, 44, .7, .3); modeG.rotateX(-Math.PI / 2); const mode = mesh(modeG, mBody2, { thr: 35, op: .45 }); mode.position.set(-24, 41.5, 6); body.add(mode);
  const modeTop = mesh(cylY(9, .6, 48), mMetal, { op: .5 }); modeTop.position.set(-24, 44.8, 6); body.add(modeTop);
  const rearG = ring(8, 0, 4.4, 36, .6, .3); rearG.rotateX(-Math.PI / 2); const rear = mesh(rearG, mBody2, { thr: 35, op: .45 }); rear.position.set(40, 40.5, -6); body.add(rear);
  const movie = mesh(cylY(2.6, 1.6, 32), new THREE.MeshStandardMaterial({ color: C.red, roughness: .5, emissive: 0x3a0705 })); movie.position.set(-12, 39.2, -6); body.add(movie);
  // alças e tampa lateral
  for (const sx of [-1, 1]) { const lug = mesh(slab(4, 7, 6, 1.5, .4), mMetal, { op: .4 }); lug.position.set(sx * 63.5, 26, 6); body.add(lug); }
  const door = mesh(slab(1.4, 34, 18, 2, .3), mBody2, { op: .4 }); door.position.set(62.6, -4, 4); body.add(door);
  // gravações frontais: régua de linhas (texto impresso) + ponto vermelho de alinhamento
  const dot = mesh(cylZ(1.1, .6, 24), new THREE.MeshBasicMaterial({ color: C.red }), false); dot.position.set(AX.x, AX.y + 33.5, 19.4); body.add(dot);
}
part('corpo', body, new THREE.Vector3(0, 0, 0));

const backCover = new THREE.Group();
{
  const cover = mesh(slab(120, 66, 6, 4, 1), mBody); backCover.add(cover);
  const lcd = mesh(slab(76, 50, 2, 2, .4), new THREE.MeshStandardMaterial({ color: 0x050607, roughness: .15, metalness: .2, envMap: ENV }), { op: .5 }); lcd.position.set(-10, -4, -3.6); backCover.add(lcd);
  const eyecup = mesh(slab(26, 20, 10, 6, 1.5), mRub); eyecup.position.set(AX.x, 44, -8); backCover.add(eyecup);
  const eyeWin = mesh(slab(16, 11, 1, 2, .2), new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: .1, envMap: ENV }), { op: .4 }); eyeWin.position.set(AX.x, 44, -13.4); backCover.add(eyeWin);
  for (let i = 0; i < 4; i++) { const b = mesh(cylZ(3.2, 1.6, 32), mBody2, { op: .4 }); b.position.set(42, 16 - i * 11, -3.6); backCover.add(b); }
  const pad = mesh(ring(8, 3, 2, 0, 0, .3), mBody2, { op: .45 }); pad.position.set(42, -22, -3.6); backCover.add(pad);
}
backCover.position.set(0, 0, -14);
part('tampa', backCover, new THREE.Vector3(0, 0, -235));

// ===== 2-4. lente: barril traseiro + diafragma + anel de foco + barril frontal + vidros =====
const LZ = 22.2; // face frontal da baioneta (distância de registro de 18 mm até o sensor)
const mGlass = new THREE.MeshPhysicalMaterial({ color: C.glass, roughness: .04, metalness: 0, transparent: true, opacity: .22, envMap: ENV, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1 });
let diaphLight; const lensRear = new THREE.Group(), lensFocus = new THREE.Group(), lensFront = new THREE.Group(), diaph = new THREE.Group();
{
  const flange = mesh(ring(28, 21, 3, 0, 0, .3), mMetal); flange.position.z = 1.5; lensRear.add(flange);
  const rb = mesh(latheZ([[24, 3], [29.5, 3.5], [30.5, 6], [30.5, 22], [29.5, 23]], 96), mBody, { thr: 30 }); lensRear.add(rb);
  const mark = mesh(slab(1.2, 2.2, 3, .3, .1), new THREE.MeshBasicMaterial({ color: C.red }), false); mark.position.set(0, 30.6, 12); lensRear.add(mark);
  const g5 = new THREE.Mesh(lensEl(13, 3.2, .8, 1.6), mGlass); g5.position.z = 8; lensRear.add(withEdges(g5, { thr: 40, op: .35 }));
  const g4 = new THREE.Mesh(lensEl(15.5, 4, 1.8, .4), mGlass); g4.position.z = 16; lensRear.add(withEdges(g4, { thr: 40, op: .35 }));

  const fr = mesh(ring(32.2, 29.2, 20, 90, .9, .3), mRub, { thr: 35, op: .4 }); fr.position.z = 36; lensFocus.add(fr);
  const frCore = mesh(latheZ([[29.2, 25.5], [29.2, 46.5]], 96), mBody2, false); lensFocus.add(frCore);
  const g3a = new THREE.Mesh(lensEl(17.5, 3, 1.2, -1.4), mGlass); g3a.position.z = 37; lensFocus.add(withEdges(g3a, { thr: 40, op: .35 }));
  const g3b = new THREE.Mesh(lensEl(17.5, 5, 2.2, .6), mGlass); g3b.position.z = 41.5; lensFocus.add(withEdges(g3b, { thr: 40, op: .35 }));

  const fb = mesh(latheZ([[30.8, 46.8], [31.2, 47.2], [31.2, 60], [30, 61.5], [26, 61.5], [25.6, 59.5]], 96), mBody, { thr: 30 }); lensFront.add(fb);
  const nameTex = canvasTex(1024, 1024, (g, w) => {
    g.fillStyle = '#0c0d0f'; g.fillRect(0, 0, w, w); g.translate(w / 2, w / 2); g.font = '500 44px Inter'; g.textAlign = 'center';
    const txt = '50 mm  1:1.8  ·  ⌀52  ·  ÓPTICA DIDÁTICA  ·  '; const R = 430;
    for (let i = 0, a0 = -Math.PI * .95; i < txt.length; i++) { const a = a0 + i * .052; g.save(); g.rotate(a + Math.PI / 2); g.fillStyle = i < 12 ? '#e2342d' : '#d9dde2'; g.fillText(txt[i], 0, -R); g.restore(); }
  });
  const nameRing = new THREE.Mesh(new THREE.RingGeometry(21, 26, 96), new THREE.MeshStandardMaterial({ map: nameTex, roughness: .6, metalness: .1 })); nameRing.position.z = 59.4; lensFront.add(nameRing);
  const g1 = new THREE.Mesh(lensEl(21, 5.5, 3.2, 1.2), mGlass); g1.position.z = 55.5; lensFront.add(withEdges(g1, { thr: 40, op: .35 }));
  const g2 = new THREE.Mesh(lensEl(18, 2.4, .6, -1.6), mGlass); g2.position.z = 49.5; lensFront.add(withEdges(g2, { thr: 40, op: .35 }));
  const redRing = new THREE.Mesh(new THREE.TorusGeometry(31.25, .35, 8, 128), new THREE.MeshBasicMaterial({ color: C.red })); redRing.position.z = 57; lensFront.add(redRing);

  const house = mesh(ring(28.5, 19.5, 2.4, 0, 0, .3), mAlu, { op: .5 }); diaph.add(house);
  diaphLight = new THREE.Mesh(new THREE.CircleGeometry(19.6, 64), new THREE.MeshBasicMaterial({ color: 0xfff0d6, transparent: true, opacity: 0, depthWrite: false })); diaphLight.position.z = -1.6; diaph.add(diaphLight);
}
// lâminas do diafragma (7), redesenhadas a cada quadro conforme a abertura
const BLADES = 7, R_MAX = 18.5;
const mBlade = std(0x2b2e33, .35, .8, { side: THREE.DoubleSide });
const blades = [];
for (let i = 0; i < BLADES; i++) {
  const m = new THREE.Mesh(new THREE.BufferGeometry(), mBlade);
  const ln = new LineSegments2(new LineSegmentsGeometry(), edgeMat(.5)); m.add(ln); m.edgeLine = ln;
  diaph.add(m); blades.push(m);
}
function setAperture(r) {
  const tanH = Math.tan(Math.PI / BLADES);
  for (let i = 0; i < BLADES; i++) {
    const x0 = -r * tanH - 2, x1 = R_MAX * 1.25, y0 = r, y1 = R_MAX + 2;
    const sh = new THREE.Shape(); sh.moveTo(x0, y0); sh.lineTo(x1, y0); sh.quadraticCurveTo(x1 + 2, (y0 + y1) / 2, x1 - 2, y1 + 1); sh.quadraticCurveTo((x0 + x1) / 2, y1 + 5, x0 - 3, y1); sh.lineTo(x0, y0);
    const g = new THREE.ShapeGeometry(sh, 6); const a = i / BLADES * Math.PI * 2;
    g.rotateZ(a); g.translate(0, 0, -.6 + i * .17);
    const b = blades[i]; b.geometry.dispose(); b.geometry = g;
    const eg = new THREE.EdgesGeometry(g, 10); b.edgeLine.geometry.dispose(); b.edgeLine.geometry = new LineSegmentsGeometry().fromEdgesGeometry(eg);
  }
}
setAperture(R_MAX * .97);
const lens = new THREE.Group(); lens.position.set(AX.x, AX.y, LZ);
for (const g of [lensRear, lensFocus, lensFront, diaph]) lens.add(g);
diaph.position.z = 28.5;
lensRear.userData.rest = new THREE.Vector3(); lensFocus.userData.rest = new THREE.Vector3(); lensFront.userData.rest = new THREE.Vector3(); diaph.userData.rest = diaph.position.clone();
part('lente', lens, new THREE.Vector3(0, 0, 92));

// ===== 5. obturador de plano focal =====
function makeShutter() {
  const g = new THREE.Group();
  const frame = mesh(slabHole(58, 52, 3, 3, [{ w: 37, h: 25, r: 1 }], .5), std(0x34383e, .42, .75)); frame.position.z = 1.5; g.add(frame);
  const back = mesh(slabHole(58, 52, 1.6, 3, [{ w: 37, h: 25, r: 1 }], .3), mBody2, { op: .35 }); back.position.z = -3.4; g.add(back);
  const motor = mesh(cylY(4.5, 14, 32), mMetal); motor.position.set(33, 10, -1); g.add(motor);
  const gear = ring(5.5, 1.2, 1.6, 18, .6, .2); const gr = mesh(gear, mAlu, { thr: 35, op: .4 }); gr.position.set(33, -4, -1); g.add(gr);
  const coil = mesh(slab(8, 10, 6, 1, .4), std(C.gold, .4, .9)); coil.position.set(33, -16, -1); g.add(coil);
  for (const [x, y] of [[-25, 22], [25, 22], [-25, -22], [25, -22]]) { const s = mesh(cylZ(1.1, 1, 16), mMetal, { thr: 40, op: .35 }); s.position.set(x, y, 3.3); g.add(s); }
  const mSlat = std(0x0f1012, .55, .4, { side: THREE.DoubleSide });
  const mk = () => { const arr = []; for (let k = 0; k < 4; k++) { const s = mesh(slab(40, 7.2, .35, .6, 0), mSlat, { thr: 30, op: .4 }); s.position.z = -1.2 - k * .12; g.add(s); arr.push(s); } return arr; };
  const c1 = mk(), c2 = mk();
  c2.forEach(s => { s.position.z -= .55; });
  // c: 0 = recolhida, 1 = cobrindo a janela
  function set(a, b) {
    c1.forEach((s, k) => { s.position.y = lerp(-16.5 - k * 1.3, 9.4 - k * 6.3, a); });
    c2.forEach((s, k) => { s.position.y = lerp(16.5 + (3 - k) * 1.3, 9.4 - k * 6.3, b); });
  }
  set(0, 0);
  return { g, set };
}
const shutter = makeShutter();
shutter.g.position.set(AX.x, AX.y, 11);
part('obturador', shutter.g, new THREE.Vector3(0, 0, -62));

// ===== 6. sensor (com placa de estabilização) =====
const sensor = new THREE.Group();
const hatch = canvasTex(512, 342, (g, w, h) => {
  g.fillStyle = '#3a0907'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,90,70,.55)'; g.lineWidth = 2;
  for (let i = -h; i < w; i += 9) { g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); }
  g.strokeStyle = 'rgba(255,120,100,.25)'; for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
});
const mDie = new THREE.MeshStandardMaterial({ map: hatch, emissive: 0xff2a1a, emissiveIntensity: .18, emissiveMap: hatch, roughness: .25, metalness: .3 });
{
  const ibis = mesh(slab(60, 50, 2.6, 3, .4), mAlu); ibis.position.z = -1.6; sensor.add(ibis);
  for (const [x, y] of [[-26, 21], [26, 21], [-26, -21], [26, -21]]) { const s = mesh(cylZ(1.4, 2, 16), mMetal, { thr: 40, op: .35 }); s.position.set(x, y, .2); sensor.add(s); }
  const pkg = mesh(slab(46, 36, 2, 1.5, .3), std(0xc9c3b5, .6, .05)); pkg.position.z = 1; sensor.add(pkg);
  const die = mesh(new THREE.PlaneGeometry(36, 24), mDie, { thr: 10, op: .7, color: 0xff6a5a }); die.position.z = 2.05; sensor.add(die);
  const coverGlass = mesh(slab(40, 28, .7, .6, 0), mGlass, { op: .25 }); coverGlass.position.z = 2.9; sensor.add(coverGlass);
  for (let i = 0; i < 24; i++) { const p = mesh(slab(.9, 1.6, .3, .2, 0), std(C.gold, .35, 1), false); p.position.set(-20 + i * 1.75, -16.5, 2.1); sensor.add(p); }
  const mag = mesh(slab(10, 6, 3, 1, .3), std(0x3b3f45, .5, .6)); mag.position.set(-24, 0, -3.8); sensor.add(mag);
  const mag2 = mag.clone(); mag2.position.set(24, 0, -3.8); sensor.add(mag2);
}
sensor.position.set(AX.x, AX.y, 2);
part('sensor', sensor, new THREE.Vector3(0, 0, -112));
const SENSOR_DIE = new THREE.Vector3(0, 0, 2.05); // local

// ===== 7. dissipador =====
const heat = new THREE.Group();
{
  const base = mesh(slab(52, 40, 2.4, 1.5, .3), mAlu); heat.add(base);
  for (let i = 0; i < 9; i++) { const f = mesh(slab(1.4, 36, 10, .3, .2), mAlu, { thr: 30, op: .45 }); f.position.set(-22 + i * 5.5, 0, -6); heat.add(f); }
  const pipeG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-26, 14, -1.4), new THREE.Vector3(-34, 14, -2), new THREE.Vector3(-40, 4, -3), new THREE.Vector3(-40, -12, -3)]), 40, 1.6, 12);
  heat.add(mesh(pipeG, std(C.gold, .35, 1), { thr: 50, op: .3 }));
}
heat.position.set(AX.x, AX.y, -4.5);
part('dissipador', heat, new THREE.Vector3(0, 0, -150));

// ===== 8-9. placa principal + processador + cartão =====
const board = new THREE.Group();
const pcbTex = canvasTex(1600, 900, (g, w, h) => {
  g.fillStyle = '#121a17'; g.fillRect(0, 0, w, h); const r = rng(7); g.lineCap = 'round';
  for (let i = 0; i < 230; i++) { g.strokeStyle = `rgba(200,230,215,${.06 + r() * .14})`; g.lineWidth = 1.5 + r() * 2.5; let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) { if (r() < .5) x += (r() - .5) * 500; else y += (r() - .5) * 300; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(210,190,140,.45)'; g.beginPath(); g.arc(r() * w, r() * h, 3, 0, 7); g.fill(); }
});
const mProc = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: .35, metalness: .5, emissive: C.red, emissiveIntensity: 0 });
{
  const pcb = mesh(slab(104, 58, 1.6, 2, .2), new THREE.MeshStandardMaterial({ map: pcbTex, roughness: .7, metalness: .1 }), { thr: 30, op: .6 }); board.add(pcb);
  const proc = mesh(slab(17, 17, 2.4, .8, .3), mProc, { op: .8, color: 0xff6a5a }); proc.position.set(6, 4, -2); board.add(proc); board.userData.proc = proc;
  const lid = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (g, w) => { g.fillStyle = '#17181b'; g.fillRect(0, 0, w, w); g.strokeStyle = '#e2342d'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, w - 28); g.fillStyle = '#d9dde2'; g.font = '600 46px Inter'; g.textAlign = 'center'; g.fillText('IMAGE', w / 2, 112); g.fillText('PROC', w / 2, 168); g.fillStyle = '#e2342d'; g.beginPath(); g.arc(44, 44, 9, 0, 7); g.fill(); }) }));
  lid.rotation.y = Math.PI; lid.position.set(6, 4, -3.25); board.add(lid);
  const chips = [[-22, 12, 11, 8], [-22, -6, 11, 8], [30, 14, 9, 9], [30, -2, 12, 6], [-40, 14, 7, 7], [24, -18, 8, 5]];
  for (const [x, y, w, h] of chips) { const c = mesh(slab(w, h, 1.6, .5, .2), std(C.chip, .4, .4), { op: .5 }); c.position.set(x, y, -1.6); board.add(c); }
  for (let i = 0; i < 14; i++) { const c = mesh(slab(1.6, .9, .8, .1, 0), std(0x8a7a5a, .5, .5), false); c.position.set(-10 + (i % 7) * 2.6, -14 - Math.floor(i / 7) * 2.2, -1.2); board.add(c); }
  const conn = mesh(slab(16, 4, 3, .4, .2), std(0xe8e2d4, .7, 0), { op: .5 }); conn.position.set(-6, 24, -2.2); board.add(conn);
  const slot = mesh(slab(30, 27, 3.4, .8, .3), mMetal, { op: .55 }); slot.position.set(-36, -12, -2.4); board.add(slot);
  const card = mesh(slab(24, 32, 2.1, 1.2, .2), std(0x1d2a40, .5, .2), { op: .6 }); card.position.set(-36, -14, -4.6); board.add(card); board.userData.card = card;
  const cardLbl = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), new THREE.MeshBasicMaterial({ map: canvasTex(256, 180, (g, w, h) => { g.fillStyle = '#22314a'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8edf3'; g.font = '600 40px Inter'; g.fillText('SD', 20, 64); g.font = '400 24px Inter'; g.fillText('UHS-II  V90', 20, 112); g.fillStyle = '#e2342d'; g.fillRect(20, 136, 120, 6); }) }));
  cardLbl.rotation.y = Math.PI; cardLbl.position.set(-36, -18, -5.7); board.add(cardLbl);
}
board.position.set(0, -2, -11);
part('placa', board, new THREE.Vector3(0, 0, -192));

// ===== 10. circuitos: placa de E/S + flex do sensor =====
const circ = new THREE.Group();
{
  const io = mesh(slab(1.6, 46, 26, 1.5, .2), new THREE.MeshStandardMaterial({ map: pcbTex, roughness: .7 }), { op: .55 }); io.position.set(0, 0, 0); circ.add(io);
  for (const [y, h] of [[12, 7], [0, 5], [-12, 8]]) { const p = mesh(slab(3, h, 9, .6, .3), mMetal, { op: .45 }); p.position.set(2.3, y, 3); circ.add(p); }
  const flexMat = std(0xb46a1f, .45, .5, { side: THREE.DoubleSide });
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-2, 18, -8), new THREE.Vector3(-14, 26, -10), new THREE.Vector3(-30, 26, -2), new THREE.Vector3(-46, 20, 2)]);
  const flex = mesh(new THREE.TubeGeometry(curve, 48, 1.2, 4, false), flexMat, { thr: 60, op: .25 }); flex.scale.set(1, 1, 1); circ.add(flex);
  const bat = mesh(slab(4, 8, 3, .6, .2), std(0xe8e2d4, .7, 0), { op: .4 }); bat.position.set(-1, -20, -6); circ.add(bat);
}
circ.position.set(56, 0, 2);
part('circuitos', circ, new THREE.Vector3(80, 0, -60));

// ===== 11. visor eletrônico =====
const evf = new THREE.Group();
{
  const box = mesh(slab(24, 13, 22, 2, .5), mBody2); evf.add(box);
  const oled = mesh(slab(14, 9, 1, .4, .1), new THREE.MeshStandardMaterial({ color: 0x0a0b0c, emissive: 0x1d2633, roughness: .2 }), { op: .5 }); oled.position.set(0, 0, 11.4); evf.add(oled);
  const eyep = mesh(cylZ(7, 12, 48), mBody, { thr: 40 }); eyep.position.set(0, 0, -15); evf.add(eyep);
  const eyeGlass = new THREE.Mesh(lensEl(6.2, 2, .8, .8), mGlass); eyeGlass.position.z = -21.4; evf.add(withEdges(eyeGlass, { thr: 40, op: .35 }));
  const fl = mesh(slab(10, 2.4, 1, .3, 0), std(0xb46a1f, .45, .5), false); fl.position.set(0, -7.4, 6); evf.add(fl);
}
evf.position.set(AX.x, 44, 0);
part('visor', evf, new THREE.Vector3(0, 70, 0));

// ===== 12. bateria =====
const battery = new THREE.Group();
{
  const batTex = canvasTex(512, 900, (g, w, h) => { g.fillStyle = '#1b1d21'; g.fillRect(0, 0, w, h); g.fillStyle = '#d9dde2'; g.font = '600 64px Inter'; g.fillText('Li-ion', 40, 120); g.font = '400 40px Mono'; g.fillText('7,2 V', 40, 200); g.fillText('2280 mAh', 40, 256); g.fillStyle = '#e2342d'; g.fillRect(40, 300, 160, 8); g.strokeStyle = 'rgba(217,221,226,.35)'; g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(40, 400 + i * 40); g.lineTo(w - 40, 400 + i * 40); g.stroke(); } });
  const cell = mesh(slab(20, 54, 36, 2.5, .8), [std(0x1b1d21, .6, .1), std(0x1b1d21, .6, .1)], { op: .55 }); battery.add(cell);
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(30, 50), new THREE.MeshStandardMaterial({ map: batTex, roughness: .6 })); lab.rotation.y = -Math.PI / 2; lab.position.x = -10.05; battery.add(lab);
  for (let i = 0; i < 4; i++) { const c = mesh(slab(4, 1, 2, .2, 0), std(C.gold, .3, 1), false); c.position.set(-4 + i * 2.8 - 1, -27.2, 6 - i * 3); battery.add(c); }
}
battery.position.set(-46, -6, 10);
part('bateria', battery, new THREE.Vector3(0, -100, 0));

// ---------- materiais por grupo (para modo raio-X) ----------
function collect(g) { const ms = new Set(), es = new Set(); g.traverse(o => { if (o.isMesh && !o.isLineSegments2) [].concat(o.material).forEach(m => ms.add(m)); if (o.isLineSegments2) es.add(o.material); }); return { ms: [...ms], es: [...es] }; }
// cada malha do invólucro ganha material próprio (o fantasma não pode vazar para peças internas)
function ownMaterials(g) { g.traverse(o => { if (o.isMesh && !o.isLineSegments2 && o.material !== mGlass) { o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); } }); return collect(g); }
const shellSets = [ownMaterials(body), ownMaterials(backCover), ownMaterials(lensRear), ownMaterials(lensFront), ownMaterials(lensFocus)];
function setGhost(k) {
  for (const s of shellSets) {
    for (const m of s.ms) { if (m === mGlass) continue; m.transparent = k > 0.001; m.opacity = 1 - .9 * k; m.depthWrite = k < .5; }
    for (const e of s.es) e.opacity = e.userData.base * (1 - .35 * k);
  }
}

// ---------- raios de luz ----------
const rayGroup = new THREE.Group(); rig.add(rayGroup);
const rayMat = new LineMaterial({ color: 0xfff1d0, linewidth: 2.2 * DPR, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
const glowMat = new LineMaterial({ color: 0xffb36b, linewidth: 9 * DPR, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
rayMat.resolution.copy(RES); glowMat.resolution.copy(RES);
const RAYS = [-17, -12.5, -8, -3.5, 0.0001, 3.5, 8, 12.5, 17];
const rayObjs = RAYS.map(() => { const a = new Line2(new LineGeometry(), rayMat), b = new Line2(new LineGeometry(), glowMat); rayGroup.add(b, a); return { a, b }; });
// caminho (no plano y-z do eixo): paralelo → elemento frontal → elemento 3 → foco no sensor
function rayPath(h, zStop) {
  const zIn = LZ + 58, z3 = LZ + 39, zF = 4.05, z0 = LZ + 330;
  const h3 = h * .62;   // após o 1º grupo, converge para um ponto virtual
  const pts = [[z0, h], [zIn, h], [z3, h3], [zF, 0]];
  // corta no batente (obturador fechado)
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) { const [za, ha] = out[out.length - 1], [zb, hb] = pts[i]; if (zb < zStop) { const k = (za - zStop) / (za - zb); out.push([zStop, ha + (hb - ha) * k]); break; } out.push(pts[i]); }
  return out;
}
function setRays(prog, zStop, apR, alpha) {
  rayGroup.visible = alpha > .002; rayMat.opacity = .95 * alpha; glowMat.opacity = .16 * alpha;
  RAYS.forEach((h, i) => {
    const { a, b } = rayObjs[i];
    // raio barrado pelo diafragma: altura no plano do diafragma
    const zD = LZ + 28.5, hD = h * lerp(.62, 0, (LZ + 39 - zD) / (LZ + 39 - 4.05));
    let pts = rayPath(h, zStop);
    if (Math.abs(hD) > apR) pts = rayPath(h, zD + .5);
    // comprimento progressivo
    const segs = []; let tot = 0; for (let k = 1; k < pts.length; k++) { const l = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); segs.push(l); tot += l; }
    let rem = prog * (LZ + 330 - 4.05) * 1.02 - Math.abs(h) * .2; const P = [];
    for (let k = 0; k < pts.length; k++) {
      if (k === 0) { P.push(pts[0]); continue; }
      if (rem <= 0) break;
      const l = segs[k - 1]; if (rem >= l) { P.push(pts[k]); rem -= l; } else { const q = rem / l; P.push([lerp(pts[k - 1][0], pts[k][0], q), lerp(pts[k - 1][1], pts[k][1], q)]); rem = 0; }
    }
    if (P.length < 2) P.push([P[0][0] - .01, P[0][1]]);
    const arr = []; for (const [z, y] of P) arr.push(AX.x, AX.y + y, z);
    a.geometry.dispose(); b.geometry.dispose();
    a.geometry = new LineGeometry(); a.geometry.setPositions(arr); b.geometry = new LineGeometry(); b.geometry.setPositions(arr);
    a.computeLineDistances(); b.computeLineDistances();
  });
}

// ---------- pulsos de dados (cena 6) ----------
const pulseMat = new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const pulseMat2 = new THREE.MeshBasicMaterial({ color: 0xfff1e8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
const NP = 70;
const pulses = new THREE.InstancedMesh(new THREE.BoxGeometry(4, 4, 4), pulseMat, NP); pulses.frustumCulled = false; rig.add(pulses);
const pulses2 = new THREE.InstancedMesh(new THREE.BoxGeometry(3, 3, 3), pulseMat2, NP); pulses2.frustumCulled = false; rig.add(pulses2);
const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();

// ---------- posição de explosão ----------
const EXPL = { // [início, duração] relativos ao início da cena 2
  lente: [2.6, 2.6], obturador: [6.3, 2.4], sensor: [6.5, 2.6], visor: [9.9, 2.2], tampa: [12, 2.2], placa: [12.3, 2.4],
  dissipador: [12.6, 2.4], circuitos: [12.9, 2.4], bateria: [13.2, 2.4], corpo: [0, 1] };
const LENS_SPLIT = { rear: 0, diaph: 20, focus: 40, front: 62 };
function applyExplode(e) { // e: nome → 0..1
  for (const [n, g] of Object.entries(parts)) { const k = e[n] ?? 0; g.position.copy(g.userData.rest).addScaledVector(g.userData.off, k); }
  const kl = e.lenteSplit ?? 0;
  lensRear.position.z = LENS_SPLIT.rear * kl; diaph.position.z = diaph.userData.rest.z + LENS_SPLIT.diaph * kl;
  lensFocus.position.z = LENS_SPLIT.focus * kl; lensFront.position.z = LENS_SPLIT.front * kl;
}
function explodeAt(t, t0, reverse = false, t1 = 0) {
  const e = {};
  for (const [n, [a, d]] of Object.entries(EXPL)) e[n] = ease(seg(t, t0 + a, t0 + a + d));
  e.lenteSplit = ease(seg(t, t0 + 3.4, t0 + 5.6));
  if (reverse) { // recompor: ordem inversa, em ~3 s
    const k = ease(seg(t, t1, t1 + 3.2)); for (const n in e) e[n] = 1 - ease(seg(k, (n === 'lente' || n === 'lenteSplit') ? .35 : 0, (n === 'lente' || n === 'lenteSplit') ? 1 : .8));
  }
  return e;
}
const ALL1 = Object.fromEntries([...Object.keys(EXPL), 'lenteSplit'].map(n => [n, 1]));
const ALL0 = Object.fromEntries([...Object.keys(EXPL), 'lenteSplit'].map(n => [n, 0]));

// =====================================================================
// ---------- cena do sensor (macro) ----------
const sSensor = new THREE.Scene(); sSensor.background = new THREE.Color(0x07080a); sSensor.environment = ENV;
sSensor.fog = new THREE.Fog(0x07080a, 40, 95);
sSensor.add(new THREE.HemisphereLight(0xdfe8ff, 0x050506, .5));
{ const d = new THREE.DirectionalLight(0xffffff, 1.4); d.position.set(-20, 30, 25); sSensor.add(d); const d2 = new THREE.DirectionalLight(0xffd6c0, .6); d2.position.set(25, 10, -20); sSensor.add(d2); }
const NX = 24, NY = 16, PITCH = 1;
const NPIX = NX * NY;
const pixBase = new THREE.InstancedMesh(slab(.96, .96, .7, .12, .06), std(0x2a2d33, .45, .5), NPIX);
const pixWell = new THREE.InstancedMesh(new THREE.PlaneGeometry(.62, .62), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), NPIX);
const pixFilt = new THREE.InstancedMesh(slab(.92, .92, .16, .08, .02), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .3, metalness: 0, transparent: true, opacity: .85, envMap: ENV }), NPIX);
const lensG = new THREE.SphereGeometry(.46, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); lensG.rotateX(Math.PI / 2);
const pixLens = new THREE.InstancedMesh(lensG, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .05, transparent: true, opacity: .3, envMap: ENV, envMapIntensity: 2, clearcoat: 1, depthWrite: false }), NPIX);
const sensorRoot = new THREE.Group(); sSensor.add(sensorRoot);
sensorRoot.rotation.x = -Math.PI / 2; // matriz deitada no plano XZ, normal para +Y
for (const m of [pixBase, pixWell, pixFilt, pixLens]) sensorRoot.add(m);
const bayer = (ix, iy) => (iy % 2 === 0 ? (ix % 2 === 0 ? 'R' : 'G') : (ix % 2 === 0 ? 'G' : 'B'));
const BAYER_COL = { R: new THREE.Color(0xe0453a), G: new THREE.Color(0x3fb86a), B: new THREE.Color(0x3b78e0) };
const pixPos = [];
for (let iy = 0; iy < NY; iy++) for (let ix = 0; ix < NX; ix++) {
  const i = iy * NX + ix, x = (ix - (NX - 1) / 2) * PITCH, y = (iy - (NY - 1) / 2) * PITCH; pixPos.push([x, y]);
  tmpM.makeTranslation(x, y, -.35); pixBase.setMatrixAt(i, tmpM);
  pixFilt.setColorAt(i, BAYER_COL[bayer(ix, iy)]);
}
// rede de linhas da grade (bordas dos pixels) para leitura técnica
{
  const pts = []; const x0 = -NX / 2, x1 = NX / 2, y0 = -NY / 2, y1 = NY / 2;
  for (let i = 0; i <= NX; i++) pts.push(x0 + i, y0, .01, x0 + i, y1, .01);
  for (let j = 0; j <= NY; j++) pts.push(x0, y0 + j, .01, x1, y0 + j, .01);
  const g = new LineSegmentsGeometry(); g.setPositions(pts); const l = new LineSegments2(g, edgeMat(.22)); sensorRoot.add(l);
  const frame = mesh(slabHole(NX + 3, NY + 3, .9, .6, [{ w: NX + .4, h: NY + .4, r: .2 }], .15), std(0x3a3e45, .5, .7), { op: .5 }); frame.position.z = -.25; sensorRoot.add(frame);
}
// fótons
const NPH = 900; const phR = rng(42); const photons = [];
for (let j = 0; j < NPH; j++) photons.push({ pix: Math.floor(phR() * NPIX), t: phR(), dx: (phR() - .5) * 6, dz: (phR() - .5) * 6 });
const phMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff3d8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), NPH);
phMesh.frustumCulled = false; sensorRoot.add(phMesh);
const phTrail = new THREE.InstancedMesh(new THREE.CylinderGeometry(.03, .03, 1, 6).rotateX(Math.PI / 2).translate(0, 0, .5), new THREE.MeshBasicMaterial({ color: 0xffd9a8, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }), NPH);
phTrail.frustumCulled = false; sensorRoot.add(phTrail);
const charge = new Float32Array(NPIX);
function sensorFrame(t, tS) { // tS: tempo dentro da cena 4
  const filt = ease(seg(tS, 8.6, 11)), lensK = ease(seg(tS, 9.6, 12));
  const flux0 = 4.4, flux1 = 13.4; charge.fill(0);
  const col = new THREE.Color();
  for (let j = 0; j < NPH; j++) {
    const p = photons[j]; const spawn = lerp(flux0, flux1, p.t), fall = 1.1; const k = (tS - spawn) / fall;
    const [x, y] = pixPos[p.pix];
    if (k >= 1) charge[p.pix] += 1;
    if (k < 0 || k >= 1) { tmpM.makeScale(0, 0, 0); phMesh.setMatrixAt(j, tmpM); phTrail.setMatrixAt(j, tmpM); continue; }
    const h = lerp(14, .4, k * k), px = lerp(x + p.dx, x, k), py = lerp(y + p.dz, y, k);
    tmpM.makeTranslation(px, py, h); phMesh.setMatrixAt(j, tmpM);
    tmpV.set(p.dx, p.dz, 14 - .4).normalize(); tmpQ.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tmpV); tmpS.set(1, 1, 2.2 * (1 - k * .5));
    tmpM.compose(new THREE.Vector3(px, py, h), tmpQ, tmpS); phTrail.setMatrixAt(j, tmpM);
  }
  phMesh.instanceMatrix.needsUpdate = true; phTrail.instanceMatrix.needsUpdate = true;
  const fade = 1 - ease(seg(tS, 13.6, 15.5)) * .55;
  for (let i = 0; i < NPIX; i++) {
    const ix = i % NX, iy = Math.floor(i / NX); const q = clamp(charge[i] / 4.5) * fade;
    const tint = filt > 0 ? BAYER_COL[bayer(ix, iy)] : null;
    col.setRGB(1, .86, .62).multiplyScalar(q * (1 - filt)); if (tint) col.add(tint.clone().multiplyScalar(q * filt * 1.2));
    pixWell.setColorAt(i, col);
    const [x, y] = pixPos[i];
    tmpM.makeTranslation(x, y, .02); pixWell.setMatrixAt(i, tmpM);
    const drop = (1 - filt) * (6 + ((ix * 7 + iy * 13) % 9) * .6);
    tmpM.makeTranslation(x, y, .15 + drop); if (filt <= 0) tmpM.makeScale(0, 0, 0); pixFilt.setMatrixAt(i, tmpM);
    const ls = lensK; tmpM.compose(new THREE.Vector3(x, y, .24 + (1 - lensK) * 3), tmpQ.identity(), tmpS.set(ls, ls, ls)); pixLens.setMatrixAt(i, tmpM);
  }
  pixWell.instanceColor.needsUpdate = true; pixWell.instanceMatrix.needsUpdate = true; pixFilt.instanceMatrix.needsUpdate = true; pixLens.instanceMatrix.needsUpdate = true;
  pixFilt.material.opacity = .85 * filt;
}

// ---------- cena do obturador ----------
const sShut = new THREE.Scene(); sShut.background = new THREE.Color(0x090b0e); sShut.environment = ENV;
sShut.add(new THREE.HemisphereLight(0xdfe8ff, 0x050506, .45));
{ const d = new THREE.DirectionalLight(0xffffff, 1.5); d.position.set(-120, 160, 220); sShut.add(d); const d2 = new THREE.DirectionalLight(0xbcd2ff, .9); d2.position.set(160, 40, -120); sShut.add(d2); }
const bigShutter = makeShutter(); sShut.add(bigShutter.g);
const shutLight = new THREE.Mesh(new THREE.PlaneGeometry(36.6, 24.6), new THREE.MeshBasicMaterial({ color: 0xff3b2c, transparent: true, opacity: 0 })); shutLight.position.z = -2.95; bigShutter.g.add(shutLight);
const shutSensor = mesh(new THREE.PlaneGeometry(36, 24), mDie, { thr: 10, op: .5, color: 0xff6a5a }); shutSensor.position.z = -6; bigShutter.g.add(shutSensor);

// =====================================================================
// ---------- câmera (cinematografia) ----------
const camState = (target, az, el, dist, fov = 28) => ({ target: new THREE.Vector3(...target), az, el, dist, fov });
function mix(a, b, k) { return { target: a.target.clone().lerp(b.target, k), az: lerp(a.az, b.az, k), el: lerp(a.el, b.el, k), dist: lerp(a.dist, b.dist, k), fov: lerp(a.fov, b.fov, k) }; }
function keys(t, ks) { // ks: [[t, state], ...]
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) return mix(ks[i - 1][1], ks[i][1], eio(seg(t, ks[i - 1][0], ks[i][0])));
  return ks[ks.length - 1][1];
}
function applyCam(s) {
  const a = s.az * D2R, e = s.el * D2R;
  cam.position.set(s.target.x + s.dist * Math.sin(a) * Math.cos(e), s.target.y + s.dist * Math.sin(e), s.target.z + s.dist * Math.cos(a) * Math.cos(e));
  cam.fov = s.fov; cam.updateProjectionMatrix(); cam.lookAt(s.target);
}

// ---------- HUD ----------
const $ = id => document.getElementById(id);
const svg = $('labels'), fx = $('fx'); fx.width = W * DPR; fx.height = H * DPR; const fxg = fx.getContext('2d');
const subs = $('subs').firstElementChild;
const CHAPTERS = { s1: ['01', 'APRESENTAÇÃO'], s2: ['02', 'DESMONTAGEM'], s3: ['03', 'O CAMINHO DA LUZ'], s4: ['04', 'O SENSOR'], s5: ['05', 'O OBTURADOR'], s6: ['06', 'PROCESSAMENTO'], s7: ['07', 'MONTAGEM'] };
function proj(obj, local) { cam.updateMatrixWorld(); obj.updateWorldMatrix(true, false); const v = (local ? local.clone() : new THREE.Vector3()); obj.localToWorld(v); v.project(cam); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H, v.z]; }
let svgOut = '';
function label(obj, local, num, text, dx, dy, a) {
  if (a <= .003) return;
  const [x, y] = proj(obj, local); const lx = x + dx, ly = y + dy;
  const right = dx >= 0; const tw = text.length * 10.6 + 8; const ex = right ? lx + tw : lx - tw;
  const draw = clamp(a * 1.6);
  const mx = lerp(x, lx, draw), my = lerp(y, ly, draw);
  svgOut += `<g opacity="${a.toFixed(3)}"><circle cx="${x}" cy="${y}" r="7" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1"/><circle cx="${x}" cy="${y}" r="3" fill="#e2342d"/>`
    + `<path d="M${x} ${y} L${mx} ${my}${draw >= 1 ? ` L${ex} ${ly}` : ''}" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="1.2"/>`
    + (draw >= 1 ? `<circle cx="${ex}" cy="${ly}" r="2" fill="#fff"/>` : '')
    + `<text class="n" x="${right ? lx + 2 : ex + 2}" y="${ly - 32}">${num}</text><text x="${right ? lx + 2 : ex + 2}" y="${ly - 10}">${text}</text></g>`;
}
function textSvg(x, y, s, cls = '', extra = '') { svgOut += `<text x="${x}" y="${y}" class="${cls}" ${extra}>${s}</text>`; }

function setChapter(id) { const [n, s] = CHAPTERS[id]; $('chapter').innerHTML = `<b>${n}</b>${s}<span class="bar"></span>${'ANATOMIA DE UMA CÂMERA'}`; }
function subtitleAt(t) {
  for (const s of TL.scenes) for (const l of s.lines) if (t >= l.t0 - .05 && t <= l.t1 + .25) { subs.textContent = l.text; subs.style.opacity = win(t, l.t0 - .05, l.t1 + .25, .15, .15); return; }
  subs.style.opacity = 0;
}

// ---------- quadro ----------
const BLACK = $('vignette');
let lastScene = null;
async function render(t) {
  svgOut = ''; fxg.setTransform(DPR, 0, 0, DPR, 0, 0); fxg.clearRect(0, 0, W, H);
  const sid = (TL.scenes.find(s => t >= s.t0 && t < s.t1) || TL.scenes[TL.scenes.length - 1]).id;
  const S = SC[sid], tS = t - S.t0;
  setChapter(sid);
  $('chapter').style.opacity = sid === 's1' ? win(t, 10, 99, 1, 1) : win(tS, .4, S.t1 - S.t0 - .2, .8, .6);
  $('title').style.opacity = 0; $('final').style.opacity = 0; $('note').style.opacity = 0;
  let scene = sMain, black = 0;
  setGhost(0); applyExplode(ALL0); backCover.visible = true; lens.visible = true; rig.rotation.set(0, 0, 0); sweep.intensity = 0; rayGroup.visible = false;
  pulses.count = 0; pulses2.count = 0; mProc.emissiveIntensity = 0; shutter.set(0, 0); setAperture(R_MAX * .97); mDie.emissiveIntensity = .18;
  key.intensity = 1.6; mGlass.opacity = .22; diaphLight.material.opacity = 0;

  if (sid === 's1') {
    // giro de 360° com luz varrendo o corpo
    rig.rotation.y = (-30 + 360 * eio(seg(t, -1.5, 12.6))) * D2R;
    const k = seg(t, 1.2, 8.5); sweep.intensity = 14 * Math.sin(Math.PI * clamp(k)); sweep.position.set(lerp(-500, 500, k), 260, 380); sweep.target.position.set(lerp(-90, 90, k), 0, 0);
    key.intensity = lerp(.25, 1.6, ease(seg(t, 0, 4)));
    applyCam(keys(t, [[0, camState([0, -34, 10], 0, 8, 560, 26)], [12, camState([0, -26, 10], 0, 12, 500, 26)]]));
    $('title').style.opacity = win(t, 2.2, 10.2, 1.2, 1);
    black = 1 - ease(seg(t, 0, 1.6));
  }
  else if (sid === 's2') {
    applyExplode(explodeAt(t, S.t0));
    applyCam(keys(tS, [[0, camState([0, 6, 10], 0, 14, 470, 26)], [3, camState([0, 4, 70], 34, 14, 560, 26)], [6.2, camState([0, 0, 40], 44, 16, 620, 26)], [10, camState([0, 10, 20], 48, 18, 680, 26)], [19, camState([0, 2, 10], 52, 20, 720, 26)]]));
    const t0 = S.t0, endA = S.t1 - .6;
    const la = (a) => win(t, a, endA, .7, .6);
    const l1 = L('s2', 1).t0, l2 = L('s2', 2).t0, l3 = L('s2', 3).t0, l4 = L('s2', 4).t0;
    label(body, new THREE.Vector3(-40, 36, 19), '01', 'Corpo', -60, -70, la(t0 + 1.2));
    label(lensFront, new THREE.Vector3(0, 31, 54), '02', 'Lente', -40, -90, la(l1 + .2));
    label(lensFocus, new THREE.Vector3(0, -32, 36), '03', 'Anel de foco', -30, 110, la(l1 + 1.3));
    label(diaph, new THREE.Vector3(0, -28, 0), '04', 'Diafragma', 40, 150, la(l1 + 2.3));
    label(shutter.g, new THREE.Vector3(0, 26, 0), '05', 'Obturador', -30, -110, la(l2 + .9));
    label(sensor, new THREE.Vector3(0, -12, 2.1), '06', 'Sensor de imagem', 20, 150, la(l2 + 1.9));
    label(evf, new THREE.Vector3(0, 6.5, 0), '07', 'Visor eletrônico', 40, -70, la(l3 + .2));
    label(board, new THREE.Vector3(30, 29, 0), '08', 'Placa principal', 60, -120, la(l4 + 1.5));
    label(board, new THREE.Vector3(6, 4, -3.2), '09', 'Processador de imagem', 90, -40, la(l4 + 2.4));
    label(circ, new THREE.Vector3(0, 23, 0), '10', 'Circuitos e flex', 50, -90, la(l4 + 3.3));
    label(heat, new THREE.Vector3(0, -20, -6), '11', 'Dissipador de calor', -60, 130, la(l4 + 4.1));
    label(battery, new THREE.Vector3(0, -27, 0), '12', 'Bateria', -120, 10, la(l4 + 4.8));
  }
  else if (sid === 's3') {
    // recompor + raio-X, vista lateral
    const back = 1 - ease(seg(tS, 0, 2.2)); const e = {}; for (const n in ALL1) e[n] = back; applyExplode(e);
    setGhost(ease(seg(tS, .6, 2.6)));
    const tA = L('s3', 3).t0, tB = L('s3', 4).t0;
    const closed = 1 - ease(seg(t, tB + .4, tB + 1.4));
    shutter.set(closed, 0);
    const fNum = t < tA + 2.2 ? 1.8 : lerp(1.8, 8, eio(seg(t, tA + 2.2, tA + 4.2)));
    const apR = R_MAX * 1.8 / fNum * .97; setAperture(apR);
    const zStop = closed > .5 ? 11 + 3 : 4.05;
    const prog = ease(seg(t, L('s3', 1).t0 - .3, L('s3', 1).t1 + .6));
    const dWin = win(t, L('s3', 2).t0 - .4, tB + .3, .9, .8);
    mGlass.opacity = lerp(.22, .05, dWin); diaphLight.material.opacity = dWin;
    setRays(prog, zStop, apR, win(t, L('s3', 1).t0 - .4, S.t1 - .5, .5, .8) * (1 - dWin));
    mDie.emissiveIntensity = .18 + 1.6 * ease(seg(t, tB + 1.2, tB + 2.2));
    applyCam(keys(tS, [[0, camState([0, 2, 10], 52, 20, 720, 26)], [2.6, camState([10, 0, 52], 90, 5, 430, 26)], [6.6, camState([10, 0, 58], 90, 4, 450, 26)],
      [7.6, camState([40, -2, 52], 18, 8, 300, 26)], [tA + 4.8 - S.t0, camState([44, -2, 52], 10, 6, 260, 26)],
      [tB - S.t0 + .6, camState([10, 0, 40], 88, 4, 420, 26)], [S.t1 - S.t0 - .3, camState([8, -2, 6], 62, 3, 180, 26)]]));
    black = ease(seg(tS, S.t1 - S.t0 - .9, S.t1 - S.t0));
    // painel de abertura
    const pa = win(t, tA - .3, tB + .2, .5, .5);
    if (pa > 0) apertureHud(fNum, pa);
    const lbA = win(t, L('s3', 1).t0 + 1.2, L('s3', 2).t0 + .2, .5, .4);
    label(lensFront, new THREE.Vector3(0, 15, 56), '', 'Elementos ópticos', -80, -120, lbA);
    label(sensor, new THREE.Vector3(0, 10, 2.1), '', 'Sensor', 60, -140, win(t, tB + 1.4, S.t1 - .9, .4, .4));
    label(shutter.g, new THREE.Vector3(0, 24, 1), '', 'Obturador', -40, -150, win(t, tB - .2, S.t1 - 1, .4, .4));
  }
  else if (sid === 's4') {
    scene = sSensor; sensorFrame(t, tS);
    const d = S.t1 - S.t0;
    applyCam(keys(tS, [[0, camState([0, 0, 0], 0, 86, 9, 30)], [3.4, camState([0, 0, 0], 20, 62, 26, 30)], [7.5, camState([-2, 0, 1], 32, 44, 22, 30)], [12.6, camState([0, 0, 0], 40, 34, 18, 30)], [d, camState([0, 0, 0], 52, 50, 34, 30)]]));
    black = 1 - ease(seg(tS, 0, .9)); black = Math.max(black, ease(seg(tS, d - .7, d)));
    const lb = (a, b) => win(t, a, b, .5, .5);
    const l0 = L('s4', 0), l1 = L('s4', 1), l2 = L('s4', 2), l3 = L('s4', 3);
    hudTag(150, 900, 'MATRIZ DE PIXELS', 'cada quadrado é um fotossítio · escala ilustrativa', lb(l0.t0 + .5, l1.t0 + .2));
    hudTag(150, 900, 'FÓTONS → CARGA', 'quanto mais luz, mais elétrons acumulados no poço', lb(l1.t0, l2.t0 + .2));
    if (t > l2.t0 - .5) bayerHud(lb(l2.t0, l3.t0 + .3));
    const cmp = win(t, l3.t0 - .2, S.t1 - .5, .7, .6);
    if (cmp > 0) { sensorCompare(cmp, t - l3.t0); fxg.globalAlpha = 1; }
  }
  else if (sid === 's5') {
    scene = sShut; const d = S.t1 - S.t0;
    const l1 = L('s5', 1), l2 = L('s5', 2), l3 = L('s5', 3);
    // ciclo lento (cortina 1 abre, cortina 2 fecha) e ciclo rápido (fenda)
    let c1 = 1, c2 = 0; const slow = seg(t, l1.t0 + .2, l1.t1 + .2), fast = seg(t, l2.t0 + .3, l2.t1 + .3);
    if (t < l1.t0 + .2) { c1 = 1; c2 = 0; }
    else if (t < l2.t0) { c1 = 1 - ease(seg(slow, 0, .42)); c2 = ease(seg(slow, .55, .97)); }
    else if (t < l2.t0 + .3) { const r = ease(seg(t, l2.t0 - .3, l2.t0 + .25)); c1 = r; c2 = 1 - r; } // rearme: ambas sobem juntas
    else if (t < l3.t0) { const k = ease(fast); c1 = 1 - clamp(k * 1.25); c2 = clamp(k * 1.25 - .2); }
    else { const k = (t - l3.t0) % 2.6 / 2.6; c1 = 1 - ease(seg(k, .05, .45)); c2 = ease(seg(k, .2, .6)); if (k > .75) { const r = ease(seg(k, .75, 1)); c1 = r; c2 = 1 - r; } }
    bigShutter.set(c1, c2);
    const open = clamp((1 - c1) * (1 - c2) * 1.4);
    shutLight.material.opacity = .0; mDie.emissiveIntensity = .2 + 1.4 * open;
    applyCam(keys(tS, [[0, camState([0, 0, 0], -38, 22, 260, 26)], [3.5, camState([0, 0, 0], -16, 10, 175, 26)], [l1.t0 - S.t0, camState([0, 0, 0], -8, 6, 150, 26)], [l3.t0 - S.t0, camState([0, 0, 0], -4, 4, 140, 26)], [d, camState([14, 0, 0], 8, 4, 210, 26)]]));
    black = 1 - ease(seg(tS, 0, .9)); black = Math.max(black, ease(seg(tS, d - .7, d)));
    const sp = c1 > .02 && c2 > .02 ? '' : '';
    void sp;
    hudTag(150, 900, 'OBTURADOR DE PLANO FOCAL', 'duas cortinas de lâminas · câmera lenta', win(t, l1.t0 - .3, l2.t1 + .3, .5, .5));
    if (t > l2.t0) hudTag(150, 900, 'ALTA VELOCIDADE', 'a 2ª cortina parte antes da 1ª terminar: só uma fenda expõe o sensor', win(t, l2.t0 + .2, l3.t0 + .1, .4, .4));
    $('note').textContent = 'Em muitas câmeras sem espelho a 1ª cortina é eletrônica (o sensor começa a ler linha a linha). Varia conforme o modelo.';
    $('note').style.opacity = win(t, l1.t0 + .5, l3.t0, .6, .6) * .9;
    if (t > l3.t0 - .4) shutterPanels(t - l3.t0, win(t, l3.t0 - .3, S.t1 - .4, .6, .6));
  }
  else if (sid === 's6') {
    applyExplode(ALL1); backCover.visible = false; lens.visible = false; const d = S.t1 - S.t0;
    applyCam(keys(tS, [[0, camState([20, -6, -150], 128, 20, 560, 26)], [7, camState([16, -6, -160], 138, 24, 520, 26)], [d, camState([0, -10, -175], 150, 28, 470, 26)]]));
    black = 1 - ease(seg(tS, 0, .9)); black = Math.max(black, ease(seg(tS, d - .5, d)));
    const l0 = L('s6', 0), l1 = L('s6', 1), l2 = L('s6', 2);
    dataFlow(t, l0.t0 + .3, l2.t1);
    mProc.emissiveIntensity = .2 + .9 * win(t, l1.t0 - .4, l2.t0 + .4, .4, .6) * (.75 + .25 * Math.sin(t * 9));
    mDie.emissiveIntensity = .5;
    label(sensor, new THREE.Vector3(0, 12, 2.1), '06', 'Sensor', -60, -90, win(t, l0.t0 - .2, S.t1 - .6, .5, .5));
    label(board, new THREE.Vector3(6, 4, -3.2), '09', 'Processador de imagem', -40, -170, win(t, l0.t0 + 2, S.t1 - .6, .5, .5));
    label(board, new THREE.Vector3(-36, -26, -5), '', 'Cartão de memória', -40, 140, win(t, l2.t0 - .2, S.t1 - .6, .5, .5));
    pipelineHud(t, [l0.t0, l0.t0 + 2.2, l1.t0, l1.t0 + 2.2, l1.t0 + 3.7, l2.t0], win(t, l0.t0 - .3, S.t1 - .4, .6, .6));
  }
  else if (sid === 's7') {
    const d = S.t1 - S.t0;
    applyExplode(explodeAt(t, 0, true, S.t0 + .3));
    applyCam(keys(tS, [[0, camState([0, -10, -175], 150, 28, 470, 26)], [1.2, camState([0, 0, -40], 110, 24, 800, 26)], [3.8, camState([0, 4, 20], 30, 14, 520, 26)], [5.4, camState([8, -2, 60], 8, 5, 300, 26)], [9.5, camState([8, -2, 84], 2, 1, 70, 26)], [d, camState([8, -2, 84], 1, 0, 48, 26)]]));
    black = 1 - ease(seg(tS, 0, .6)); black = Math.max(black, .72 * ease(seg(tS, 3.6, 6.2)));
    black = Math.max(black, ease(seg(tS, d - 1.4, d)));
    $('final').style.opacity = win(t, L('s7', 1).t0 - .2, S.t1 - .5, 1.2, 1.1);
  }
  // legendas
  subtitleAt(t);
  svg.innerHTML = svgOut;
  BLACK.style.background = `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,${black}) 55%, rgba(0,0,0,${Math.max(.55, black)}) 100%)`;
  $('hud').style.opacity = 1;
  renderer.render(scene, cam);
  lastScene = scene;
}

// ---------- painéis 2D ----------
function back(x, y, w, h, a) { svgOut += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="rgba(6,8,10,.72)" stroke="rgba(238,241,244,.12)" opacity="${a}"/>`; }
function hudTag(x, y, title, sub, a) {
  if (a <= .003) return;
  back(x - 44, y - 50, Math.max(title.length * 13.5, sub.length * 9.4) + 80, 96, a);
  svgOut += `<g opacity="${a}"><rect x="${x - 22}" y="${y - 30}" width="3" height="52" fill="#e2342d"/><text x="${x}" y="${y - 8}" style="font:500 17px Mono;letter-spacing:.18em;fill:#eef1f4">${title}</text><text x="${x}" y="${y + 18}" style="font:400 18px Inter;fill:rgba(238,241,244,.62)">${sub}</text></g>`;
}
function apertureHud(N, a) {
  const x = 1460, y = 330; const r1 = 120 * 1.8 / N;
  back(x - 40, y - 220, 380, 560, a);
  svgOut += `<g opacity="${a}"><text x="${x}" y="${y - 170}" style="font:500 16px Mono;letter-spacing:.2em;fill:rgba(238,241,244,.6)">ABERTURA</text>`
    + `<text x="${x}" y="${y - 108}" style="font:300 64px Inter;fill:#eef1f4">f/${N.toFixed(1).replace('.0', '').replace('.', ',')}</text>`
    + `<circle cx="${x + 130}" cy="${y + 70}" r="122" fill="none" stroke="rgba(255,255,255,.25)"/><circle cx="${x + 130}" cy="${y + 70}" r="${r1}" fill="rgba(255,240,210,.85)"/>`
    + `<text x="${x}" y="${y + 240}" style="font:400 18px Inter;fill:rgba(238,241,244,.7)">luz que entra (área ∝ 1/N²)</text>`
    + `<rect x="${x}" y="${y + 256}" width="260" height="6" fill="rgba(255,255,255,.12)"/><rect x="${x}" y="${y + 256}" width="${260 * (1.8 / N) ** 2}" height="6" fill="#e2342d"/>`
    + `<text x="${x}" y="${y + 296}" style="font:400 17px Mono;fill:rgba(238,241,244,.6)">${N > 7.9 ? 'f/8 ≈ 1/20 da luz de f/1,8' : 'f/1,8 = referência'}</text></g>`;
}
function bayerHud(a) {
  if (a <= .003) return; const x = 1470, y = 300, s = 46;
  back(x - 40, y - 76, 340, 330, a);
  svgOut += `<g opacity="${a}"><text x="${x}" y="${y - 30}" style="font:500 16px Mono;letter-spacing:.2em;fill:rgba(238,241,244,.6)">FILTRO BAYER</text>`;
  const c = { R: '#e0453a', G: '#3fb86a', B: '#3b78e0' };
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const k = bayer(i, j); svgOut += `<rect x="${x + i * s}" y="${y + j * s}" width="${s - 4}" height="${s - 4}" fill="${c[k]}" opacity=".9"/><text x="${x + i * s + 15}" y="${y + j * s + 28}" style="font:600 15px Mono;fill:#0b0c0e">${k}</text>`; }
  svgOut += `<text x="${x}" y="${y + 4 * s + 34}" style="font:400 18px Inter;fill:rgba(238,241,244,.75)">50% verde · 25% vermelho · 25% azul</text></g>`;
}
function sensorCompare(a, tt) {
  fxg.globalAlpha = a * .82; fxg.fillStyle = '#06070a'; fxg.fillRect(0, 0, W, H); fxg.globalAlpha = 1;
  const k = 17, cx = 960, cy = 520; const ff = [36 * k, 24 * k], ap = [23.5 * k, 15.6 * k];
  const kA = ease(clamp((tt - 4.6) / 1.2));
  svgOut += `<g opacity="${a}">`
    + `<rect x="${cx - ff[0] / 2}" y="${cy - ff[1] / 2}" width="${ff[0]}" height="${ff[1]}" fill="rgba(226,52,45,.08)" stroke="#eef1f4" stroke-width="1.6"/>`
    + `<text x="${cx - ff[0] / 2}" y="${cy - ff[1] / 2 - 20}" style="font:500 22px Inter;fill:#eef1f4">Full frame · 36 × 24 mm · 864 mm²</text>`
    + dimLine(cx - ff[0] / 2, cy + ff[1] / 2 + 34, cx + ff[0] / 2, cy + ff[1] / 2 + 34, '36 mm')
    + dimLineV(cx + ff[0] / 2 + 34, cy - ff[1] / 2, cy + ff[1] / 2, '24 mm')
    + `<g opacity="${kA}"><rect x="${cx - ap[0] / 2}" y="${cy - ap[1] / 2}" width="${ap[0]}" height="${ap[1]}" fill="rgba(226,52,45,.28)" stroke="#e2342d" stroke-width="2"/>`
    + `<text x="${cx - ap[0] / 2 + 16}" y="${cy - ap[1] / 2 + 34}" style="font:500 21px Inter;fill:#eef1f4">APS-C · ≈ 23,5 × 15,6 mm</text>`
    + `<text x="${cx - ap[0] / 2 + 16}" y="${cy - ap[1] / 2 + 62}" style="font:400 18px Mono;fill:rgba(238,241,244,.75)">≈ 367 mm² · 42% da área</text></g>`
    + `<text x="${cx - ff[0] / 2}" y="${cy + ff[1] / 2 + 92}" style="font:400 17px Mono;fill:rgba(238,241,244,.5)">desenho em escala · o APS-C varia um pouco entre fabricantes (fator de corte ≈ 1,5–1,6×)</text></g>`;
}
function dimLine(x1, y, x2, _y, s) { return `<path d="M${x1} ${y - 8}V${y + 8}M${x2} ${y - 8}V${y + 8}M${x1} ${y}H${x2}" stroke="rgba(238,241,244,.6)" stroke-width="1"/><circle cx="${x1}" cy="${y}" r="2.4" fill="#eef1f4"/><circle cx="${x2}" cy="${y}" r="2.4" fill="#eef1f4"/><rect x="${(x1 + x2) / 2 - 42}" y="${y - 13}" width="84" height="26" fill="#0a0c0f"/><text x="${(x1 + x2) / 2}" y="${y + 6}" text-anchor="middle" style="font:400 17px Mono;fill:#eef1f4">${s}</text>`; }
function dimLineV(x, y1, y2, s) { return `<path d="M${x - 8} ${y1}H${x + 8}M${x - 8} ${y2}H${x + 8}M${x} ${y1}V${y2}" stroke="rgba(238,241,244,.6)" stroke-width="1"/><circle cx="${x}" cy="${y1}" r="2.4" fill="#eef1f4"/><circle cx="${x}" cy="${y2}" r="2.4" fill="#eef1f4"/><rect x="${x - 40}" y="${(y1 + y2) / 2 - 13}" width="80" height="26" fill="#0a0c0f"/><text x="${x}" y="${(y1 + y2) / 2 + 6}" text-anchor="middle" style="font:400 17px Mono;fill:#eef1f4">${s}</text>`; }

// hélice a 1500 rpm (25 voltas/s): ângulo varrido = 360° × 25 × T
function shutterPanels(tt, a) {
  const P = [['1/1000 s', 1 / 1000, 0], ['1/250 s', 1 / 250, 2.4], ['1/30 s', 1 / 30, 4.6]];
  const pw = 400, ph = 266, gap = 40, x0 = (W - 3 * pw - 2 * gap) / 2, y0 = 610;
  fxg.globalAlpha = a * .7; fxg.fillStyle = '#05060a'; fxg.fillRect(0, y0 - 70, W, ph + 150); fxg.globalAlpha = 1;
  svgOut += `<g opacity="${a}"><text x="${x0}" y="${y0 - 26}" style="font:500 16px Mono;letter-spacing:.18em;fill:rgba(238,241,244,.6)">HÉLICE A 1 500 RPM · O MESMO INSTANTE, TRÊS TEMPOS DE EXPOSIÇÃO</text></g>`;
  P.forEach(([name, T, at], i) => {
    const pa = a * ease(clamp((tt - at) / .6)); if (pa <= .003) return;
    const x = x0 + i * (pw + gap), y = y0;
    fxg.save(); fxg.globalAlpha = pa; fxg.beginPath(); fxg.rect(x, y, pw, ph); fxg.clip();
    const bg = fxg.createLinearGradient(x, y, x, y + ph); bg.addColorStop(0, '#2b3442'); bg.addColorStop(1, '#141920'); fxg.fillStyle = bg; fxg.fillRect(x, y, pw, ph);
    const sweepDeg = 360 * 25 * T, N = 60; fxg.globalCompositeOperation = 'source-over';
    for (let s = 0; s < N; s++) { const ang = (30 + sweepDeg * s / (N - 1)) * D2R; fxg.globalAlpha = pa * Math.min(1, 2.2 / N * (sweepDeg < 12 ? N / 2.2 : 1)); drawProp(x + pw / 2, y + ph / 2, ang); }
    fxg.globalAlpha = pa; fxg.fillStyle = '#d6d9de'; fxg.beginPath(); fxg.arc(x + pw / 2, y + ph / 2, 9, 0, 7); fxg.fill();
    fxg.restore();
    svgOut += `<g opacity="${pa}"><rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="none" stroke="rgba(238,241,244,.45)"/><text x="${x}" y="${y + ph + 34}" style="font:500 24px Inter;fill:#eef1f4">${name}</text><text x="${x + pw}" y="${y + ph + 34}" text-anchor="end" style="font:400 17px Mono;fill:rgba(238,241,244,.6)">giro de ${Math.round(sweepDeg)}°</text></g>`;
  });
}
function drawProp(cx, cy, ang) {
  fxg.fillStyle = '#eef1f4';
  for (let b = 0; b < 3; b++) { const a = ang + b * Math.PI * 2 / 3; fxg.save(); fxg.translate(cx, cy); fxg.rotate(a); fxg.beginPath(); fxg.moveTo(0, -7); fxg.quadraticCurveTo(60, -24, 108, -6); fxg.quadraticCurveTo(112, 4, 100, 8); fxg.quadraticCurveTo(50, 12, 0, 7); fxg.closePath(); fxg.fill(); fxg.restore(); }
}

// fluxo de dados: sensor → flex → placa → processador → cartão
function dataFlow(t, t0, t1) {
  const w = (o, x, y, z) => o.localToWorld(new THREE.Vector3(x, y, z));
  rig.updateMatrixWorld(true);
  const p = [w(sensor, 0, 0, -3), w(sensor, 0, 14, -6), w(heat, 22, 24, -8), w(board, -6, 24, -2.2), w(board, 6, 12, -2.6), w(board, 6, 4, -3.4)];
  const q = [w(board, 6, 4, -3.4), w(board, -10, 0, -2.6), w(board, -30, -4, -2.8), w(board, -36, -14, -5)];
  const cA = new THREE.CatmullRomCurve3(p), cB = new THREE.CatmullRomCurve3(q);
  const r = rng(3); let n = 0, n2 = 0;
  const L2 = L('s6', 2);
  for (let i = 0; i < NP; i++) {
    const st = t0 + r() * (t1 - t0 - 2.2), dur = 1.4 + r() * .6;
    const k = (t - st) / dur; if (k < 0 || k > 1) continue;
    const pos = cA.getPointAt(ease(k));
    tmpM.makeTranslation(pos.x, pos.y, pos.z); (i % 3 ? pulses : pulses2).setMatrixAt(i % 3 ? n++ : n2++, tmpM);
  }
  for (let i = 0; i < 26; i++) {
    const st = L2.t0 - .2 + i * .14, k = (t - st) / 1.1; if (k < 0 || k > 1) continue;
    const pos = cB.getPointAt(ease(k)); tmpM.makeTranslation(pos.x, pos.y, pos.z); pulses2.setMatrixAt(n2++, tmpM);
  }
  pulses.count = n; pulses2.count = n2; pulses.instanceMatrix.needsUpdate = true; pulses2.instanceMatrix.needsUpdate = true;
}

// painel do processamento + prévia da imagem em cada etapa
const SRC = (() => { // imagem sintética 96×64 (pôr do sol, montanhas, lago)
  const w = 96, h = 64, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, h * .6); sky.addColorStop(0, '#20345c'); sky.addColorStop(.6, '#d9774a'); sky.addColorStop(1, '#f2c070'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffe9b0'; g.beginPath(); g.arc(62, 34, 7, 0, 7); g.fill();
  g.fillStyle = '#3a2f45'; g.beginPath(); g.moveTo(0, 42); g.lineTo(18, 26); g.lineTo(34, 38); g.lineTo(50, 22); g.lineTo(72, 40); g.lineTo(96, 30); g.lineTo(96, 64); g.lineTo(0, 64); g.fill();
  g.fillStyle = '#1d2a3d'; g.fillRect(0, 46, w, 18); g.fillStyle = 'rgba(255,200,120,.5)'; g.fillRect(56, 48, 12, 2); g.fillRect(58, 52, 8, 1.5);
  return g.getImageData(0, 0, w, h);
})();
const STAGES = (() => {
  const { width: w, height: h, data } = SRC; const r = rng(9); const mk = () => new ImageData(w, h);
  const raw = mk(), mosaic = mk(), demo = mk(), clean = mk(), final = mk();
  for (let i = 0; i < w * h; i++) {
    const x = i % w, y = Math.floor(i / w); const ch = bayer(x, y) === 'R' ? 0 : bayer(x, y) === 'G' ? 1 : 2;
    const v = data[i * 4 + ch] * .55 + (r() - .5) * 46; // linear, escuro e com ruído
    raw.data.set([v, v, v, 255], i * 4); const m = [0, 0, 0]; m[ch] = v * 1.4; mosaic.data.set([...m, 255], i * 4);
    const nz = () => (r() - .5) * 40; demo.data.set([data[i * 4] * .62 + nz(), data[i * 4 + 1] * .62 + nz(), data[i * 4 + 2] * .62 + nz(), 255], i * 4);
    clean.data.set([data[i * 4] * .66, data[i * 4 + 1] * .64, data[i * 4 + 2] * .66, 255], i * 4);
    final.data.set([data[i * 4], data[i * 4 + 1], data[i * 4 + 2], 255], i * 4);
  }
  return [raw, mosaic, demo, clean, final].map(id => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(id, 0, 0); return c; });
})();
function pipelineHud(t, ts, a) {
  if (a <= .003) return;
  const steps = ['Leitura dos pixels', 'Conversão A/D', 'Demosaico: reconstrução das cores', 'Redução de ruído', 'Tons e balanço de branco', 'Compressão e gravação'];
  const x = 1340, y = 250; let cur = -1; ts.forEach((s, i) => { if (t >= s) cur = i; });
  back(x - 36, y - 84, 500, 400, a);
  svgOut += `<g opacity="${a}"><text x="${x}" y="${y - 40}" style="font:500 16px Mono;letter-spacing:.2em;fill:rgba(238,241,244,.6)">PROCESSADOR DE IMAGEM</text>`;
  steps.forEach((s, i) => {
    const on = i <= cur, now = i === cur; const yy = y + i * 52;
    svgOut += `<circle cx="${x + 6}" cy="${yy}" r="${now ? 6 : 4}" fill="${on ? '#e2342d' : 'none'}" stroke="${on ? '#e2342d' : 'rgba(238,241,244,.4)'}"/>`
      + (i < steps.length - 1 ? `<path d="M${x + 6} ${yy + 8}V${yy + 44}" stroke="rgba(238,241,244,.25)"/>` : '')
      + `<text x="${x + 28}" y="${yy + 6}" style="font:${now ? 500 : 400} 21px Inter;fill:${on ? '#eef1f4' : 'rgba(238,241,244,.42)'}">${s}</text>`;
  });
  if (cur >= 5) svgOut += `<text x="${x + 28}" y="${y + 6 * 52 + 6}" style="font:400 18px Mono;fill:#e2342d">IMG_0001 · JPEG · HEIF · RAW</text>`;
  svgOut += '</g>';
  // prévia
  const st = [0, 1, 1, 2, 3, 4][Math.max(0, cur)]; const pw = 384, ph = 256, px = 120, py = 250;
  fxg.save(); fxg.globalAlpha = a * .72; fxg.fillStyle = '#06080a'; fxg.fillRect(px - 30, py - 62, pw + 60, ph + 120); fxg.restore();
  fxg.save(); fxg.globalAlpha = a; fxg.imageSmoothingEnabled = cur < 2 ? false : true;
  fxg.drawImage(STAGES[st], px, py, pw, ph); fxg.restore();
  const cap = ['dados brutos do sensor (lineares, monocromáticos)', 'cada pixel guarda só uma cor', 'cada pixel guarda só uma cor', 'cores reconstruídas · ainda com ruído', 'ruído reduzido', 'tons e balanço de branco ajustados'][Math.max(0, cur)];
  svgOut += `<g opacity="${a}"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="none" stroke="rgba(238,241,244,.45)"/><text x="${px}" y="${py - 22}" style="font:500 16px Mono;letter-spacing:.2em;fill:rgba(238,241,244,.6)">PRÉVIA</text><text x="${px}" y="${py + ph + 32}" style="font:400 18px Inter;fill:rgba(238,241,244,.75)">${cap}</text></g>`;
}

window.DURATION = TL.duration;
window.renderAt = async (t) => { render(t); };
await document.fonts.ready;
window.READY = true;
