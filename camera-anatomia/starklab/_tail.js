
// =====================================================================
// LABORATÓRIO: luzes, grade holográfica, partículas, plataforma
const CYAN = new THREE.Color(0x35d8ff), CYAN_HI = new THREE.Color(0x9ff0ff);
sMain.add(new THREE.HemisphereLight(0x5fa8ff, 0x020409, .5));
const key = new THREE.DirectionalLight(0xe6f6ff, 1.6); key.position.set(-260, 420, 380); sMain.add(key);
const rimA = new THREE.PointLight(0x2fc8ff, 1.2, 0, 0); rimA.position.set(260, 120, -260); sMain.add(rimA);
const rimB = new THREE.PointLight(0x2f6bff, .9, 0, 0); rimB.position.set(-300, -40, -200); sMain.add(rimB);
const under = new THREE.PointLight(0x3ae0ff, .7, 0, 0); under.position.set(0, -140, 60); sMain.add(under);
for (const m of allEdgeMats) { m.color.set(0x8fe9ff); m.userData.base = Math.min(.75, m.userData.base * 1.15); m.opacity = m.userData.base; }

const FLOOR_Y = -120;
const gridMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uT: { value: 0 }, uA: { value: 0 }, uScan: { value: -1 } },
  vertexShader: `varying vec2 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uT; uniform float uA; uniform float uScan; varying vec2 vP;
    float line(float v, float s, float w){ float d = abs(fract(v / s - .5) - .5) * s; return 1. - smoothstep(0., w, d); }
    void main(){ float r = length(vP);
      float g = max(line(vP.x, 20., .6), line(vP.y, 20., .6)) * .35 + max(line(vP.x, 100., .9), line(vP.y, 100., .9)) * .6;
      float rings = line(r, 60., .7) * .5;
      float pulse = exp(-pow((r - mod(uT * 90., 900.)) / 18., 2.)) * .8;
      float scan = uScan > -1. ? exp(-pow((vP.y - uScan) / 10., 2.)) * 1.4 : 0.;
      float fade = 1. - smoothstep(180., 820., r);
      vec3 c = vec3(.18, .78, 1.) * (g + rings + pulse * .5) + vec3(.6, .95, 1.) * scan;
      gl_FragColor = vec4(c * fade * uA, 1.); }`,
});
const grid = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), gridMat); grid.rotation.x = -Math.PI / 2; grid.position.y = FLOOR_Y; sMain.add(grid);
// plataforma: anéis com marcas, girando devagar
const pad = new THREE.Group(); pad.position.y = FLOOR_Y + .5; sMain.add(pad);
const padMat = new THREE.LineBasicMaterial({ color: 0x40d8ff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
for (const [r, n] of [[150, 128], [158, 128], [190, 160]]) { const pts = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); } pad.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), padMat)); }
{ const pts = []; for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2, l = i % 10 === 0 ? 14 : 6; pts.push(new THREE.Vector3(Math.cos(a) * 158, 0, Math.sin(a) * 158), new THREE.Vector3(Math.cos(a) * (158 + l), 0, Math.sin(a) * (158 + l))); } pad.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), padMat)); }
const beam = new THREE.Mesh(new THREE.CylinderGeometry(150, 150, 120, 64, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 } },
  vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `uniform float uA; varying float vY; void main(){ gl_FragColor = vec4(vec3(.2,.8,1.) * pow(1. - vY, 3.) * .16 * uA, 1.); }` }));
beam.position.y = FLOOR_Y + 60; sMain.add(beam);
// partículas
const NPART = 700; const pr = rng(11); const ppos = new Float32Array(NPART * 3), pseed = new Float32Array(NPART);
for (let i = 0; i < NPART; i++) { ppos[i * 3] = (pr() - .5) * 1400; ppos[i * 3 + 1] = FLOOR_Y + pr() * 520; ppos[i * 3 + 2] = (pr() - .5) * 1400; pseed[i] = pr(); }
const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(ppos, 3)); pgeo.setAttribute('seed', new THREE.BufferAttribute(pseed, 1));
const pmat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uA: { value: 0 }, uPx: { value: DPR } },
  vertexShader: `attribute float seed; uniform float uT; uniform float uPx; varying float vA; void main(){ vec3 p = position; p.y += mod(uT * (4. + seed * 8.) + seed * 520., 520.) - 260. * 0.; p.y = ${FLOOR_Y.toFixed(1)} + mod(p.y - ${FLOOR_Y.toFixed(1)}, 520.); p.x += sin(uT * .2 + seed * 40.) * 8.; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = (1.2 + seed * 2.2) * uPx * (600. / -mv.z); vA = .25 + .75 * fract(seed * 7.3 + uT * .05); }`,
  fragmentShader: `uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(vec3(.35,.85,1.) * (1. - d * 2.) * vA * .7 * uA, 1.); }` });
sMain.add(new THREE.Points(pgeo, pmat));
// linha de varredura da abertura
const scanMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 } },
  vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `uniform float uA; varying vec2 vU; void main(){ float l = exp(-pow((vU.y - .5) / .04, 2.)); float e = 1. - smoothstep(.35, .5, abs(vU.x - .5)); gl_FragColor = vec4(vec3(.4,.9,1.) * l * e * uA, 1.); }` });
const scan = new THREE.Mesh(new THREE.PlaneGeometry(700, 40), scanMat); scan.rotation.x = -Math.PI / 2; sMain.add(scan);

// =====================================================================
// MODELO: reorganizar em componentes independentes
rig.position.y = -10;
diaphLight.visible = false; shutter.set(0, 0);
const Q = (o) => o;
// elementos ópticos: um grupo próprio dentro da lente
const optics = new THREE.Group(); lens.add(optics);
const glassMeshes = []; for (const g of [lensRear, lensFocus, lensFront]) g.traverse(o => { if (o.isMesh && o.material === mGlass) glassMeshes.push(o); });
glassMeshes.sort((a, b) => a.getWorldPosition(new THREE.Vector3()).z - b.getWorldPosition(new THREE.Vector3()).z);
for (const g of glassMeshes) optics.attach(g);
// cartão de memória: sai da placa
const cardG = new THREE.Group(); rig.add(cardG); cardG.position.copy(board.position);
{ const kids = board.children.filter(c => c === board.userData.card || (c.isMesh && c.geometry && c.geometry.type === 'PlaneGeometry' && c.position.x < -30)); for (const c of kids) cardG.add(c); }
// sensor: plataforma IBIS (placa + ímãs) carrega o CMOS; o filtro Bayer fica sobre o die
const cmos = new THREE.Group(); sensor.add(cmos);
{ const kids = sensor.children.slice(5, 32); for (const c of kids) cmos.attach(c); }
const bayerTex = (() => { const c = document.createElement('canvas'); c.width = 576; c.height = 384; const g = c.getContext('2d'); const s = 12; const col = { R: '#ff4d4d', G: '#3df08a', B: '#3d8bff' };
  for (let y = 0; y < 32; y++) for (let x = 0; x < 48; x++) { const k = y % 2 ? (x % 2 ? 'B' : 'G') : (x % 2 ? 'G' : 'R'); g.fillStyle = col[k]; g.fillRect(x * s + 1, y * s + 1, s - 2, s - 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
const bayerG = new THREE.Group(); cmos.add(bayerG);
const bayerMesh = mesh(new THREE.PlaneGeometry(36, 24), new THREE.MeshBasicMaterial({ map: bayerTex, transparent: true, opacity: .55, depthWrite: false }), { thr: 10, op: .6 });
bayerMesh.position.set(0, 0, 2.35); bayerG.add(bayerMesh);

// catálogo: o que é cada peça, de onde sai e para onde vai na vista explodida
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const COMP = [
  { id: 'corpo', obj: body, name: 'Corpo da câmera', off: V3(0, 0, 0), sim: null, kind: 'genérico',
    fn: 'Chassi que mantém baioneta, obturador e sensor alinhados em centésimos de milímetro e protege a eletrônica.', mat: 'Liga de magnésio (comum em corpos profissionais) · empunhadura de borracha', loc: 'Estrutura externa; todos os módulos se prendem a ele.', how: 'A baioneta fixa a lente a uma distância exata do sensor (registro).', rel: 'Recebe lente, obturador, plataforma IBIS, placa, visor e bateria.' },
  { id: 'tampa', obj: backCover, name: 'Tampa traseira e LCD', off: V3(0, 0, -235), sim: null, kind: 'genérico',
    fn: 'Fecha a traseira e carrega a tela LCD, a ocular e os botões.', mat: 'Liga de magnésio · vidro da tela', loc: 'Traseira do corpo.', how: 'Liga-se à placa principal por cabos flex.', rel: 'Cobre placa, dissipador e plataforma do sensor.' },
  { id: 'lente', obj: lens, name: 'Lente 50 mm f/1.8', off: V3(0, 0, 92), sim: 'lente', kind: 'genérico',
    fn: 'Forma a imagem: seus elementos fazem a luz de cada ponto da cena convergir num ponto do sensor.', mat: 'Barril de alumínio e policarbonato · vidro óptico', loc: 'Frente da câmera, presa pela baioneta.', how: 'Distância focal de 50 mm: para objetos no infinito, o plano de imagem fica a 50 mm do ponto nodal traseiro.', rel: 'Contém anel de foco, diafragma e elementos ópticos; projeta a imagem no sensor.' },
  { id: 'opticos', obj: optics, name: 'Elementos ópticos', off: V3(0, 0, 0), spread: true, sim: 'lente', kind: 'genérico',
    fn: 'Lentes de vidro convergentes e divergentes que formam a imagem e corrigem aberrações.', mat: 'Vidro óptico com revestimento antirreflexo', loc: 'Dentro do barril da lente, ao longo do eixo óptico.', how: 'Cada superfície curva desvia a luz (refração); a combinação corrige cor e distorção.', rel: 'O diafragma fica entre os grupos; o foco desloca parte deles.' },
  { id: 'foco', obj: lensFocus, name: 'Anel de foco', off: V3(0, 0, 40), sim: 'lente', kind: 'genérico',
    fn: 'Desloca o grupo óptico para deixar nítida a distância escolhida.', mat: 'Borracha serrilhada sobre anel de plástico', loc: 'Meio do barril da lente.', how: 'Avanço do grupo = f² ÷ (d − f): 6,25 mm para focar a 45 cm com 50 mm.', rel: 'Em lentes modernas, aciona um motor de foco comandado pela câmera.' },
  { id: 'diafragma', obj: diaph, name: 'Diafragma', off: V3(0, 0, 20), sim: 'diafragma', kind: 'genérico',
    fn: 'Abertura variável que controla a luz e a profundidade de campo.', mat: 'Lâminas de aço fino ou plástico preto', loc: 'Entre os grupos ópticos, no plano da pupila.', how: 'Número f = distância focal ÷ diâmetro da abertura; a luz cai com 1/N².', rel: 'Comandado por motor de passo a partir do processador.' },
  { id: 'cartao', obj: cardG, name: 'Cartão de memória', off: V3(-70, 0, -192), sim: 'processamento', kind: 'genérico',
    fn: 'Armazena os arquivos de imagem e vídeo.', mat: 'Memória flash NAND em invólucro plástico', loc: 'Slot ligado à placa principal.', how: 'Recebe os dados já comprimidos (JPEG, HEIF) ou brutos (RAW).', rel: 'Último destino do caminho sensor → processador → cartão.' },
  { id: 'visor', obj: evf, name: 'Visor eletrônico', off: V3(0, 70, 0), sim: null, kind: 'genérico',
    fn: 'Mostra a imagem ao vivo do sensor, com a exposição final.', mat: 'Tela micro-OLED · ocular de vidro', loc: 'Capô superior do corpo.', how: 'O processador envia a imagem ao micro-OLED; a ocular a amplia.', rel: 'Recebe vídeo da placa principal.' },
  { id: 'bateria', obj: battery, name: 'Bateria', off: V3(0, -100, 0), sim: null, kind: 'genérico',
    fn: 'Fornece energia a todo o sistema.', mat: 'Células de íon-lítio · invólucro plástico', loc: 'Dentro da empunhadura.', how: '7,2 V × 2,28 Ah = 16,4 Wh (valores típicos).', rel: 'Alimenta placa, sensor, IBIS, visor e motores.' },
  { id: 'obturador', obj: shutter.g, name: 'Obturador', off: V3(0, 0, -62), sim: 'obturador', kind: 'genérico',
    fn: 'Define por quanto tempo a luz atinge o sensor.', mat: 'Lâminas de alumínio ou fibra de carbono · motor e eletroímã', loc: 'Logo atrás da baioneta, na frente do sensor.', how: 'Duas cortinas: a primeira abre, a segunda fecha; em alta velocidade viajam juntas formando uma fenda.', rel: 'Disparado pelo processador; em muitas sem espelho a 1ª cortina é eletrônica (varia por modelo).' },
  { id: 'ibis', obj: sensor, name: 'Estabilização IBIS', off: V3(0, 0, -112), sim: 'ibis', kind: 'genérico',
    fn: 'Move o sensor para compensar o tremor da mão.', mat: 'Placa flutuante · ímãs e bobinas (atuadores de voz)', loc: 'Atrás do obturador; o sensor fica montado sobre ela.', how: 'Giroscópios medem o tremor e os atuadores deslocam o sensor no sentido oposto, em X, Y e rotação.', rel: 'Carrega o sensor CMOS; comandada pelo processador.' },
  { id: 'sensor', obj: cmos, name: 'Sensor CMOS', off: V3(0, 0, 20), sim: 'sensor', kind: 'verificado: princípio',
    fn: 'Converte a luz em carga elétrica, pixel por pixel, e a lê como números.', mat: 'Silício em encapsulamento cerâmico, com vidro de proteção', loc: 'Sobre a plataforma IBIS, no plano focal.', how: 'Full frame mede 36 × 24 mm; com 6000 × 4000 pixels, cada um tem 6 µm.', rel: 'Recebe a imagem da lente e envia os dados à placa principal.' },
  { id: 'bayer', obj: bayerG, name: 'Filtro de cores Bayer', off: V3(0, 0, 16), sim: 'sensor', kind: 'verificado: padrão',
    fn: 'Faz cada pixel registrar só uma cor; as outras duas são reconstruídas depois.', mat: 'Filtros de corante sobre o silício, sob microlentes', loc: 'Diretamente sobre os pixels do sensor.', how: 'Padrão RGGB: 50% verde, 25% vermelho, 25% azul.', rel: 'O processador faz o demosaico para recompor as cores.' },
  { id: 'placa', obj: board, name: 'Placa principal', off: V3(0, 0, -192), sim: 'processamento', kind: 'genérico',
    fn: 'Abriga o processador de imagem, a memória e a gestão de energia.', mat: 'Circuito impresso multicamada', loc: 'Atrás do sensor, sob a tampa traseira.', how: 'O processador faz demosaico, redução de ruído, tons e compressão.', rel: 'Liga sensor, cartão, visor, LCD e bateria.' },
  { id: 'dissipador', obj: heat, name: 'Dissipador térmico', off: V3(0, 0, -150), sim: null, kind: 'genérico',
    fn: 'Retira o calor do sensor e do processador; calor gera ruído na imagem.', mat: 'Alumínio · heat pipe de cobre', loc: 'Entre o sensor e a placa principal.', how: 'Conduz o calor às aletas e ao corpo, que o espalha.', rel: 'Encosta no sensor e no processador.' },
  { id: 'circuitos', obj: circ, name: 'Circuitos internos', off: V3(80, 0, -60), sim: 'processamento', kind: 'genérico',
    fn: 'Placa de entradas e saídas e cabos flex que interligam os módulos.', mat: 'Cobre sobre poliimida (flex) · conectores', loc: 'Lateral do corpo.', how: 'Levam dados e energia entre placa, sensor e conectores.', rel: 'Ponte entre a placa principal e o resto.' },
];
const BY = Object.fromEntries(COMP.map(c => [c.id, c]));
// espalhar os elementos ópticos numa fila à frente da lente
glassMeshes.forEach((g, i) => { g.userData.rest = g.position.clone(); g.userData.spread = V3(0, 0, (118 + i * 14) - g.position.z); });
// ids por malha: do geral para o específico
for (const c of COMP) c.obj.traverse(o => { o.userData.pid = c.id; });
for (const c of COMP) { c.rest = c.obj.position.clone(); c.user = V3(0, 0, 0); }
// materiais próprios por malha (destaque e raio-X)
const meshesOf = {};
sMain.updateMatrixWorld(true);
rig.traverse(o => {
  if (!o.isMesh || o.isLineSegments2 || !o.userData.pid) return;
  o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
  for (const m of [].concat(o.material)) if (m.clearcoat === 1 && m.transparent) { m.color.set(0x7fdcff); m.opacity = .13; m.envMapIntensity = .55; m.clearcoat = .4; }
  for (const m of [].concat(o.material)) { m.userData.op0 = m.opacity; m.userData.tr0 = m.transparent; m.userData.dw0 = m.depthWrite; if (m.emissive) { m.userData.e0 = m.emissive.clone(); m.userData.ei0 = m.emissiveIntensity; } }
  (meshesOf[o.userData.pid] ||= []).push(o);
});
const LENS_SPLIT = { rear: 0 };

// =====================================================================
// ESTADO: vista explodida, raio-X, seleção
let E = 0, Etarget = 0, Edist = 1, xray = false, bodyOp = 1, selected = null, hover = null;
function applyPose() {
  const e = E * Edist;
  for (const c of COMP) {
    if (c.spread) continue;
    c.obj.position.copy(c.rest).addScaledVector(c.off, e).add(c.user);
  }
  optics.position.copy(BY.opticos.rest).add(BY.opticos.user);
  for (const g of glassMeshes) g.position.copy(g.userData.rest).addScaledVector(g.userData.spread, e);
  lensFront.position.z = 62 * e + focusE;
  lensRear.position.z = 0;
}
// destaque holográfico
function paint() {
  for (const [pid, ms] of Object.entries(meshesOf)) {
    const sel = pid === selected, hov = pid === hover && !sel;
    const ghost = xray ? (pid === 'corpo' || pid === 'tampa' || pid === 'lente') ? .08 : .55 : (pid === 'corpo' || pid === 'tampa') ? bodyOp : 1;
    for (const o of ms) {
      for (const m of [].concat(o.material)) {
        const op = (m.userData.tr0 ? m.userData.op0 : 1) * ghost * intro.mat;
        const t = op < .999 || m.userData.tr0; m.transparent = t; m.opacity = op; m.depthWrite = !t ? true : m.userData.dw0 && op > .6;
        if (m.emissive) { if (sel) { m.emissive.copy(CYAN); m.emissiveIntensity = .35 + .2 * pulse; } else if (hov) { m.emissive.copy(CYAN); m.emissiveIntensity = .18; } else { m.emissive.copy(m.userData.e0); m.emissiveIntensity = m.userData.ei0; } }
      }
      const ln = o.edgeLine; if (ln) { const b = ln.material.userData.base; ln.material.opacity = (sel ? 1 : hov ? .9 : xray ? Math.max(b, .45) : b) * intro.edge; ln.material.color.copy(sel ? CYAN_HI : hov ? CYAN_HI : new THREE.Color(0x8fe9ff)); }
    }
  }
}
let pulse = 0;

// =====================================================================
// CONTROLES
const controls = new OrbitControls(cam, view);
controls.enableDamping = true; controls.dampingFactor = .07; controls.minDistance = 80; controls.maxDistance = 1400; controls.screenSpacePanning = true;
controls.target.set(0, 0, 10); cam.position.set(260, 150, 420);
const tc = new TransformControls(cam, view); tc.setSize(.85); tc.setSpace('local'); tc.enabled = false;
const tcHelper = tc.getHelper(); sMain.add(tcHelper); tcHelper.visible = false;
tc.addEventListener('dragging-changed', (e) => { controls.enabled = !e.value; });
tc.addEventListener('objectChange', () => { const c = BY[selected]; if (!c) return; const base = c.spread ? BY.opticos.rest.clone() : c.rest.clone().addScaledVector(c.off, E * Edist); c.user.copy(c.obj.position).sub(base); status(); });
let moveMode = false;
function attachGizmo() { const c = BY[selected]; if (moveMode && c) { tc.attach(c.obj); tc.enabled = true; tcHelper.visible = true; } else { tc.detach(); tc.enabled = false; tcHelper.visible = false; } }
let fly = null;
function flyTo(target, pos, dur = 1.2) { fly = { t0: performance.now(), dur: dur * 1000, a: { p: cam.position.clone(), t: controls.target.clone() }, b: { p: pos, t: target } }; }
function centerView() {
  const box = new THREE.Box3(); for (const c of COMP) box.expandByObject(c.obj); const ctr = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()).length();
  const dir = cam.position.clone().sub(controls.target).normalize(); const fit = sz * .62 / Math.tan(cam.fov * D2R / 2) / Math.min(1, cam.aspect * 1.1);
  flyTo(ctr, ctr.clone().addScaledVector(dir, clamp(fit, 160, 1200)));
}
function focusOn(id) { const c = BY[id]; const box = new THREE.Box3().expandByObject(c.obj); const ctr = box.getCenter(new THREE.Vector3()), sz = Math.max(40, box.getSize(new THREE.Vector3()).length());
  const dir = cam.position.clone().sub(controls.target).normalize(); flyTo(ctr, ctr.clone().addScaledVector(dir, sz * 1.7 / Math.min(1, cam.aspect * 1.1))); }

// seleção por raio
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
const pickables = []; rig.traverse(o => { if (o.isMesh && !o.isLineSegments2 && o.userData.pid) pickables.push(o); });
function pick(e) {
  const r = view.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, cam);
  const hits = ray.intersectObjects(pickables, false).filter(h => { const m = [].concat(h.object.material)[0]; return m.opacity > .2 || h.object.userData.pid !== 'corpo' && h.object.userData.pid !== 'tampa'; });
  return hits[0] ? hits[0].object.userData.pid : null;
}
let down = null;
view.addEventListener('pointerdown', (e) => { document.body.classList.add('touched'); down = { x: e.clientX, y: e.clientY, gizmo: tc.dragging || (tc.enabled && tc.axis) }; skipIntro(); stopTour(); });
view.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' || down) return; const id = pick(e); if (id !== hover) { hover = id; view.style.cursor = id ? 'pointer' : 'grab'; } });
view.addEventListener('pointerup', (e) => { if (!down || down.gizmo || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; } down = null; const id = pick(e); select(id); });
view.addEventListener('pointerleave', () => { hover = null; });

// =====================================================================
// SIMULAÇÕES
// foco
let focusS = 0, focusE = 0;
function setFocus(s) { focusS = s; const d = s < 1e-3 ? Infinity : 450 / s; focusE = d === Infinity ? 0 : 2500 / (d - 50); lensFocus.rotation.z = -s * 80 * D2R; return { d, e: focusE }; }
// abertura
const STOPS = [1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16];
let fIdx = 0, fAuto = false; function setStop(i) { fIdx = i; setAperture(R_MAX * 1.8 / STOPS[i] * .97); }
// obturador
const SPEEDS = [30, 60, 125, 250, 500, 1000, 2000, 4000, 8000];
let shot = null, speedIdx = 3, slowmo = 1;
const TAU = 3; // ms: trânsito das cortinas (ilustrativo; varia conforme o modelo)
function fire() { const T = 1000 / SPEEDS[speedIdx]; shot = { t: 0, T, dur: (T + 2 * TAU) }; }
function shutterStep(dt) {
  if (!shot) return; shot.t += dt;
  const show = 1.4 * slowmo; const ms = (shot.t - .3) / show * shot.dur;
  if (shot.t < .3) shutter.set(ease(shot.t / .3), 0);
  else { const a = 1 - clamp(ms / TAU), b = clamp((ms - shot.T) / TAU); shutter.set(a, b); }
  if (shot.t > .3 + show + .6) { shutter.set(0, 0); shot = null; }
}
// IBIS
let ibisOn = false, ibisComp = true, ibisT = 0; const ibisHist = [];
function ibisStep(dt) {
  if (!ibisOn) { rig.position.x = 0; rig.rotation.z = 0; return; }
  ibisT += dt; const sx = Math.sin(ibisT * 7.3) * 1.6 + Math.sin(ibisT * 13.1) * .7, sy = Math.cos(ibisT * 6.1) * 1.3 + Math.sin(ibisT * 17.7) * .5, sr = Math.sin(ibisT * 5.3) * .6 * D2R;
  rig.position.x = sx; rig.position.y = -10 + sy; rig.rotation.z = sr;
  const cx = ibisComp ? -sx : 0, cy = ibisComp ? -sy : 0, cr = ibisComp ? -sr : 0;
  BY.ibis.user.set(cx, cy, 0); sensor.rotation.z = cr;
  ibisHist.push([sx, cx]); if (ibisHist.length > 160) ibisHist.shift();
}
// raios de luz (lente → sensor)
const rayMat = new LineMaterial({ color: 0x9ff0ff, linewidth: 1.6 * DPR, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
const rays = Array.from({ length: 7 }, () => { const l = new Line2(new LineGeometry(), rayMat); l.visible = false; l.renderOrder = 10; sMain.add(l); return l; });
let raysOn = false;
function updateRays() {
  for (const l of rays) l.visible = raysOn;
  if (!raysOn) return;
  const g1 = glassMeshes[glassMeshes.length - 1], die = cmos.children.find(c => c.geometry && c.geometry.type === 'PlaneGeometry');
  const front = g1.getWorldPosition(new THREE.Vector3()), focus = (die || cmos).getWorldPosition(new THREE.Vector3());
  const axis = new THREE.Vector3(0, 0, 1).applyQuaternion(lens.getWorldQuaternion(new THREE.Quaternion()));
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(lens.getWorldQuaternion(new THREE.Quaternion()));
  const ap = 18 * 1.8 / STOPS[fIdx];
  rays.forEach((l, i) => {
    const h = (i - 3) / 3 * 18; const pass = Math.abs(h) <= ap + .01;
    const a = front.clone().addScaledVector(axis, 220).addScaledVector(up, h), b = front.clone().addScaledVector(up, h);
    const pts = pass ? [a, b, focus] : [a, b, b.clone().lerp(focus, .35)];
    l.geometry.dispose(); l.geometry = new LineGeometry(); l.geometry.setPositions(pts.flatMap(p => [p.x, p.y, p.z])); l.computeLineDistances();
  });
}
// processamento: pulsos sensor → processador → cartão
const pulseGeo = new THREE.SphereGeometry(1.6, 10, 8), pulseMat = new THREE.MeshBasicMaterial({ color: 0x8ff0ff, transparent: true, blending: THREE.AdditiveBlending, depthTest: false });
const pulses = new THREE.InstancedMesh(pulseGeo, pulseMat, 60); pulses.count = 0; pulses.renderOrder = 11; pulses.frustumCulled = false; sMain.add(pulses);
let procOn = false, procT = 0, procGlow = 0;
const PROC_STEPS = ['Leitura dos pixels', 'Conversão A/D', 'Demosaico (Bayer → RGB)', 'Redução de ruído', 'Tons e balanço de branco', 'Compressão → cartão'];
function procStep(dt) {
  if (!procOn) { pulses.count = 0; procGlow = 0; return; }
  procT += dt; const w = (o, x, y, z) => o.localToWorld(new THREE.Vector3(x, y, z));
  const path = new THREE.CatmullRomCurve3([w(cmos, 0, 0, 2), w(sensor, 0, 22, -4), w(board, -6, 24, -2), w(board, 6, 4, -3.4)]);
  const path2 = new THREE.CatmullRomCurve3([w(board, 6, 4, -3.4), w(board, -16, -6, -3), cardG.localToWorld(new THREE.Vector3(-36, -14, -4.6))]);
  const m = new THREE.Matrix4(); let n = 0;
  for (let i = 0; i < 36; i++) { const k = ((procT * .5 + i / 36) % 1); const p = (i % 3 ? path : path2).getPointAt(k); m.makeTranslation(p.x, p.y, p.z); pulses.setMatrixAt(n++, m); }
  pulses.count = n; pulses.instanceMatrix.needsUpdate = true; procGlow = .6 + .4 * Math.sin(procT * 8);
}
function mProcSet(v) { for (const o of meshesOf.placa || []) for (const m of [].concat(o.material)) if (m.emissive && m.userData.ei0 === 0 && m.color && m.color.getHex() === 0x141518) { m.emissive.setHex(0x22d0ff); m.emissiveIntensity = v; } }

// =====================================================================
// ABERTURA CINEMATOGRÁFICA
const intro = { t: REDUCED ? 99 : 0, mat: REDUCED ? 1 : 0, edge: REDUCED ? 1 : 0, done: REDUCED };
function skipIntro() { if (!intro.done) { intro.t = 99; } }
function introStep(dt) {
  if (intro.done) return;
  intro.t += dt; const t = intro.t;
  gridMat.uniforms.uA.value = ease(t / 1.2); pmat.uniforms.uA.value = ease((t - .6) / 1.5); beam.material.uniforms.uA.value = ease((t - 1.4) / 1.2);
  const sy = lerp(260, FLOOR_Y, ease((t - .9) / 1.8)); scan.position.y = sy; scanMat.uniforms.uA.value = t > .9 && t < 2.9 ? 1 : 0; gridMat.uniforms.uScan.value = t > 1.4 && t < 3.4 ? lerp(-500, 500, (t - 1.4) / 2) : -9999;
  intro.edge = ease((t - 1.5) / 1.2); intro.mat = ease((t - 2.4) / 1.3);
  rig.rotation.y = lerp(-70, 0, ease((t - 1.5) / 4.5)) * D2R; rig.scale.setScalar(lerp(.94, 1, ease((t - 1.5) / 2.5)));
  if (t > 4.6 && Etarget === 0 && !intro.exploded) { intro.exploded = true; Etarget = .65; }
  document.body.classList.toggle('ui-on', t > 5.4);
  if (t > 6.4) { intro.done = true; intro.mat = 1; intro.edge = 1; rig.rotation.y = 0; rig.scale.setScalar(1); scanMat.uniforms.uA.value = 0; gridMat.uniforms.uScan.value = -9999; gridMat.uniforms.uA.value = 1; pmat.uniforms.uA.value = 1; beam.material.uniforms.uA.value = 1; document.body.classList.add('ui-on'); if (!intro.exploded) Etarget = .65; }
}

// =====================================================================
// INTERFACE
const $ = (id) => document.getElementById(id);
function select(id) {
  selected = id; $('hudSel').textContent = id ? BY[id].name.toUpperCase() : '—';
  renderList(); renderInspector(); attachGizmo();
  if (id && BY[id].sim) openSim(BY[id].sim, false);
  if (id && matchMedia('(max-width: 860px)').matches) $('inspector').classList.add('open');
}
function renderList() {
  $('complist').innerHTML = COMP.map((c, i) => `<li><button type="button" data-id="${c.id}"${c.id === selected ? ' aria-current="true"' : ''}><span class="n">${String(i + 1).padStart(2, '0')}</span><span>${c.name}</span>${c.sim ? '<span class="sim" title="Tem simulação">SIM</span>' : ''}</button></li>`).join('');
}
$('complist').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; stopTour(); skipIntro(); select(b.dataset.id); focusOn(b.dataset.id); });
$('complist').addEventListener('pointerover', (e) => { const b = e.target.closest('button'); hover = b ? b.dataset.id : null; });
$('complist').addEventListener('pointerleave', () => { hover = null; });
function renderInspector() {
  const c = BY[selected];
  if (!c) { $('insp').innerHTML = `<p class="eyebrow">COMPONENT INSPECTOR</p><h2>Nenhuma peça selecionada</h2><p class="muted">Toque numa peça da câmera ou escolha na lista. Arraste o fundo para girar, use a pinça ou a roda para aproximar e dois dedos ou o botão direito para mover a vista.</p>`; return; }
  $('insp').innerHTML = `<p class="eyebrow">COMPONENT INSPECTOR · <span class="${c.kind.startsWith('verificado') ? 'ok' : 'gen'}">${c.kind.toUpperCase()}</span></p><h2>${c.name}</h2>
  <dl><div><dt>Função</dt><dd>${c.fn}</dd></div><div><dt>Material</dt><dd>${c.mat}</dd></div><div><dt>Localização</dt><dd>${c.loc}</dd></div><div><dt>Funcionamento</dt><dd>${c.how}</dd></div><div><dt>Relação com outras peças</dt><dd>${c.rel}</dd></div></dl>
  <div class="row"><button type="button" class="btn" data-a="focus">Focar peça</button><button type="button" class="btn" data-a="move" aria-pressed="${moveMode}">Mover nos 3 eixos</button>${c.user.lengthSq() > .01 ? '<button type="button" class="btn" data-a="reset">Voltar ao lugar</button>' : ''}${c.sim ? `<button type="button" class="btn hi" data-a="sim">Simular</button>` : ''}</div>`;
}
$('insp').addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; const c = BY[selected]; if (!c) return;
  if (b.dataset.a === 'focus') focusOn(c.id);
  if (b.dataset.a === 'move') { moveMode = !moveMode; $('bMove').setAttribute('aria-pressed', moveMode); attachGizmo(); renderInspector(); }
  if (b.dataset.a === 'reset') { tween(c.user, V3(0, 0, 0)); }
  if (b.dataset.a === 'sim') openSim(c.sim, true); });
const tweens = []; function tween(v, to, dur = .7) { tweens.push({ v, from: v.clone(), to, t: 0, dur }); }
function tweenStep(dt) { for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; w.t += dt; w.v.lerpVectors(w.from, w.to, ease(w.t / w.dur)); if (w.t >= w.dur) { tweens.splice(i, 1); renderInspector(); } } }

// barra de ações
$('bExplore').addEventListener('click', () => { skipIntro(); tour.on ? stopTour() : startTour(); });
$('bExplode').addEventListener('click', () => { skipIntro(); Etarget = 1; $('dist').value = Math.round(Edist * 100); });
$('bAssemble').addEventListener('click', () => { skipIntro(); Etarget = 0; for (const c of COMP) if (c.user.lengthSq() > 0) tween(c.user, V3(0, 0, 0)); moveMode = false; $('bMove').setAttribute('aria-pressed', false); attachGizmo(); });
$('bXray').addEventListener('click', () => { xray = !xray; $('bXray').setAttribute('aria-pressed', xray); });
$('bCenter').addEventListener('click', () => { skipIntro(); centerView(); });
$('bMove').addEventListener('click', () => { moveMode = !moveMode; $('bMove').setAttribute('aria-pressed', moveMode); if (moveMode && !selected) select('lente'); attachGizmo(); renderInspector(); });
$('dist').addEventListener('input', (e) => { Edist = e.target.value / 100; if (Etarget === 0) Etarget = 1; $('distV').textContent = `${Math.round(Edist * 100)}%`; });
$('opac').addEventListener('input', (e) => { bodyOp = e.target.value / 100; $('opacV').textContent = `${e.target.value}%`; });
$('bSims').addEventListener('click', () => openSim(curSim || 'diafragma', true));
$('closeInsp').addEventListener('click', () => $('inspector').classList.remove('open'));

// tour (EXPLORAR)
const tour = { on: false, t: 0, i: 0 };
function startTour() { tour.on = true; tour.t = 0; tour.i = 0; controls.autoRotate = true; controls.autoRotateSpeed = .8; Etarget = .8; $('bExplore').setAttribute('aria-pressed', true); }
function stopTour() { if (!tour.on) return; tour.on = false; controls.autoRotate = false; $('bExplore').setAttribute('aria-pressed', false); }
function tourStep(dt) { if (!tour.on) return; tour.t += dt; if (tour.t > 3.2) { tour.t = 0; tour.i = (tour.i + 1) % COMP.length; select(COMP[tour.i].id); } }

// painel de simulações
let curSim = null;
const SIMS = {
  diafragma: { title: 'Diafragma', html: () => `<label class="ctl"><span>Abertura</span><output id="apV"></output></label><input id="ap" type="range" min="0" max="${STOPS.length - 1}" value="${fIdx}"><div class="row"><button type="button" class="btn" id="apAuto" aria-pressed="${fAuto}">Ciclo automático</button><button type="button" class="btn" id="apSee">Ver no modelo</button></div><canvas id="cv" width="560" height="200"></canvas><p class="muted">N = f ÷ D. A luz que entra cai com 1/N²: f/8 deixa passar ~1/20 da luz de f/1,8.</p>` },
  obturador: { title: 'Obturador', html: () => `<label class="ctl"><span>Velocidade</span><output id="spV"></output></label><input id="sp" type="range" min="0" max="${SPEEDS.length - 1}" value="${speedIdx}"><label class="ctl"><span>Câmera lenta</span><output id="slV"></output></label><input id="sl" type="range" min="50" max="400" value="${slowmo * 100}"><div class="row"><button type="button" class="btn hi" id="fire">Disparar</button><button type="button" class="btn" id="shSee">Ver no modelo</button></div><canvas id="cv" width="560" height="200"></canvas><p class="muted">Trânsito das cortinas ≈ 3 ms (ilustrativo; varia conforme o modelo). Abaixo dele, as cortinas correm juntas e só uma fenda expõe o sensor.</p>` },
  sensor: { title: 'Sensor e Bayer', html: () => `<p class="muted">Passe o dedo ou o mouse na matriz: é um feixe de luz. Cada pixel só vê a cor do seu filtro.</p><canvas id="cv" width="560" height="300" style="touch-action:none"></canvas><div class="row"><button type="button" class="btn hi" id="cap">Capturar imagem</button><button type="button" class="btn" id="bay" aria-pressed="${bayerG.visible}">Filtro Bayer no modelo</button></div>` },
  lente: { title: 'Lente e foco', html: () => `<label class="ctl"><span>Foco</span><output id="fcV"></output></label><input id="fc" type="range" min="0" max="1000" value="${Math.round(focusS * 1000)}"><div class="row"><button type="button" class="btn hi" id="rays" aria-pressed="${raysOn}">Caminho da luz</button><button type="button" class="btn" id="lnSee">Ver no modelo</button></div><canvas id="cv" width="560" height="200"></canvas><p class="muted">Distância focal de 50 mm: a lente forma a imagem do infinito 50 mm atrás do seu ponto nodal. Para focar mais perto, o grupo óptico avança f² ÷ (d − f).</p>` },
  ibis: { title: 'Estabilização IBIS', html: () => `<div class="row"><button type="button" class="btn hi" id="ibOn" aria-pressed="${ibisOn}">Simular tremor</button><button type="button" class="btn" id="ibComp" aria-pressed="${ibisComp}">Compensação ligada</button><button type="button" class="btn" id="ibSee">Ver no modelo</button></div><canvas id="cv" width="560" height="200"></canvas><p class="muted">Linha clara: tremor do corpo. Linha ciano: deslocamento do sensor. Com a compensação, as duas se anulam e a imagem fica parada.</p>` },
  processamento: { title: 'Processamento', html: () => `<div class="row"><button type="button" class="btn hi" id="prOn" aria-pressed="${procOn}">Processar foto</button><button type="button" class="btn" id="prSee">Ver no modelo</button></div><ol class="steps" id="prSteps">${PROC_STEPS.map(s => `<li>${s}</li>`).join('')}</ol><canvas id="cv" width="560" height="160"></canvas>` },
};
function openSim(id, show) {
  curSim = id; $('simTabs').innerHTML = Object.entries(SIMS).map(([k, s]) => `<button type="button" data-sim="${k}"${k === id ? ' aria-current="true"' : ''}>${s.title}</button>`).join('');
  $('simBody').innerHTML = SIMS[id].html(); bindSim(id);
  if (show) { $('sims').classList.add('open'); $('bSims').setAttribute('aria-pressed', true); }
}
$('simTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-sim]'); if (b) openSim(b.dataset.sim, true); });
$('closeSims').addEventListener('click', () => { $('sims').classList.remove('open'); $('bSims').setAttribute('aria-pressed', false); });
const see = (id, xr = true) => { select(id); focusOn(id); if (xr && !xray) { xray = true; $('bXray').setAttribute('aria-pressed', true); } };
let sensorLight = { x: .5, y: .5, on: 0 }, captured = null;
function bindSim(id) {
  const q = (s) => $('simBody').querySelector(s);
  if (id === 'diafragma') { const f = () => { setStop(+q('#ap').value); }; q('#ap').addEventListener('input', f); q('#apAuto').addEventListener('click', (e) => { fAuto = !fAuto; e.target.setAttribute('aria-pressed', fAuto); }); q('#apSee').addEventListener('click', () => { Etarget = Math.max(Etarget, .6); see('diafragma'); }); }
  if (id === 'obturador') { q('#sp').addEventListener('input', (e) => { speedIdx = +e.target.value; }); q('#sl').addEventListener('input', (e) => { slowmo = e.target.value / 100; }); q('#fire').addEventListener('click', fire); q('#shSee').addEventListener('click', () => { see('obturador'); }); }
  if (id === 'sensor') { const cv = q('#cv'); const mv = (e) => { const r = cv.getBoundingClientRect(); sensorLight = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, on: 1 }; }; cv.addEventListener('pointermove', mv); cv.addEventListener('pointerdown', mv); cv.addEventListener('pointerleave', () => { sensorLight.on = 0; }); q('#cap').addEventListener('click', () => { captured = { t: 0 }; }); q('#bay').addEventListener('click', (e) => { bayerG.visible = !bayerG.visible; e.target.setAttribute('aria-pressed', bayerG.visible); }); }
  if (id === 'lente') { q('#fc').addEventListener('input', (e) => { setFocus(e.target.value / 1000); }); q('#rays').addEventListener('click', (e) => { raysOn = !raysOn; e.target.setAttribute('aria-pressed', raysOn); if (raysOn) { Etarget = 0; } }); q('#lnSee').addEventListener('click', () => { Etarget = 0; raysOn = true; q('#rays').setAttribute('aria-pressed', true); see('lente'); }); }
  if (id === 'ibis') { q('#ibOn').addEventListener('click', (e) => { ibisOn = !ibisOn; e.target.setAttribute('aria-pressed', ibisOn); if (!ibisOn) { BY.ibis.user.set(0, 0, 0); sensor.rotation.z = 0; rig.position.set(0, -10, 0); rig.rotation.z = 0; } }); q('#ibComp').addEventListener('click', (e) => { ibisComp = !ibisComp; e.target.setAttribute('aria-pressed', ibisComp); }); q('#ibSee').addEventListener('click', () => { see('ibis'); }); }
  if (id === 'processamento') { q('#prOn').addEventListener('click', (e) => { procOn = !procOn; procT = 0; e.target.setAttribute('aria-pressed', procOn); }); q('#prSee').addEventListener('click', () => { Etarget = Math.max(Etarget, .7); see('placa', false); }); }
}
// desenho dos gráficos das simulações (canvas 2D, ~30 fps)
const BAY = (x, y) => (y % 2 ? (x % 2 ? 'B' : 'G') : (x % 2 ? 'G' : 'R'));
const BC = { R: [255, 77, 77], G: [61, 240, 138], B: [61, 139, 255] };
const SCENE = (u, v) => { const sky = [40 + 180 * v, 60 + 90 * v, 120 - 40 * v]; const sun = Math.exp(-((u - .66) ** 2 + (v - .45) ** 2) / .006) * 255; const mtn = v > .55 + .12 * Math.sin(u * 9) ? 1 : 0; return mtn ? [50, 45, 70] : [Math.min(255, sky[0] + sun), Math.min(255, sky[1] + sun * .9), Math.min(255, sky[2] + sun * .6)]; };
function drawSim(dt) {
  const cv = $('simBody') && $('simBody').querySelector('#cv'); if (!cv || !$('sims').classList.contains('open')) return;
  const g = cv.getContext('2d'), W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
  g.font = '12px "JetBrains Mono", monospace';
  if (curSim === 'diafragma') {
    const N = STOPS[fIdx], r = 80 * 1.8 / N; $('apV') && ($('apV').textContent = `f/${String(N).replace('.', ',')} · ${Math.max(1, Math.round(100 * (1.8 / N) ** 2))}% da luz`);
    g.strokeStyle = 'rgba(120,230,255,.4)'; g.beginPath(); g.arc(110, 100, 84, 0, 7); g.stroke();
    g.fillStyle = 'rgba(160,240,255,.85)'; g.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 - Math.PI / 2; const R = r / Math.cos(Math.PI / 7); g[i ? 'lineTo' : 'moveTo'](110 + Math.cos(a) * R, 100 + Math.sin(a) * R); } g.closePath(); g.fill();
    STOPS.forEach((s, i) => { const x = 240 + i * 15.5, h = 150 * (1.8 / s) ** 2; g.fillStyle = i === fIdx ? '#35d8ff' : 'rgba(120,230,255,.25)'; g.fillRect(x, 170 - h, 10, h); });
    g.fillStyle = 'rgba(200,240,255,.7)'; g.fillText('luz relativa por número f', 240, 190);
  }
  if (curSim === 'obturador') {
    $('spV') && ($('spV').textContent = `1/${SPEEDS[speedIdx]} s`); $('slV') && ($('slV').textContent = `replay ×${slowmo.toFixed(1).replace('.', ',')}`);
    const T = 1000 / SPEEDS[speedIdx], tot = T + 2 * TAU, x0 = 40, x1 = W - 20, sx = (ms) => x0 + (x1 - x0) * ms / tot, y0 = 30, y1 = 170;
    g.strokeStyle = 'rgba(120,230,255,.25)'; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    g.strokeStyle = '#9ff0ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(sx(0), y0); g.lineTo(sx(TAU), y1); g.stroke();
    g.strokeStyle = '#35d8ff'; g.beginPath(); g.moveTo(sx(T), y0); g.lineTo(sx(T + TAU), y1); g.stroke(); g.lineWidth = 1;
    g.fillStyle = 'rgba(53,216,255,.12)'; g.beginPath(); g.moveTo(sx(0), y0); g.lineTo(sx(TAU), y1); g.lineTo(sx(T + TAU), y1); g.lineTo(sx(T), y0); g.fill();
    g.fillStyle = 'rgba(200,240,255,.75)'; g.fillText('topo do sensor', 2, y0 + 4); g.fillText('base', 2, y1); g.fillText('1ª cortina', sx(TAU / 2) + 6, y0 + 30); g.fillText('2ª cortina', sx(T + TAU / 2) + 6, y1 - 20);
    g.fillText(T < TAU ? `fenda de ${(24 * T / TAU).toFixed(1).replace('.', ',')} mm` : 'janela toda aberta', x0 + 8, 196);
    g.fillText(`${tot.toFixed(1).replace('.', ',')} ms`, x1 - 70, 196);
    if (shot && shot.t > .3) { const ms = (shot.t - .3) / (1.4 * slowmo) * shot.dur; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(sx(Math.min(ms, tot)), y0); g.lineTo(sx(Math.min(ms, tot)), y1); g.stroke(); }
  }
  if (curSim === 'sensor') {
    const NX = 28, NY = 15, cw = W / NX, ch = (H - 0) / NY; const L = sensorLight;
    for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
      const u = (x + .5) / NX, v = (y + .5) / NY, k = BAY(x, y), c = BC[k];
      const lit = L.on ? Math.exp(-((u - L.x) ** 2 * 3 + (v - L.y) ** 2) / .02) : 0;
      let col;
      if (captured && captured.t > .6) { const s = SCENE(u, v); const ch3 = k === 'R' ? 0 : k === 'G' ? 1 : 2; const mono = captured.t < 1.8; col = mono ? c.map((cc, i) => i === ch3 ? s[ch3] : s[ch3] * .1) : s; }
      else col = c.map(cc => cc * (.18 + .82 * lit));
      g.fillStyle = `rgb(${col.map(Math.round).join(',')})`; g.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2);
    }
    if (captured) { captured.t += dt; g.fillStyle = 'rgba(2,4,9,.7)'; g.fillRect(0, H - 22, W, 22); g.fillStyle = '#9ff0ff'; g.fillText(captured.t < .6 ? 'expondo…' : captured.t < 1.8 ? 'dados brutos: uma cor por pixel (mosaico Bayer)' : 'demosaico: cores reconstruídas a partir dos vizinhos', 8, H - 7); if (captured.t > 5) captured = null; }
  }
  if (curSim === 'lente') {
    const { d, e } = { d: focusS < 1e-3 ? Infinity : 450 / focusS, e: focusE }; $('fcV') && ($('fcV').textContent = `${d === Infinity ? '∞' : (d / 1000).toFixed(2).replace('.', ',') + ' m'} · avanço ${e.toFixed(2).replace('.', ',')} mm`);
    const ax = 100, lx = 300 + e * 6, sxp = 470; g.strokeStyle = 'rgba(120,230,255,.3)'; g.beginPath(); g.moveTo(10, ax); g.lineTo(W - 10, ax); g.stroke();
    g.strokeStyle = '#9ff0ff'; g.beginPath(); g.ellipse(lx, ax, 8, 60, 0, 0, 7); g.stroke(); g.fillStyle = 'rgba(160,240,255,.15)'; g.fill();
    g.strokeStyle = '#35d8ff'; g.beginPath(); g.moveTo(sxp, ax - 50); g.lineTo(sxp, ax + 50); g.stroke();
    const objX = d === Infinity ? -1 : Math.max(20, lx - 2200 / (d / 100));
    for (let i = -2; i <= 2; i++) { const h = i * 22; g.strokeStyle = 'rgba(200,245,255,.8)'; g.beginPath(); if (objX < 0) g.moveTo(10, ax + h); else g.moveTo(objX, ax); g.lineTo(lx, ax + h); g.lineTo(sxp, ax); g.stroke(); }
    g.fillStyle = 'rgba(200,240,255,.75)'; g.fillText('lente', lx - 18, 30); g.fillText('sensor', sxp - 20, 30); g.fillText(objX < 0 ? 'objeto no infinito: raios paralelos' : 'objeto próximo', 12, 190);
  }
  if (curSim === 'ibis') {
    const mid = 100; g.strokeStyle = 'rgba(120,230,255,.2)'; g.beginPath(); g.moveTo(0, mid); g.lineTo(W, mid); g.stroke();
    const n = ibisHist.length; const dx = W / 160;
    g.strokeStyle = 'rgba(230,245,255,.85)'; g.beginPath(); ibisHist.forEach(([s], i) => g[i ? 'lineTo' : 'moveTo'](i * dx, mid - s * 22)); g.stroke();
    g.strokeStyle = '#35d8ff'; g.beginPath(); ibisHist.forEach(([, c], i) => g[i ? 'lineTo' : 'moveTo'](i * dx, mid - c * 22)); g.stroke();
    g.fillStyle = 'rgba(200,240,255,.75)'; g.fillText(ibisOn ? (ibisComp ? 'tremor + compensação = imagem parada' : 'sem compensação: a imagem treme') : 'toque em "Simular tremor"', 10, 190);
    if (n === 0) g.fillText('tremor (claro) · sensor (ciano)', 10, 20);
  }
  if (curSim === 'processamento') {
    const k = procOn ? Math.min(PROC_STEPS.length - 1, Math.floor((procT % 7.2) / 1.2)) : -1;
    $('prSteps') && [...$('prSteps').children].forEach((li, i) => li.toggleAttribute('data-on', i <= k));
    for (let y = 0; y < 8; y++) for (let x = 0; x < 34; x++) { const u = x / 34, v = y / 8, s = SCENE(u, v * .9 + .05), kk = BAY(x, y), ci = kk === 'R' ? 0 : kk === 'G' ? 1 : 2;
      const col = k < 2 ? [s[ci] * .5, s[ci] * .5, s[ci] * .5] : k < 3 ? s.map((c, i) => i === ci ? c : 0) : s.map(c => c * (k >= 4 ? 1 : .8)); g.fillStyle = `rgb(${col.map(c => Math.round(c + (k === 2 ? (Math.random() - .5) * 40 : 0))).join(',')})`; g.fillRect(x * 16.4, y * 19, 15.4, 18); }
  }
}

// =====================================================================
// HUD e laço
let frames = 0, fpsT = 0;
function status() {
  const moved = COMP.filter(c => c.user.lengthSq() > .01 && !(c.id === 'ibis' && ibisOn)).length;
  $('hudModel').textContent = (E < .02 ? 'MONTADO' : `EXPLODIDO ${Math.round(E * Edist * 100)}%`) + (moved ? ` · ${moved} MOVIDA${moved > 1 ? 'S' : ''}` : '') + (xray ? ' · RAIO-X' : '');
}
function resize() {
  const r = view.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix();
  RES.set(r.width * DPR, r.height * DPR); for (const m of allEdgeMats) m.resolution.copy(RES); rayMat.resolution.copy(RES);
  if (cam.aspect < .8) { controls.maxDistance = 1800; }
}
new ResizeObserver(resize).observe(view.parentElement);
let last = 0;
function loop(now) {
  const dt = (window.__TS || 1) * (last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60); last = now;
  introStep(dt); tourStep(dt); tweenStep(dt);
  const wE = 2 * Math.PI / .9; E += (Etarget - E) * (1 - Math.exp(-dt * wE / 2)); if (Math.abs(Etarget - E) < 1e-4) E = Etarget;
  if (fAuto) setStop(Math.round((Math.sin(now / 1400) * .5 + .5) * (STOPS.length - 1)));
  shutterStep(dt); ibisStep(dt); procStep(dt);
  applyPose(); pulse = .5 + .5 * Math.sin(now / 300); paint(); if (procGlow) mProcSet(procGlow); updateRays();
  gridMat.uniforms.uT.value += dt; pmat.uniforms.uT.value += dt; pad.rotation.y += dt * .05;
  if (fly) { const k = ease((now - fly.t0) / fly.dur); cam.position.lerpVectors(fly.a.p, fly.b.p, k); controls.target.lerpVectors(fly.a.t, fly.b.t, k); if (k >= 1) fly = null; }
  controls.update(); renderer.render(sMain, cam);
  drawSim(dt);
  frames++; fpsT += (window.__TS ? dt / window.__TS : dt); if (fpsT > .5) { $('hudFps').textContent = Math.round(frames / fpsT); frames = 0; fpsT = 0; status(); }
  requestAnimationFrame(loop);
}
resize();
{ const aspect = cam.aspect; const k = aspect < .8 ? 1.9 : aspect < 1.2 ? 1.35 : 1; cam.position.set(260 * k, 150 * k, 420 * k); }
$('hudEngine').textContent = `${renderer.capabilities.isWebGL2 ? 'WEBGL 2' : 'WEBGL'} · THREE r${THREE.REVISION}`;
$('hudSys').textContent = 'ONLINE';
renderList(); renderInspector(); openSim('diafragma', false); setStop(0); setFocus(0);
$('skip').addEventListener('click', () => { skipIntro(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { select(null); moveMode = false; attachGizmo(); } if (e.key.toLowerCase() === 'x' && e.target === document.body) $('bXray').click(); });
requestAnimationFrame(loop);
window.STARK = { tc, get moveMode() { return moveMode; }, get shot() { return shot; }, select, BY, COMP, setStop, fire, setFocus, centerView, get E() { return E; }, set Etarget(v) { Etarget = v; }, openSim, intro, skipIntro };
window.READY = true;
