
// =====================================================================
// bancada: luzes, tapete de corte, sombras
const TABLE_Y = -35.4;
sMain.add(new THREE.HemisphereLight(0xdfe8ff, 0x0b0c0e, .45));
const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-260, 520, 380); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -420, right: 520, top: 380, bottom: -380, near: 10, far: 1600 }); key.shadow.bias = -0.0004; key.shadow.normalBias = .6;
sMain.add(key);
const rim = new THREE.DirectionalLight(0xbcd2ff, 1.0); rim.position.set(420, 220, -520); sMain.add(rim);
const lamp = new THREE.PointLight(0xffe2c0, 0, 420, 1.6); sMain.add(lamp);

const matTex = canvasTex(2048, 2048, (g, w) => {
  g.fillStyle = '#0d1013'; g.fillRect(0, 0, w, w);
  const s = w / 800; // 800 mm de tapete
  for (let i = 0; i <= 800; i += 5) { g.strokeStyle = i % 50 === 0 ? 'rgba(200,215,230,.16)' : i % 10 === 0 ? 'rgba(200,215,230,.07)' : 'rgba(200,215,230,.035)'; g.lineWidth = i % 50 === 0 ? 2 : 1; g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, w); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
  g.fillStyle = 'rgba(200,215,230,.28)'; g.font = `${10 * s}px monospace`;
  for (let i = 50; i < 800; i += 50) { g.fillText(String(i), i * s + 4, 14 * s); g.fillText(String(i), 4, i * s - 4); }
  g.strokeStyle = 'rgba(226,52,45,.55)'; g.lineWidth = 3; g.strokeRect(20 * s, 20 * s, 760 * s, 760 * s);
});
matTex.anisotropy = 8;
const table = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ map: matTex, color: 0x8a8f96, roughness: .95, metalness: 0, envMapIntensity: .25 }));
table.rotation.x = -Math.PI / 2; table.position.set(120, TABLE_Y, -40); table.receiveShadow = true; sMain.add(table);
const below = new THREE.Mesh(new THREE.BoxGeometry(800, 20, 800), new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 1 }));
below.position.set(120, TABLE_Y - 10.05, -40); sMain.add(below);

// parafusos da tampa traseira (peças próprias)
const screws = [];
{
  const head = cylZ(2.4, 1.4, 24), shank = cylZ(1.1, 6, 12); shank.translate(0, 0, 3.6);
  const slotA = new THREE.BoxGeometry(3.4, .5, .5), slotB = new THREE.BoxGeometry(.5, 3.4, .5);
  [[-54, 27], [54, 27], [-54, -27], [54, -27]].forEach(([x, y], i) => {
    const g = new THREE.Group();
    g.add(mesh(head, std(C.metal, .3, .9), { thr: 40, op: .5 }));
    g.add(new THREE.Mesh(shank, std(C.metal, .35, .9)));
    const sa = new THREE.Mesh(slotA, new THREE.MeshBasicMaterial({ color: 0x0a0a0a })); sa.position.z = -.6; g.add(sa);
    const sb = new THREE.Mesh(slotB, new THREE.MeshBasicMaterial({ color: 0x0a0a0a })); sb.position.z = -.6; g.add(sb);
    g.position.set(x, y, -17.6);
    part('parafuso' + (i + 1), g, new THREE.Vector3());
    screws.push(g);
  });
}
// tirar as peças do modo "vídeo": tudo em repouso, aberturas e cortinas abertas
diaphLight.visible = false;
shutter.set(0, 0);

// =====================================================================
// catálogo de peças: ordem de desmontagem, dependências, saída e lugar na bancada
const flat = (sign) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), sign * Math.PI / 2);
const Q0 = new THREE.Quaternion();
const yawQ = (deg, q = Q0) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), deg * D2R).multiply(q);
const SPEC = [
  { id: 'lente', obj: lens, name: 'Lente 50 mm f/1.8', axis: [0, 0, 1], lift: 70, tray: [140, .2, 92], q: flat(-1), twist: true,
    fn: 'Forma a imagem: seus elementos de vidro fazem a luz convergir exatamente sobre o sensor.',
    how: 'Presa pela baioneta. Gire cerca de 45° e ela solta.', tech: 'Baioneta a 18 mm do sensor · 6 elementos neste modelo didático' },
  { id: 'bateria', obj: battery, name: 'Bateria', axis: [0, -1, 0], lift: 64, tray: [104, 27, -24], q: Q0,
    fn: 'Alimenta tudo: sensor, processador, visor, motor do obturador e estabilização.',
    how: 'Sai por baixo, pela porta da empunhadura.', tech: 'Íon-lítio · 7,2 V × 2,28 Ah = 16,4 Wh' },
  { id: 'parafuso1', obj: screws[0], name: 'Parafuso da tampa', axis: [0, 0, -1], lift: 10, tray: [300, 2.2, -2], q: flat(1), screw: true, small: true,
    fn: 'Prende a tampa traseira ao chassi.', how: 'Desparafuse (clique).', tech: 'M1,6 × 6 mm' },
  { id: 'parafuso2', obj: screws[1], name: 'Parafuso da tampa', axis: [0, 0, -1], lift: 10, tray: [312, 2.2, -2], q: flat(1), screw: true, small: true, fn: 'Prende a tampa traseira ao chassi.', how: 'Desparafuse (clique).', tech: 'M1,6 × 6 mm' },
  { id: 'parafuso3', obj: screws[2], name: 'Parafuso da tampa', axis: [0, 0, -1], lift: 10, tray: [300, 2.2, 10], q: flat(1), screw: true, small: true, fn: 'Prende a tampa traseira ao chassi.', how: 'Desparafuse (clique).', tech: 'M1,6 × 6 mm' },
  { id: 'parafuso4', obj: screws[3], name: 'Parafuso da tampa', axis: [0, 0, -1], lift: 10, tray: [312, 2.2, 10], q: flat(1), screw: true, small: true, fn: 'Prende a tampa traseira ao chassi.', how: 'Desparafuse (clique).', tech: 'M1,6 × 6 mm' },
  { id: 'tampa', obj: backCover, name: 'Tampa traseira e LCD', axis: [0, 0, -1], lift: 40, tray: [222, 3.2, 2], q: flat(1), needs: ['parafuso1', 'parafuso2', 'parafuso3', 'parafuso4'],
    fn: 'Fecha a câmera e carrega a tela LCD, a ocular e os botões traseiros.', how: 'Depois dos 4 parafusos, puxe para trás.', tech: 'Tela de ~3″ · ocular com borracha' },
  { id: 'placa', obj: board, name: 'Placa principal', axis: [0, 0, -1], lift: 60, tray: [150, .9, -96], q: flat(1), needs: ['tampa'],
    fn: 'O cérebro da câmera: o processador de imagem transforma os dados do sensor em foto e grava no cartão.', how: 'Solte o flex do sensor e puxe para trás.', tech: 'Processador de imagem · memória · slot SD' },
  { id: 'circuitos', obj: circ, name: 'Placa de E/S e flex', axis: [1, 0, 0], lift: 40, tray: [330, 2, -176], q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2), needs: ['placa'],
    fn: 'Liga conectores (USB, HDMI, microfone) e leva sinais entre as placas pelo cabo flex.', how: 'Sai pela lateral, depois da placa principal.', tech: 'Circuito flexível de cobre sobre poliimida' },
  { id: 'dissipador', obj: heat, name: 'Dissipador de calor', axis: [0, 0, -1], lift: 70, tray: [252, 1.4, -96], q: flat(1), needs: ['placa'],
    fn: 'Tira o calor do sensor e do processador: aquecido, o sensor gera mais ruído.', how: 'Atrás do sensor; sai depois da placa.', tech: 'Alumínio · aletas + heat pipe de cobre' },
  { id: 'visor', obj: evf, name: 'Visor eletrônico', axis: [0, 1, 0], lift: 50, tray: [330, 6.6, -96], q: Q0, needs: ['tampa'],
    fn: 'Mostra ao olho a imagem ao vivo do sensor, já com a exposição final.', how: 'Sobe pelo capô depois da tampa.', tech: 'Tela micro-OLED + ocular de aumento' },
  { id: 'sensor', obj: sensor, name: 'Sensor de imagem', axis: [0, 0, -1], lift: 90, tray: [140, 6.2, -180], q: flat(-1), needs: ['dissipador'],
    fn: 'Converte a luz em carga elétrica, pixel por pixel, sob um filtro de cores Bayer.', how: 'Montado numa placa flutuante (estabilização), sai por trás.', tech: 'Full frame 36 × 24 mm · 6000 × 4000 px · pixel de 6 µm' },
  { id: 'obturador', obj: shutter.g, name: 'Obturador', axis: [0, 0, -1], lift: 110, tray: [232, 5.6, -180], q: flat(-1), needs: ['sensor'],
    fn: 'Duas cortinas de lâminas decidem por quanto tempo a luz atinge o sensor.', how: 'Último módulo antes da baioneta; sai por trás.', tech: 'Plano focal · janela 36 × 24 mm' },
  // desmontagem da lente (depois que ela está na bancada)
  { id: 'frente', obj: lensFront, name: 'Grupo óptico frontal', sub: true, axis: [0, 0, 1], lift: 26, tray: [214, -46.5, 96], q: flat(-1), needs: ['lente'], spin: true,
    fn: 'Os primeiros elementos de vidro: recolhem a luz e começam a convergência.', how: 'Desrosqueia do barril.', tech: 'Elemento frontal ⌀42 mm · rosca de filtro ⌀52' },
  { id: 'foco', obj: lensFocus, name: 'Anel de foco e grupo central', sub: true, axis: [0, 0, 1], lift: 44, tray: [282, -25.4, 96], q: flat(-1), needs: ['frente'],
    fn: 'Girar o anel move o grupo óptico: assim a imagem fica nítida a outras distâncias.', how: 'Sai do barril depois do grupo frontal.', tech: 'Avanço = f² ÷ (d − f): 6,25 mm a 45 cm' },
  { id: 'diafragma', obj: diaph, name: 'Diafragma', sub: true, axis: [0, 0, 1], lift: 50, tray: [346, 1.3, 96], q: flat(-1), needs: ['foco'],
    fn: 'Sete lâminas formam uma abertura variável: controlam a luz e a profundidade de campo.', how: 'Último item dentro do barril traseiro.', tech: 'f/1.8 a f/16 · luz ∝ 1/N²' },
];
const BY = Object.fromEntries(SPEC.map(s => [s.id, s]));
const ORDER = ['lente', 'bateria', 'parafuso1', 'parafuso2', 'parafuso3', 'parafuso4', 'tampa', 'placa', 'circuitos', 'dissipador', 'visor', 'sensor', 'obturador', 'frente', 'foco', 'diafragma'];
const NON_PART = new Set(['corpo']);
const tableY = (y) => TABLE_Y + y;
for (const s of [...SPEC].reverse()) {
  s.state = 'home'; s.t = 0; s.dir = 0; s.twist = s.twist ? 0 : null;
  s.parent = s.obj.parent; s.localP = s.obj.position.clone(); s.localQ = s.obj.quaternion.clone();
  s.trayP = new THREE.Vector3(s.tray[0], tableY(s.tray[1]), s.tray[2]); s.trayQ = s.q.clone();
  s.obj.traverse(o => { o.userData.pid = o.userData.pid || s.id; });
}
body.traverse(o => { o.userData.pid = 'corpo'; });
// materiais próprios por peça (destaque e raio-X sem vazar para outras peças)
const partMats = {};
for (const id of ['corpo', ...ORDER]) {
  const root = id === 'corpo' ? body : BY[id].obj; partMats[id] = [];
  root.traverse(o => {
    if (!o.isMesh || o.isLineSegments2 || o.userData.pid !== id) return;
    o.castShadow = true; o.receiveShadow = true;
    o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
    [].concat(o.material).forEach(m => { if (m.emissive) { m.userData.e0 = m.emissive.clone(); m.userData.ei0 = m.emissiveIntensity; } partMats[id].push(m); });
  });
}

// =====================================================================
// estado da desmontagem
const isOut = (id) => BY[id].state === 'out' || BY[id].state === 'going';
const isHome = (id) => BY[id].state === 'home';
function canRemove(id) { const s = BY[id]; return s.state === 'home' && (s.needs || []).every(n => BY[n].state === 'out'); }
function canReturn(id) { const s = BY[id]; return s.state === 'out' && SPEC.every(z => !(z.needs || []).includes(id) || z.state === 'home'); }
function blocker(id) { const s = BY[id]; const n = (s.needs || []).find(n => BY[n].state !== 'out'); return n ? BY[n] : null; }
function worldPose(o) { o.updateWorldMatrix(true, false); const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); o.matrixWorld.decompose(p, q, sc); return { p, q }; }
function remove(id) {
  const s = BY[id]; if (!canRemove(id)) return false;
  s.started = false;
  if (MOBILE() && !flewToBench) { flewToBench = true; setTimeout(() => frameView(VIEWS.bancada[0], VIEWS.bancada[1]), REDUCED ? 0 : 900); }
  s.state = 'going'; s.dir = 1; if (s.twist !== null && s.twist > -44.9) s.twistTarget = -45;
  select(id, false); refresh(); return true;
}
function reinstall(id) {
  const s = BY[id]; if (!canReturn(id)) return false;
  if (s.sub) { const { p, q } = poseFromLocal(s); s.homeP = p; s.homeQ = q; }
  s.state = 'coming'; s.dir = -1; select(id, false); refresh(); return true;
}
function poseFromLocal(s) { const m = new THREE.Matrix4().compose(s.localP, s.localQ, new THREE.Vector3(1, 1, 1)); s.parent.updateWorldMatrix(true, false); m.premultiply(s.parent.matrixWorld); const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); m.decompose(p, q, sc); return { p, q }; }
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3(), tmpD = new THREE.Vector3();
function pose(s) {
  const t = s.t, A = .34;
  if (t < A) {
    const k = ease(t / A); s.obj.position.copy(s.homeP).addScaledVector(s.axisW, s.lift * k); s.obj.quaternion.copy(s.homeQ);
    if (s.screw || s.spin) s.obj.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -k * Math.PI * (s.screw ? 8 : 3)));
  } else {
    const k = ease((t - A) / (1 - A));
    const P0 = tmpA.copy(s.homeP).addScaledVector(s.axisW, s.lift), P1 = tmpB.copy(P0).add(new THREE.Vector3(0, 70, 0)), P3 = tmpD.copy(s.trayP), P2 = tmpC.copy(P3).add(new THREE.Vector3(0, 90, 0));
    const u = 1 - k; s.obj.position.set(0, 0, 0).addScaledVector(P0, u * u * u).addScaledVector(P1, 3 * u * u * k).addScaledVector(P2, 3 * u * k * k).addScaledVector(P3, k * k * k);
    const qh = s.homeQ.clone(); if (s.screw || s.spin) qh.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI * (s.screw ? 8 : 3)));
    s.obj.quaternion.slerpQuaternions(qh, s.trayQ, k);
  }
}
function step(dt) {
  let moving = false;
  for (const s of SPEC) {
    if (s.twist !== null && s.twistTarget !== undefined) {
      const before = s.twist; s.tv = s.tv || 0; const w = 2 * Math.PI / .35;
      const nS = Math.ceil(dt / .004); for (let k = 0; k < nS; k++) { const h = dt / nS; s.tv += (w * w * (s.twistTarget - s.twist) - 2 * w * s.tv) * h; s.twist += s.tv * h; }
      if (Math.abs(s.twistTarget - s.twist) < .05 && Math.abs(s.tv) < .5) { s.twist = s.twistTarget; s.tv = 0; }
      if (REDUCED) s.twist = s.twistTarget;
      if (s.twist !== before) moving = true;
      if (s.t === 0) s.obj.rotation.z = s.twist * D2R;
    }
    if (s.state === 'going') {
      if (s.twist !== null && s.twist > -44.5) { moving = true; continue; }
      if (!s.started) { const { p, q } = worldPose(s.obj); s.axisW = new THREE.Vector3(...s.axis).applyQuaternion(s.sub ? worldPose(s.parent).q : Q0).normalize(); rig.attach(s.obj); s.homeP = p; s.homeQ = q; s.started = true; }
      s.t = Math.min(1, s.t + dt / (s.small ? 1.1 : 1.7)); if (REDUCED) s.t = 1; pose(s); moving = true;
      if (s.t >= 1) { s.state = 'out'; refresh(); }
    } else if (s.state === 'coming') {
      if (s.t > 0) { s.t = Math.max(0, s.t - dt / (s.small ? 1.1 : 1.7)); if (REDUCED) s.t = 0; pose(s); moving = true; }
      if (s.t <= 0) {
        if (s.obj.parent !== s.parent) { s.parent.add(s.obj); s.obj.position.copy(s.localP); s.obj.quaternion.copy(s.localQ); }
        if (s.twist !== null && s.twist < -.05) { s.twistTarget = 0; s.obj.rotation.z = s.twist * D2R; moving = true; continue; }
        if (s.twist !== null) { s.twist = 0; s.obj.rotation.z = 0; }
        s.started = false; s.state = 'home'; refresh();
      }
    }
  }
  return moving;
}

// =====================================================================
// controles da cena
const controls = new OrbitControls(cam, view);
controls.enableDamping = true; controls.dampingFactor = .08; controls.minDistance = 90; controls.maxDistance = 1300;
controls.maxPolarAngle = Math.PI * .49; controls.target.set(150, -30, -50);
cam.position.set(130, 380, 600);
controls.autoRotate = false; controls.autoRotateSpeed = .5;
function frameView(target, pos) { flyFrom = { t: cam.position.clone(), g: controls.target.clone() }; flyTo = { t: pos, g: target }; flyK = 0; }
let flyFrom = null, flyTo = null, flyK = 1, flewToBench = false;
const VIEWS = {
  camera: [new THREE.Vector3(4, 0, 10), new THREE.Vector3(120, 90, 260)],
  bancada: [new THREE.Vector3(170, -30, -50), new THREE.Vector3(190, 420, 560)],
  costas: [new THREE.Vector3(0, 0, -40), new THREE.Vector3(-160, 140, -320)],
};

// =====================================================================
// interação: passar, clicar, arrastar (girar lente, anel de foco)
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
const pickables = []; sMain.traverse(o => { if (o.isMesh && !o.isLineSegments2 && o.userData.pid) pickables.push(o); });
function pick(e) {
  const r = view.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, cam);
  const hit = ray.intersectObjects(pickables, false).find(h => h.object.visible && h.object.userData.pid);
  if (!hit) return null;
  let id = hit.object.userData.pid;
  // peça da lente ainda montada na câmera = a lente inteira
  if (['frente', 'foco', 'diafragma'].includes(id) && BY.lente.state === 'home') id = hit.object.userData.pid === 'foco' ? 'foco@cam' : 'lente';
  else if (['frente', 'foco', 'diafragma'].includes(id) && BY.lente.state !== 'out') id = 'lente';
  return { id, point: hit.point };
}
let hover = null, drag = null, downAt = null;
function setHover(id) {
  const real = id === 'foco@cam' ? 'lente' : id;
  if (hover === real) return; hover = real;
  for (const [pid, ms] of Object.entries(partMats)) { const on = pid === real || (real === 'lente' && ['frente', 'foco', 'diafragma'].includes(pid) && BY[pid].parent === lens && isHome(pid)); for (const m of ms) if (m.emissive) { m.emissive.copy(on ? new THREE.Color(0x5a1410) : m.userData.e0); m.emissiveIntensity = on ? .55 : m.userData.ei0; } }
  view.style.cursor = id ? (id === 'lente' && isHome('lente') ? 'grab' : id === 'foco@cam' || (id === 'foco' && isHome('foco')) ? 'ew-resize' : 'pointer') : 'default';
  wake();
}
view.addEventListener('pointermove', (e) => {
  if (drag) {
    const dx = e.clientX - drag.x; drag.x = e.clientX; drag.moved += Math.abs(dx);
    if (drag.kind === 'twist') { const s = BY.lente; s.twistTarget = undefined; s.twist = clamp(s.twist - dx * .35, -45, 0); lens.rotation.z = s.twist * D2R; if (s.twist <= -44.9) { drag = null; controls.enabled = true; remove('lente'); } setReadout(`baioneta: ${Math.round(-s.twist)}° de 45°`); }
    if (drag.kind === 'focus') { setFocus(clamp(focusS + dx / 260)); }
    wake(); return;
  }
  const h = pick(e); setHover(h ? h.id : null);
});
view.addEventListener('pointerdown', (e) => {
  downAt = { x: e.clientX, y: e.clientY };
  const h = pick(e); if (!h) return;
  if (h.id === 'lente' && isHome('lente')) { drag = { kind: 'twist', x: e.clientX, moved: 0 }; controls.enabled = false; view.setPointerCapture(e.pointerId); view.style.cursor = 'grabbing'; select('lente'); }
  else if (h.id === 'foco@cam' || (h.id === 'foco' && BY.lente.state === 'out' && isHome('foco'))) { drag = { kind: 'focus', x: e.clientX, moved: 0 }; controls.enabled = false; view.setPointerCapture(e.pointerId); select('foco'); }
});
view.addEventListener('pointerup', (e) => {
  const was = drag; drag = null; controls.enabled = true;
  if (was && was.kind === 'twist' && BY.lente.state === 'home') { if (was.moved < 4 || BY.lente.twist < -30) remove('lente'); else BY.lente.twistTarget = 0; wake(); return; }
  if (was && was.moved > 4) return;
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
  const h = pick(e); if (!h) { select(null); return; }
  const id = h.id === 'foco@cam' ? 'lente' : h.id;
  if (id === 'corpo') { select('corpo'); return; }
  if (BY[id] && canRemove(id) && !BY[id].sub) { remove(id); return; }
  if (BY[id] && BY[id].sub && canRemove(id)) { remove(id); return; }
  select(id);
  if (BY[id] && isHome(id) && !canRemove(id)) { const b = blocker(id); toast(b ? `Antes, remova: ${b.name.toLowerCase()}.` : ''); }
});
view.addEventListener('pointerleave', () => setHover(null));

// =====================================================================
// foco, abertura, obturador (controles das peças)
let focusS = 0, focusRing = 0;
function setFocus(s) {
  focusS = s; const d = s < 1e-3 ? Infinity : 450 / s, e = d === Infinity ? 0 : 2500 / (d - 50);
  lensFocus.rotation.z = -s * 80 * D2R; if (isHome('frente')) lensFront.position.z = BY.frente.localP.z + e;
  focusRing = e; const el = document.getElementById('focusVal'); if (el) el.textContent = `${d === Infinity ? '∞' : (d / 1000).toFixed(2).replace('.', ',') + ' m'} · avanço ${e.toFixed(2).replace('.', ',')} mm`;
  const sl = document.getElementById('focus'); if (sl && +sl.value !== Math.round(s * 1000)) sl.value = Math.round(s * 1000);
  wake();
}
const STOPS = [1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16];
let fIdx = 0;
function setStop(i) { fIdx = i; const N = STOPS[i]; setAperture(R_MAX * 1.8 / N * .97); const el = document.getElementById('apVal'); if (el) el.textContent = `f/${String(N).replace('.', ',')} · ${Math.max(1, Math.round(100 * (1.8 / N) ** 2))}% da luz de f/1,8`; wake(); }
let shot = null;
function fire(speed) { const T = 1000 / speed; shot = { t: 0, T, slow: Math.round(1.6 / ((6 + T) / 1000) / 10) * 10 }; const el = document.getElementById('shVal'); if (el) el.textContent = `1/${speed} s · câmera lenta ×${shot.slow}`; wake(); }
function shutterStep(dt) {
  if (!shot) return false; shot.t += dt; const TAU = 3, ms = (shot.t / 1.6) * (TAU * 2 + shot.T);
  const a = 1 - clamp(ms / TAU), b = clamp((ms - shot.T) / TAU);
  if (shot.t < .25) shutter.set(clamp(shot.t / .25), 0); else shutter.set(a, b);
  lamp.intensity = 0;
  if (shot.t > 2.4) { shutter.set(0, 0); shot = null; }
  return true;
}

// =====================================================================
// interface
const $ = (id) => document.getElementById(id);
const stepsEl = $('steps'), card = $('card'); let lastNext = null;
let selected = null;
function select(id, open = true) { selected = id; renderCard(); renderSteps(); if (id && (open || !MOBILE())) openSheet(MOBILE() ? 'half' : 'open'); }
function setReadout(t) { $('readout').textContent = t; }
let toastT = 0; function toast(msg) { if (!msg) return; const el = $('toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), 2600); }
const LABEL = { parafuso1: 'Parafuso 1', parafuso2: 'Parafuso 2', parafuso3: 'Parafuso 3', parafuso4: 'Parafuso 4' };
function renderSteps() {
  const done = SPEC.filter(s => s.state === 'out').length;
  $('progress').textContent = `${done} de ${SPEC.length} peças na bancada`;
  $('bar').style.width = `${(done / SPEC.length) * 100}%`;
  const next = ORDER.find(id => canRemove(id));
  const nextS = next ? BY[next] : null;
  $('nextline').innerHTML = nextS ? `Próximo: <b>${LABEL[next] || nextS.name}</b>${next === 'lente' ? ' · arraste a lente para girar' : ' · toque na peça'}` : 'Câmera desmontada · toque numa peça para ver a ficha';
  const strip = ORDER.map((id, i) => { const s = BY[id], st = s.state === 'out' ? 'out' : s.state === 'home' ? (canRemove(id) ? 'ready' : 'locked') : 'moving'; return `<li><button type="button" data-id="${id}" data-st="${st}"${id === next ? ' data-next' : ''}><span class="n">${String(i + 1).padStart(2, '0')}</span>${LABEL[id] || s.name.replace(' e grupo central', '').replace(' traseira e LCD', ' traseira')}</button></li>`; }).join('');
  const stripEl = $('strip'); if (stripEl.innerHTML !== strip) { const x = stripEl.scrollLeft; stripEl.innerHTML = strip; stripEl.scrollLeft = x; const nb = stripEl.querySelector('[data-next]'); if (nb && next !== lastNext) nb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: REDUCED ? 'auto' : 'smooth' }); }
  lastNext = next;
  stepsEl.innerHTML = ORDER.map((id, i) => {
    const s = BY[id], st = s.state === 'out' ? 'out' : s.state === 'home' ? (canRemove(id) ? 'ready' : 'locked') : 'moving';
    return `<li><button type="button" data-id="${id}" data-st="${st}"${id === next ? ' data-next' : ''}${id === selected ? ' aria-current="true"' : ''}><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">${LABEL[id] || s.name}</span><span class="s">${st === 'out' ? 'na bancada' : st === 'ready' ? 'remover' : st === 'moving' ? '…' : 'bloqueada'}</span></button></li>`;
  }).join('');
}
const onStepClick = (e) => { const b = e.target.closest('button'); if (!b) return; const id = b.dataset.id; if (canRemove(id)) remove(id); else { select(id); if (!isOut(id)) { const bl = blocker(id); toast(bl ? `Antes, remova: ${bl.name.toLowerCase()}.` : ''); } } };
$('strip').addEventListener('click', onStepClick);
stepsEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const id = b.dataset.id; if (canRemove(id)) remove(id); else { select(id); if (!isOut(id)) { const bl = blocker(id); toast(bl ? `Antes, remova: ${bl.name.toLowerCase()}.` : ''); } } });
stepsEl.addEventListener('pointerover', (e) => { const b = e.target.closest('button'); setHover(b ? b.dataset.id : null); });
stepsEl.addEventListener('pointerleave', () => setHover(null));
const CORPO = { name: 'Corpo (chassi)', fn: 'A estrutura que mantém lente, obturador e sensor alinhados com precisão de centésimos de milímetro.', how: 'Fica na bancada: é a base de todo o resto.', tech: 'Liga de magnésio · baioneta metálica' };
function renderCard() {
  if (!selected) { card.innerHTML = `<p class="eyebrow">Como usar</p><ul class="how"><li><b>Arraste o fundo</b> para girar a vista; ${MOBILE() ? '<b>pince</b>' : '<b>role</b>'} para aproximar.</li><li><b>Arraste a lente</b> de lado: ela gira na baioneta e solta.</li><li><b>${MOBILE() ? 'Toque' : 'Clique'} numa peça</b> livre para tirá-la.</li><li>Na bancada, ${MOBILE() ? 'toque' : 'clique'} numa peça para ver a ficha ou reinstalar.</li></ul>`; return; }
  const s = selected === 'corpo' ? CORPO : BY[selected]; const id = selected;
  const st = id === 'corpo' ? '' : s.state === 'out' ? 'Na bancada' : canRemove(id) ? 'Pronta para sair' : s.state === 'home' ? 'Presa' : 'Em movimento';
  let ctrl = '';
  if (['lente', 'foco', 'frente'].includes(id)) ctrl += `<label class="ctl" for="focus"><span>Foco</span><output id="focusVal"></output></label><input id="focus" type="range" min="0" max="1000" value="${Math.round(focusS * 1000)}">`;
  if (['lente', 'diafragma'].includes(id)) ctrl += `<label class="ctl" for="ap"><span>Abertura</span><output id="apVal"></output></label><input id="ap" type="range" min="0" max="${STOPS.length - 1}" value="${fIdx}">`;
  if (id === 'obturador') ctrl += `<div class="ctl"><span>Disparar</span><output id="shVal">escolha a velocidade</output></div><div class="row">${[1000, 250, 30].map(v => `<button type="button" class="pill" data-fire="${v}">1/${v} s</button>`).join('')}</div>`;
  let act = '';
  if (id !== 'corpo') {
    if (canRemove(id)) act = `<button type="button" class="act" data-act="remove">Remover peça</button>`;
    else if (s.state === 'out') act = canReturn(id) ? `<button type="button" class="act ghost" data-act="return">Reinstalar</button>` : `<p class="lock">Para reinstalar, recoloque antes as peças que vão por dentro dela.</p>`;
    else if (s.state === 'home') { const b = blocker(id); act = `<p class="lock">Antes, remova: ${b ? b.name.toLowerCase() : ''}.</p>`; }
  }
  card.innerHTML = `<p class="eyebrow">${st}</p><h2>${s.name}</h2><p>${s.fn}</p><dl><div><dt>Como sai</dt><dd>${s.how}</dd></div><div><dt>Dados</dt><dd>${s.tech}</dd></div></dl>${ctrl}${act}`;
  if ($('focus')) { $('focus').addEventListener('input', (e) => setFocus(e.target.value / 1000)); setFocus(focusS); }
  if ($('ap')) { $('ap').addEventListener('input', (e) => setStop(+e.target.value)); setStop(fIdx); }
  card.querySelectorAll('[data-fire]').forEach(b => b.addEventListener('click', () => { if (isHome('obturador') && !xray) toast('O obturador está dentro da câmera: remova-o ou ative o raio-X para ver as cortinas.'); fire(+b.dataset.fire); }));
  const a = card.querySelector('[data-act]'); if (a) a.addEventListener('click', () => (a.dataset.act === 'remove' ? remove(id) : reinstall(id)));
}
function refresh() { renderSteps(); renderCard(); wake(); }
$('all').addEventListener('click', async () => { for (const id of ORDER) { while (!canRemove(id) && BY[id].state !== 'out') await new Promise(r => setTimeout(r, 120)); if (canRemove(id)) { remove(id); await new Promise(r => setTimeout(r, REDUCED ? 0 : 380)); } } });
$('none').addEventListener('click', async () => { for (const id of [...ORDER].reverse()) { while (BY[id].state === 'going') await new Promise(r => setTimeout(r, 120)); if (canReturn(id)) { reinstall(id); await new Promise(r => setTimeout(r, REDUCED ? 0 : 300)); } } });
let xray = false;
$('xray').addEventListener('click', () => { xray = !xray; $('xray').setAttribute('aria-pressed', xray); const ids = ['corpo', 'tampa']; for (const id of ids) for (const m of partMats[id]) { m.transparent = xray; m.opacity = xray ? .16 : 1; m.depthWrite = !xray; m.needsUpdate = true; } wake(); });
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { const v = VIEWS[b.dataset.view]; frameView(v[0], v[1]); wake(); }));

// ---------- ficha: painel à direita (desktop) ou gaveta com mola (celular) ----------
const MOBILE = () => matchMedia('(max-width: 860px)').matches;
const sheet = $('sheet'), grab = $('grab');
const sh = { y: 0, v: 0, target: 0, raf: 0, drag: null };
function detents() { const H = sheet.getBoundingClientRect().height; const head = 112; return { peek: H - head, half: Math.max(0, H - innerHeight * .46), full: 0 }; }
function setY(y) { sh.y = y; sheet.style.setProperty('--y', y.toFixed(1) + 'px'); document.documentElement.style.setProperty('--sheet-top', (innerHeight - (sheet.getBoundingClientRect().height - y)) + 'px'); }
function springTo(name, v0 = 0, zeta = 1) {
  const d = detents(); sh.target = d[name] ?? d.peek; sh.v = v0; sh.zeta = zeta; sh.name = name;
  if (REDUCED) { setY(sh.target); return; }
  if (!sh.raf) { let t0 = 0; const tick = (now) => { const dt = t0 ? Math.min((now - t0) / 1000, 1 / 30) : 1 / 60; t0 = now; const w = 2 * Math.PI / .32;
    const nS = Math.ceil(dt / .004); for (let k = 0; k < nS; k++) { const h = dt / nS; sh.v += (w * w * (sh.target - sh.y) - 2 * sh.zeta * w * sh.v) * h; sh.y += sh.v * h; }
    if (Math.abs(sh.target - sh.y) < .3 && Math.abs(sh.v) < 8) { setY(sh.target); sh.raf = 0; return; } setY(sh.y); sh.raf = requestAnimationFrame(tick); };
    sh.raf = requestAnimationFrame(tick); }
}
function openSheet(which) {
  if (MOBILE()) { if (which === 'half' && sh.name === 'full') return; springTo(which === 'open' ? 'half' : which); return; }
  sheet.removeAttribute('data-collapsed'); $('info').hidden = true;
}
$('close').addEventListener('click', () => { sheet.setAttribute('data-collapsed', ''); $('info').hidden = false; });
$('info').addEventListener('click', () => { sheet.removeAttribute('data-collapsed'); $('info').hidden = true; });
const rubber = (o, dim, c = .55) => (o * dim * c) / (dim + c * Math.abs(o));
function startDrag(e) {
  if (!MOBILE() || (e.target.closest('#strip') && e.currentTarget !== grab)) return;
  if (sh.raf) { cancelAnimationFrame(sh.raf); sh.raf = 0; }
  sh.drag = { id: e.pointerId, y0: e.clientY, from: sh.y, hist: [[e.clientY, performance.now()]], moved: false };
}
function moveDrag(e) {
  const g = sh.drag; if (!g || e.pointerId !== g.id) return;
  const dy = e.clientY - g.y0; if (!g.moved && Math.abs(dy) < 8) return;
  if (!g.moved) { g.moved = true; e.currentTarget.setPointerCapture(e.pointerId); }
  const d = detents(); let y = g.from + dy; if (y < d.full) y = d.full - rubber(d.full - y, innerHeight); if (y > d.peek) y = d.peek + rubber(y - d.peek, innerHeight);
  setY(y); g.hist.push([e.clientY, performance.now()]); if (g.hist.length > 5) g.hist.shift();
}
function endDrag(e) {
  const g = sh.drag; if (!g || e.pointerId !== g.id) return; sh.drag = null;
  if (!g.moved) { if (e.currentTarget === grab) springTo(sh.name === 'peek' ? 'half' : sh.name === 'half' ? 'full' : 'peek'); return; }
  const [a, b] = [g.hist[0], g.hist[g.hist.length - 1]]; const v = (b[0] - a[0]) / Math.max(1, b[1] - a[1]) * 1000;
  const proj = sh.y + (v / 1000) * .99 / (1 - .99);
  const d = detents(); const name = Object.entries(d).sort((p, q) => Math.abs(p[1] - proj) - Math.abs(q[1] - proj))[0][0];
  springTo(name, v, Math.abs(v) > 400 ? .8 : 1);
}
for (const el of [grab, sheet.querySelector('.strip-wrap')]) { el.addEventListener('pointerdown', startDrag); el.addEventListener('pointermove', moveDrag); el.addEventListener('pointerup', endDrag); el.addEventListener('pointercancel', endDrag); }
grab.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); springTo(sh.name === 'full' ? 'peek' : 'full'); } });
// tocar na cena recolhe a gaveta para a posição baixa
view.addEventListener('pointerdown', () => { if (MOBILE() && sh.name !== 'peek') springTo('peek'); }, true);
// enquadramento conforme a proporção da tela
function fitView() {
  const a = cam.aspect, far = a < .8 ? 1.75 : a < 1.2 ? 1.3 : 1;
  VIEWS.bancada[1] = new THREE.Vector3(190, 420, 560).sub(VIEWS.bancada[0]).multiplyScalar(far).add(VIEWS.bancada[0]);
  VIEWS.camera[1] = new THREE.Vector3(120, 90, 260).sub(VIEWS.camera[0]).multiplyScalar(far).add(VIEWS.camera[0]);
  if (MOBILE()) { VIEWS.bancada = [new THREE.Vector3(150, -30, -50), new THREE.Vector3(900, 560, 40)]; VIEWS.camera = [new THREE.Vector3(10, -6, 10), new THREE.Vector3(230, 170, 380)]; }
}
// rótulos das peças na bancada
const tags = $('tags');
function renderTags() {
  let html = ''; const r = view.getBoundingClientRect();
  for (const s of SPEC) {
    if (s.state !== 'out' || s.screw && s.id !== 'parafuso1') continue;
    const p = s.trayP.clone(); p.y = TABLE_Y + 1; p.z += s.screw ? 22 : 0; p.project(cam);
    if (p.z > 1) continue;
    const x = (p.x * .5 + .5) * r.width, y = (-p.y * .5 + .5) * r.height;
    html += `<span class="tag${s.id === selected ? ' on' : ''}" style="transform:translate(${x.toFixed(0)}px,${y.toFixed(0)}px)">${s.screw ? '4 parafusos' : s.name.split(' ')[0] === 'Grupo' ? 'Grupo frontal' : s.name.replace(' de imagem', '').replace(' e grupo central', '').replace(' traseira e LCD', ' traseira')}</span>`;
  }
  if (tags.innerHTML !== html) tags.innerHTML = html;
}

// =====================================================================
// laço
let last = 0, awake = 0, raf = 0;
function wake() { awake = performance.now() + 900; if (!raf) raf = requestAnimationFrame(loop); }
controls.addEventListener('change', wake);
function resize() {
  const r = view.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false);
  cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix();
  RES.set(r.width * DPR, r.height * DPR); for (const m of allEdgeMats) m.resolution.copy(RES);
  fitView(); if (MOBILE()) springTo(sh.name || 'peek'); else { sheet.style.removeProperty('--y'); }
  wake();
}
new ResizeObserver(resize).observe(view.parentElement);
function loop(now) {
  const dt = (window.__TS || 1) * (last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60); last = now;
  let busy = step(dt) | shutterStep(dt);
  if (flyTo) { flyK = Math.min(1, flyK + dt / 1.1); const k = ease(flyK); cam.position.lerpVectors(flyFrom.t, flyTo.t, k); controls.target.lerpVectors(flyFrom.g, flyTo.g, k); if (flyK >= 1) flyTo = null; busy = true; }
  controls.update();
  renderer.render(sMain, cam); renderTags();
  if (busy || drag || now < awake) raf = requestAnimationFrame(loop); else { raf = 0; last = 0; }
}
resize(); { const v = MOBILE() ? VIEWS.camera : VIEWS.bancada; cam.position.copy(v[1]); controls.target.copy(v[0]); } if (MOBILE()) { setY(detents().peek); sh.name = 'peek'; } setStop(0); setFocus(0); renderSteps(); renderCard(); wake();
window.TEARDOWN = { remove, reinstall, BY, select, setFocus, setStop, fire, frameView, VIEWS, cam, controls };
window.READY = true;
