
// =====================================================================
// AMBIENTE: grade, plataforma, partículas
const FLOOR_Y = -120;
sMain.fog = null;
const roomTex = (() => { const c = document.createElement('canvas'); c.width = 1600; c.height = 1000; const g = c.getContext('2d'); const r = rng(21);
  const bg = g.createLinearGradient(0, 0, 0, 1000); bg.addColorStop(0, '#191512'); bg.addColorStop(.55, '#100e0d'); bg.addColorStop(1, '#070707'); g.fillStyle = bg; g.fillRect(0, 0, 1600, 1000);
  const wall = g.createRadialGradient(800, 380, 40, 800, 420, 760); wall.addColorStop(0, 'rgba(120,96,70,.28)'); wall.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = wall; g.fillRect(0, 0, 1600, 1000);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(1180, 0, 120, 1000); g.fillRect(140, 300, 360, 520);
  for (let i = 0; i < 46; i++) { const x = r() * 1600, y = 120 + r() * 760, rad = 8 + r() * 46, warm = r() < .7; const b = g.createRadialGradient(x, y, 0, x, y, rad); const col = warm ? [220, 160, 90] : [120, 190, 230]; b.addColorStop(0, `rgba(${col},${.05 + r() * .1})`); b.addColorStop(.75, `rgba(${col},${.03 + r() * .05})`); b.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = b; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
sMain.background = roomTex;
const gridMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uA: { value: 0 } },
  vertexShader: `varying vec2 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uT; uniform float uA; varying vec2 vP;
    float line(float v, float s, float w){ float d = abs(fract(v / s - .5) - .5) * s; return 1. - smoothstep(0., w, d); }
    void main(){ float r = length(vP);
      float g = max(line(vP.x, 25., .5), line(vP.y, 25., .5)) * .22 + line(r, 70., .6) * .35;
      float pulse = exp(-pow((r - mod(uT * 70., 800.)) / 14., 2.)) * .6;
      float fade = 1. - smoothstep(120., 700., r);
      gl_FragColor = vec4(vec3(.15,.7,1.) * (g + pulse * .4) * fade * uA, 1.); }` });
const grid = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), gridMat); grid.visible = false;
const pad = new THREE.Group(); pad.visible = false;
const padMat = new THREE.LineBasicMaterial({ color: 0x3fd6ff, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false });
for (const r of [140, 148, 176]) { const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); } pad.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), padMat)); }
{ const pts = []; for (let i = 0; i < 90; i++) { const a = i / 90 * Math.PI * 2, l = i % 9 === 0 ? 14 : 5; pts.push(new THREE.Vector3(Math.cos(a) * 148, 0, Math.sin(a) * 148), new THREE.Vector3(Math.cos(a) * (148 + l), 0, Math.sin(a) * (148 + l))); } pad.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), padMat)); }
const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 }, uT: { value: 0 } },
  vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `uniform float uA; uniform float uT; varying vec2 vU; void main(){ float s = .7 + .3 * sin(vU.x * 60. + uT * 2.); gl_FragColor = vec4(vec3(.2,.75,1.) * pow(1. - vU.y, 2.6) * .06 * s * uA, 1.); }` });
const beam = new THREE.Mesh(new THREE.CylinderGeometry(140, 150, 150, 72, 1, true), beamMat); beam.visible = false;
const NPART = 600; const pr = rng(5); const ppos = new Float32Array(NPART * 3), pseed = new Float32Array(NPART);
for (let i = 0; i < NPART; i++) { const a = pr() * Math.PI * 2, r = 20 + pr() * 340; ppos.set([Math.cos(a) * r, FLOOR_Y + pr() * 480, Math.sin(a) * r * .7], i * 3); pseed[i] = pr(); }
const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3)); pgeo.setAttribute('seed', new THREE.BufferAttribute(pseed, 1));
const pmat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uA: { value: 0 }, uPx: { value: DPR } },
  vertexShader: `attribute float seed; uniform float uT; uniform float uPx; varying float vA; void main(){ vec3 p = position; p.y = ${FLOOR_Y.toFixed(1)} + mod(p.y - ${FLOOR_Y.toFixed(1)} + uT * (3. + seed * 6.), 480.); p.x += sin(uT * .3 + seed * 30.) * 6.; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = (.8 + seed * 1.8) * uPx * (520. / -mv.z); vA = .3 + .7 * seed; }`,
  fragmentShader: `uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(vec3(.75,.85,.9) * (1. - d * 2.) * vA * .28 * uA, 1.); }` });
sMain.add(new THREE.Points(pgeo, pmat));

// =====================================================================
// HOLOGRAMA: mesmo modelo, peças independentes, material holográfico
rig.position.y = -6;
diaphLight.visible = false; shutter.set(0, 0);
const holo = new THREE.Group(); sMain.add(holo); holo.add(rig);      // holo gira/escala; rig carrega as peças
const optics = new THREE.Group(); lens.add(optics);
const glassMeshes = []; for (const g of [lensRear, lensFocus, lensFront]) g.traverse(o => { if (o.isMesh && o.material === mGlass) glassMeshes.push(o); });
for (const g of glassMeshes) optics.attach(g);
const cardG = new THREE.Group(); rig.add(cardG); cardG.position.copy(board.position);
for (const c of board.children.filter(c => c === board.userData.card || (c.isMesh && c.geometry && c.geometry.type === 'PlaneGeometry' && c.position.x < -30))) cardG.add(c);
const cmos = new THREE.Group(); sensor.add(cmos); for (const c of sensor.children.slice(5, 32)) cmos.attach(c);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const COMP = [
  ['corpo', body, V3(0, 0, 0)], ['tampa', backCover, V3(0, 0, -235)], ['lente', lens, V3(0, 0, 92)], ['opticos', optics, V3(0, 0, 150)],
  ['foco', lensFocus, V3(0, 0, 40)], ['diafragma', diaph, V3(0, 0, 20)], ['cartao', cardG, V3(-70, 0, -192)], ['visor', evf, V3(0, 70, 0)],
  ['bateria', battery, V3(0, -100, 0)], ['obturador', shutter.g, V3(0, 0, -62)], ['ibis', sensor, V3(0, 0, -112)], ['sensor', cmos, V3(0, 0, 22)],
  ['placa', board, V3(0, 0, -192)], ['dissipador', heat, V3(0, 0, -150)], ['circuitos', circ, V3(80, 0, -60)],
].map(([id, obj, off]) => ({ id, obj, off, rest: obj.position.clone(), user: V3(0, 0, 0), vel: V3(0, 0, 0), spin: 0, spinV: 0, home: null }));
const BY = Object.fromEntries(COMP.map(c => [c.id, c]));
for (const c of COMP) c.obj.traverse(o => { o.userData.pid = c.id; });

// material holográfico: brilho de borda (fresnel), linhas de varredura e cintilação
const HOLO_VS = `varying vec3 vN; varying vec3 vV; varying vec3 vW; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = -mv.xyz; vW = (modelMatrix * vec4(position, 1.)).xyz; gl_Position = projectionMatrix * mv; }`;
const HOLO_FS = `uniform float uT; uniform float uHi; uniform float uA; uniform vec3 uC; varying vec3 vN; varying vec3 vV; varying vec3 vW;
  void main(){ float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.2);
    float scan = .62 + .38 * sin(vW.y * 1.4 - uT * 5.);
    float band = smoothstep(.0, .02, abs(fract(vW.y * .02 - uT * .25) - .5) - .45);
    float flick = .93 + .07 * sin(uT * 47. + vW.x * .3);
    vec3 col = uC * (.006 + f * .2) * scan * flick + uC * band * .03 + vec3(.7, .95, 1.) * uHi * (.04 + f * .3);
    gl_FragColor = vec4(col * uA, 1.); }`;
const holoMats = {};
const T = { value: 0 }, A = { value: 0 };
rig.traverse(o => {
  if (!o.isMesh || o.isLineSegments2 || !o.userData.pid) return;
  const id = o.userData.pid; if (!holoMats[id]) holoMats[id] = new THREE.ShaderMaterial({ vertexShader: HOLO_VS, fragmentShader: HOLO_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uT: T, uA: A, uHi: { value: 0 }, uC: { value: new THREE.Color(0x7fd8ff) } } });
  o.material = holoMats[id];
});
const edgeBy = {}; rig.traverse(o => { if (o.isMesh && o.edgeLine && o.userData.pid) { const m = o.edgeLine.material; m.color.set(0xbcefff); m.blending = THREE.AdditiveBlending; m.depthTest = false; (edgeBy[o.userData.pid] ||= []).push(m); } });
const EDGE = .62;

// =====================================================================
// POSE: abrir/fechar + peças soltas com inércia
let E = 0, Etarget = 0;
function applyPose(dt) {
  for (const c of COMP) {
    if (!c.grab) { // peça solta continua no embalo e desacelera; muito longe volta devagar
      if (c.vel.lengthSq() > 1e-4) { c.user.addScaledVector(c.vel, dt); c.vel.multiplyScalar(Math.exp(-dt * 1.6)); }
      const far = c.user.length(); if (far > 320) c.user.multiplyScalar(1 - Math.min(1, (far - 320) / far * dt * 3));
      if (c.home) { c.home.t += dt / .9; const k = ease(c.home.t); c.user.lerpVectors(c.home.from, V3(0, 0, 0), k); c.spin = c.home.spin * (1 - k); if (c.home.t >= 1) { c.home = null; c.user.set(0, 0, 0); c.vel.set(0, 0, 0); c.spin = 0; c.spinV = 0; } }
      if (Math.abs(c.spinV) > 1e-3) { c.spin += c.spinV * dt; c.spinV *= Math.exp(-dt * 1.2); }
    }
    c.obj.position.copy(c.rest).addScaledVector(c.off, E).add(c.user);
    c.obj.rotation.y = c.spin;
  }
  glassMeshes.forEach((g, i) => { g.position.z = (g.userData.z0 ??= g.position.z) + E * (i * 9); });
  lensFront.position.z = 62 * E; lensRear.position.z = 0;
}

// =====================================================================
// GESTOS
const pointers = new Map(); let mode = null, grabbed = null, hover = null;
const rot = { yaw: -.5, pitch: .18, vy: 0, vp: 0 }, view3 = { scale: 1, s: 1, pan: V3(0, 0, 0) };
let lastTap = { t: 0, x: 0, y: 0, id: null }, idle = 0;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const pickables = []; rig.traverse(o => { if (o.isMesh && !o.isLineSegments2 && o.userData.pid) pickables.push(o); });
function rayAt(x, y) { const r = view.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); return ray; }
function pickAt(x, y) { const h = rayAt(x, y).intersectObjects(pickables, false)[0]; return h ? { id: h.object.userData.pid, point: h.point } : null; }
const plane = new THREE.Plane(), tmp = V3(0, 0, 0);
function planePoint(x, y) { return rayAt(x, y).ray.intersectPlane(plane, V3(0, 0, 0)); }
function worldToParent(c, v) { const p = c.obj.parent; const a = p.worldToLocal(v.clone()), b = p.worldToLocal(V3(0, 0, 0)); return a.sub(b); }
view.addEventListener('pointerdown', (e) => {
  view.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now(), hist: [[e.clientX, e.clientY, performance.now()]] });
  idle = 0; skipIntro(); document.body.classList.add('touched');
  if (pointers.size === 1) {
    const hit = pickAt(e.clientX, e.clientY);
    if (hit && hit.id !== 'corpo' && !e.shiftKey && e.button !== 2) {
      ripple(hit.point); const c = BY[hit.id]; grabbed = c; c.grab = true; c.home = null; c.vel.set(0, 0, 0);
      plane.setFromNormalAndCoplanarPoint(cam.getWorldDirection(V3(0, 0, 0)).negate(), hit.point);
      grabbed.last = hit.point.clone(); grabbed.lastT = performance.now(); grabbed.wv = V3(0, 0, 0); mode = 'part';
    } else { if (hit) ripple(hit.point); mode = e.button === 2 || e.shiftKey ? 'pan' : 'rotate'; }
  } else if (pointers.size === 2) { release(); mode = 'pinch'; const [a, b] = [...pointers.values()]; pinch0 = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, scale: view3.scale, yaw: rot.yaw, pan: view3.pan.clone() }; }
});
let pinch0 = null;
view.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) { if (e.pointerType === 'mouse') { const h = pickAt(e.clientX, e.clientY); hover = h && h.id !== 'corpo' ? h.id : null; view.style.cursor = hover ? 'grab' : 'default'; } return; }
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; p.hist.push([p.x, p.y, performance.now()]); if (p.hist.length > 6) p.hist.shift();
  if (mode === 'rotate') { rot.yaw += dx * .006; rot.pitch = clamp(rot.pitch + dy * .005, -1.1, 1.1); }
  if (mode === 'pan') { view3.pan.x += dx * .5; view3.pan.y -= dy * .5; }
  if (mode === 'part' && grabbed) {
    const w = planePoint(e.clientX, e.clientY); if (w) { const d = w.clone().sub(grabbed.last); grabbed.user.add(worldToParent(grabbed, d)); const now = performance.now(), dtt = Math.max(1, now - grabbed.lastT) / 1000; grabbed.wv.lerp(worldToParent(grabbed, d).divideScalar(dtt), .5); grabbed.last = w; grabbed.lastT = now; grabbed.spinV = clamp(grabbed.spinV * .8 + dx * .02, -6, 6); }
    view.style.cursor = 'grabbing';
  }
  if (mode === 'pinch' && pointers.size === 2) {
    const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
    view3.scale = clamp(pinch0.scale * d / pinch0.d, .35, 3); rot.yaw = pinch0.yaw + (ang - pinch0.ang);
    view3.pan.x = pinch0.pan.x + ((a.x + b.x) / 2 - pinch0.mx) * .5; view3.pan.y = pinch0.pan.y - ((a.y + b.y) / 2 - pinch0.my) * .5;
  }
});
function release() { if (grabbed) { grabbed.grab = false; grabbed.vel.copy(grabbed.wv || V3(0, 0, 0)).clampLength(0, 900); grabbed = null; } }
function up(e) {
  const p = pointers.get(e.pointerId); if (!p) return; pointers.delete(e.pointerId);
  const now = performance.now(), moved = Math.hypot(e.clientX - p.x0, e.clientY - p.y0);
  if (mode === 'rotate' && p.hist.length > 1) { const a = p.hist[0], b = p.hist[p.hist.length - 1], dt = Math.max(16, b[2] - a[2]) / 1000; if (now - b[2] < 80) { rot.vy = (b[0] - a[0]) / dt * .006; rot.vp = (b[1] - a[1]) / dt * .005; } }
  const wasPart = mode === 'part' && grabbed; const gid = grabbed && grabbed.id;
  if (mode === 'part') release();
  if (moved < 8 && now - p.t < 300) { // toque
    const hit = pickAt(e.clientX, e.clientY); const id = hit ? hit.id : null; 
    if (now - lastTap.t < (window.__DBL || 400) && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) { // dois toques
      if (id && id !== 'corpo' && (BY[id].user.lengthSq() > 1 || Math.abs(BY[id].spin) > .01)) sendHome(BY[id]); else toggleOpen();
      lastTap.t = 0;
    } else lastTap = { t: now, x: e.clientX, y: e.clientY, id };
  }
  void wasPart; void gid;
  if (pointers.size === 0) mode = null; else if (pointers.size === 1) { mode = 'rotate'; }
  view.style.cursor = 'default';
}
view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
view.addEventListener('contextmenu', (e) => e.preventDefault());
view.addEventListener('wheel', (e) => { e.preventDefault(); idle = 0; skipIntro(); view3.scale = clamp(view3.scale * Math.exp(-e.deltaY * .0012), .35, 3); }, { passive: false });
function sendHome(c) { c.home = { t: 0, from: c.user.clone(), spin: c.spin }; c.vel.set(0, 0, 0); c.spinV = 0; }
function toggleOpen() { Etarget = Etarget > .3 ? 0 : 1; if (Etarget === 0) for (const c of COMP) if (c.user.lengthSq() > .01 || Math.abs(c.spin) > .01) sendHome(c); }
document.getElementById('bOpen').addEventListener('click', () => { skipIntro(); toggleOpen(); });
document.getElementById('bReset').addEventListener('click', () => { skipIntro(); Etarget = 0; for (const c of COMP) sendHome(c); rot.vy = 0; rot.vp = 0; resetView = { t: 0, yaw: rot.yaw, pitch: rot.pitch, s: view3.scale, pan: view3.pan.clone() }; });
let resetView = null;
addEventListener('keydown', (e) => { if (e.key === ' ') { e.preventDefault(); toggleOpen(); } if (e.key.toLowerCase() === 'r') document.getElementById('bReset').click(); });

// =====================================================================
// ABERTURA: grade acende, o holograma se materializa e se abre
const intro = { t: REDUCED ? 99 : 0, done: REDUCED };
function skipIntro() { if (!intro.done) intro.t = 99; }
function introStep(dt) {
  if (intro.done) return; intro.t += dt; const t = intro.t;
  gridMat.uniforms.uA.value = ease(t / 1.4); pmat.uniforms.uA.value = ease((t - .5) / 1.5); beamMat.uniforms.uA.value = ease((t - 1) / 1.2);
  A.value = ease((t - 1.3) / 1.6) * (t < 2.9 ? (.6 + .4 * Math.sin(t * 40)) : 1); for (const ms of Object.values(edgeBy)) for (const m of ms) m.opacity = EDGE * ease((t - 1.1) / 1.4);
  rot.yaw = lerp(-2.2, -.5, ease((t - 1) / 3.5));
  if (t > 3.6 && !intro.opened) { intro.opened = true; Etarget = .75; }
  document.body.classList.toggle('ui-on', t > 4.2);
  if (t > 5) { intro.done = true; A.value = 1; gridMat.uniforms.uA.value = 1; pmat.uniforms.uA.value = 1; beamMat.uniforms.uA.value = 1; for (const ms of Object.values(edgeBy)) for (const m of ms) m.opacity = EDGE; if (!intro.opened) Etarget = .75; document.body.classList.add('ui-on'); }
}


// =====================================================================
// NÚCLEO DE LUZ, PAINÉIS DE VIDRO E CONECTORES (como na referência)
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.08, 'rgba(230,250,255,.95)'); r.addColorStop(.25, 'rgba(120,215,255,.35)'); r.addColorStop(.6, 'rgba(60,170,255,.08)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true }));
core.scale.setScalar(70); core.renderOrder = 20; sMain.add(core);
const coreHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, opacity: .35 }));
coreHalo.scale.setScalar(260); coreHalo.renderOrder = 19; sMain.add(coreHalo);

// painéis: vidro fino com bordas, colchetes e traços animados (decorativos, sem texto)
const hud = new THREE.Group(); sMain.add(hud);
function panel(w, h, draw, pos, yaw, anchor) {
  const c = document.createElement('canvas'); c.width = Math.round(w * 4); c.height = Math.round(h * 4); const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  m.position.copy(pos); m.rotation.y = yaw; m.userData = { g, c, tex, draw, w, h, base: pos.clone(), ph: Math.random() * 6, anchor }; hud.add(m); return m;
}
function frame(g, W, H, t) {
  g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(90,200,255,.05)'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(170,235,255,.55)'; g.lineWidth = 2; g.strokeRect(6, 6, W - 12, H - 12);
  g.strokeStyle = 'rgba(210,248,255,.95)'; g.lineWidth = 4; const k = 34;
  for (const [x, y, sx, sy] of [[6, 6, 1, 1], [W - 6, 6, -1, 1], [6, H - 6, 1, -1], [W - 6, H - 6, -1, -1]]) { g.beginPath(); g.moveTo(x, y + sy * k); g.lineTo(x, y); g.lineTo(x + sx * k, y); g.stroke(); }
  g.fillStyle = 'rgba(170,235,255,.55)'; for (let i = 0; i < 6; i++) g.fillRect(22 + i * 14, 22, 8, 4);
}
const P = [
  panel(110, 140, (g, W, H, t) => { frame(g, W, H, t); g.strokeStyle = 'rgba(200,245,255,.9)'; g.lineWidth = 3; g.beginPath(); for (let x = 30; x < W - 30; x += 4) { const y = H * .55 + Math.sin(x * .05 + t * 3) * 34 * Math.sin(x * .011 + t * .7) + Math.sin(x * .19 + t * 7) * 6; x === 30 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); g.fillStyle = 'rgba(170,235,255,.35)'; for (let i = 0; i < 9; i++) g.fillRect(30, H - 70 + i * 6, (W - 60) * (.3 + .7 * Math.abs(Math.sin(i * 1.7 + t * .8))), 2); }, V3(-190, 46, -110), .42, 'lente'),
  panel(150, 104, (g, W, H, t) => { frame(g, W, H, t); const cx = W * .3, cy = H * .54, R = H * .3; g.strokeStyle = 'rgba(170,235,255,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke(); g.strokeStyle = 'rgba(220,250,255,.95)'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, R, -1.57, -1.57 + (Math.sin(t * .6) * .5 + .5) * 6.2); g.stroke(); for (let i = 0; i < 48; i++) { const a = i / 48 * 6.283, l = i % 4 ? 8 : 16; g.strokeStyle = 'rgba(170,235,255,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * (R + 12), cy + Math.sin(a) * (R + 12)); g.lineTo(cx + Math.cos(a) * (R + 12 + l), cy + Math.sin(a) * (R + 12 + l)); g.stroke(); } for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(170,235,255,${.25 + .5 * (Math.sin(t * 2 + i) * .5 + .5)})`; g.fillRect(W * .58, 40 + i * ((H - 80) / 14), (W * .34) * (.2 + .8 * Math.abs(Math.sin(i * 2.3 + t * .5))), 5); } }, V3(195, 36, -100), -.45, 'sensor'),
  panel(130, 82, (g, W, H, t) => { frame(g, W, H, t); g.strokeStyle = 'rgba(255,190,110,.85)'; g.lineWidth = 3; g.beginPath(); for (let x = 24; x < W - 24; x += 3) { const n = Math.sin(x * .3 + t * 9) * Math.exp(-(((x - W / 2) / 120) ** 2)) * 50 + Math.sin(x * .07 - t * 2) * 8; const y = H / 2 + n; x === 24 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); g.strokeStyle = 'rgba(170,235,255,.3)'; g.lineWidth = 2; g.beginPath(); g.moveTo(24, H / 2); g.lineTo(W - 24, H / 2); g.stroke(); }, V3(-170, -88, -20), .34, 'bateria'),
  panel(96, 96, (g, W, H, t) => { frame(g, W, H, t); const cx = W / 2, cy = H / 2; for (let k = 0; k < 3; k++) { g.strokeStyle = `rgba(170,235,255,${.7 - k * .2})`; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * 6.283 + t * (k % 2 ? -.4 : .4); const r = 50 + k * 30; i ? g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.stroke(); } g.fillStyle = 'rgba(230,252,255,.9)'; g.beginPath(); g.arc(cx, cy, 10 + Math.sin(t * 3) * 3, 0, 7); g.fill(); }, V3(172, -92, -10), -.34, 'placa'),
];
// conectores com nós: da peça ao canto do painel
const conMat = new LineMaterial({ color: 0xbfefff, linewidth: 1.2 * DPR, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
const nodeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.strokeStyle = 'rgba(210,248,255,1)'; g.lineWidth = 6; g.beginPath(); g.arc(32, 32, 20, 0, 7); g.stroke(); g.fillStyle = 'rgba(210,248,255,1)'; g.beginPath(); g.arc(32, 32, 8, 0, 7); g.fill(); const t = new THREE.CanvasTexture(c); return t; })();
const cons = P.map(() => { const l = new Line2(new LineGeometry(), conMat); l.renderOrder = 18; sMain.add(l); const a = new THREE.Sprite(new THREE.SpriteMaterial({ map: nodeTex, blending: THREE.AdditiveBlending, depthTest: false, transparent: true, opacity: .8 })); const b = a.clone(); a.material = a.material.clone(); b.material = a.material; for (const s of [a, b]) { s.scale.setScalar(7); s.renderOrder = 21; sMain.add(s); } return { l, a, b }; });
let hudFrame = 0;
function hudStep(dt, t) {
  const show = intro.done ? 1 : ease((intro.t - 3.4) / 1.2);
  const portrait = cam.aspect < .9; const sc = portrait ? .5 : .78; hud.scale.set(sc, sc, sc); hud.position.y = portrait ? 30 : 0;
  P.forEach((m, i) => { const u = m.userData; m.position.copy(u.base); m.position.y += Math.sin(t * .6 + u.ph) * 3; m.material.opacity = show * .95;
    if ((hudFrame + i) % 2 === 0) { u.draw(u.g, u.c.width, u.c.height, t + u.ph); u.tex.needsUpdate = true; } });
  hudFrame++;
  sMain.updateMatrixWorld();
  P.forEach((m, i) => {
    const u = m.userData, c = BY[u.anchor]; const from = c.obj.getWorldPosition(V3(0, 0, 0));
    const corner = V3(u.w / 2 * (m.position.x < 0 ? 1 : -1), -u.h / 2 + 6, 0); m.localToWorld(corner);
    const mid = from.clone().lerp(corner, .5); mid.y = Math.max(from.y, corner.y) + 6;
    const k = cons[i]; k.l.geometry.dispose(); k.l.geometry = new LineGeometry(); k.l.geometry.setPositions([from.x, from.y, from.z, mid.x, mid.y, mid.z, corner.x, corner.y, corner.z]);
    k.a.position.copy(from); k.b.position.copy(corner); conMat.opacity = .5 * show; k.a.material.opacity = .85 * show;
  });
  const cp = cmos.getWorldPosition(V3(0, 0, 0)); const pulse = .85 + .15 * Math.sin(t * 2.3) + .05 * Math.sin(t * 13);
  core.position.copy(cp); coreHalo.position.copy(cp); core.scale.setScalar(64 * pulse * holo.scale.x); coreHalo.scale.setScalar(240 * pulse * holo.scale.x);
  core.material.opacity = A.value; coreHalo.material.opacity = .32 * A.value;
}
// toque: um anel de luz se abre onde o dedo encosta
const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.strokeStyle = 'rgba(220,250,255,1)'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.stroke(); return new THREE.CanvasTexture(c); })();
const ripples = [];
function ripple(point) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, blending: THREE.AdditiveBlending, depthTest: false, transparent: true })); s.position.copy(point); s.renderOrder = 22; sMain.add(s); ripples.push({ s, t: 0 }); }
function rippleStep(dt) { for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i]; r.t += dt / .7; r.s.scale.setScalar(6 + 44 * ease(r.t)); r.s.material.opacity = 1 - r.t; if (r.t >= 1) { sMain.remove(r.s); r.s.material.dispose(); ripples.splice(i, 1); } } }
// a vista acompanha o ponteiro de leve (paralaxe)
const look = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', (e) => { look.tx = (e.clientX / innerWidth - .5) * 2; look.ty = (e.clientY / innerHeight - .5) * 2; });
// =====================================================================
// RENDER: bloom para o brilho do holograma
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(sMain, cam));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .5, .7, .08); composer.addPass(bloom);
composer.addPass(new OutputPass());
function resize() {
  const r = view.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); composer.setSize(r.width, r.height); composer.setPixelRatio(DPR);
  bloom.resolution.set(Math.max(512, r.width * DPR / 2), Math.max(512, r.height * DPR / 2)); bloom.strength = r.width < 640 ? .32 : .5; core.scale.setScalar(1);
  cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix(); RES.set(r.width * DPR, r.height * DPR); for (const m of allEdgeMats) m.resolution.copy(RES);
  camDist = cam.aspect < .8 ? 760 : cam.aspect < 1.2 ? 600 : 470;
}
let camDist = 470;
new ResizeObserver(resize).observe(view.parentElement);
const qYaw = new THREE.Quaternion(), qPitch = new THREE.Quaternion(), UP = V3(0, 1, 0), RIGHT = V3(1, 0, 0);
let last = 0;
function loop(now) {
  const dt = (window.__TS || 1) * (last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60); last = now;
  introStep(dt); idle += dt;
  if (!pointers.size) { rot.yaw += rot.vy * dt; rot.pitch = clamp(rot.pitch + rot.vp * dt, -1.1, 1.1); rot.vy *= Math.exp(-dt * 1.1); rot.vp *= Math.exp(-dt * 2.5); if (intro.done && idle > 6 && Math.abs(rot.vy) < .05) rot.yaw += dt * .12; }
  if (resetView) { resetView.t += dt / 1; const k = ease(resetView.t); rot.yaw = lerp(resetView.yaw, -.5 + Math.round((resetView.yaw + .5) / (Math.PI * 2)) * Math.PI * 2, k); rot.pitch = lerp(resetView.pitch, .18, k); view3.scale = lerp(resetView.s, 1, k); view3.pan.lerpVectors(resetView.pan, V3(0, 0, 0), k); if (resetView.t >= 1) resetView = null; }
  E += (Etarget - E) * (1 - Math.exp(-dt * 3.2)); if (Math.abs(Etarget - E) < 1e-4) E = Etarget;
  applyPose(dt);
  qYaw.setFromAxisAngle(UP, rot.yaw); qPitch.setFromAxisAngle(RIGHT, rot.pitch); holo.quaternion.copy(qPitch).multiply(qYaw);
  view3.s += (view3.scale - view3.s) * (1 - Math.exp(-dt * 10)); holo.scale.setScalar(view3.s); holo.position.copy(view3.pan); holo.position.y += Math.sin(now / 1600) * 3;
  T.value += dt; gridMat.uniforms.uT.value += dt; pmat.uniforms.uT.value += dt; beamMat.uniforms.uT.value += dt; pad.rotation.y += dt * .06;
  for (const c of COMP) { const m = holoMats[c.id]; if (!m) continue; const target = c.grab ? 1 : c.id === hover ? .5 : 0; m.uniforms.uHi.value += (target - m.uniforms.uHi.value) * (1 - Math.exp(-dt * 12)); const el = edgeBy[c.id]; if (el && intro.done) for (const em of el) { em.opacity = EDGE + .3 * m.uniforms.uHi.value; em.color.setRGB(.44 + .5 * m.uniforms.uHi.value, .89 + .1 * m.uniforms.uHi.value, 1); } }
  look.x += (look.tx - look.x) * (1 - Math.exp(-dt * 2)); look.y += (look.ty - look.y) * (1 - Math.exp(-dt * 2));
  cam.position.set(look.x * 28, 60 - look.y * 18, camDist); cam.lookAt(0, -10, 0);
  hudStep(dt, T.value); rippleStep(dt);
  composer.render(dt);
  requestAnimationFrame(loop);
}
resize(); requestAnimationFrame(loop);
window.HOLO = { screenOf(id) { const v = BY[id].obj.getWorldPosition(new THREE.Vector3()).project(cam); const r = view.getBoundingClientRect(); return [r.left + (v.x * .5 + .5) * r.width, r.top + (-v.y * .5 + .5) * r.height]; }, BY, toggleOpen, get E() { return E; }, rot, view3, sendHome, skipIntro, intro };
window.READY = true;
