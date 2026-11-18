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

