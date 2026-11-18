/* PAFIES 2027 — motor de composicao/motion (equivalente as comps do After Effects).
   Conceitos: camera 3D (perspectiva), easing (Graph Editor), parallax/DOF por profundidade,
   motion blur por subframes, particulas, luz volumetrica, mascaras e tipografia cinetica.
   Todas as animacoes sao funcoes puras do tempo -> render deterministico frame a frame. */
const W = 1080, H = 1920, FPS = 30;
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');
const acc = document.createElement('canvas'); acc.width = W; acc.height = H;
const actx = acc.getContext('2d');
const IMG = {};
const COL = { B: '#0B3196', BD: '#061A5C', BL: '#2F63E0', Y: '#FFD21F', YD: '#C99400', K: '#0A0A0A', W: '#FFFFFF' };
let CUES = null;

/* ---------------- util / easing (Graph Editor) ---------------- */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  inOutExpo: x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  outBack: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outElastic: x => { const c4 = 2 * Math.PI / 3; return x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * c4) + 1; },
};
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const env = (t, t0, k) => t >= t0 ? Math.exp(-(t - t0) * k) : 0;

/* ---------------- camera 3D ---------------- */
const FOC = 1100;
const cam = { x: 0, y: 0, z: -FOC, focus: 0 };
function proj(x, y, z) { const d = z - cam.z; const s = FOC / d; return { x: W / 2 + (x - cam.x) * s, y: H / 2 + (y - cam.y) * s, s, d }; }
const dof = z => Math.min(16, Math.abs(z - cam.focus) / 70);

function sprite(img, x, y, z, w, o = {}) {
  const p = proj(x, y, z); if (p.d <= 20) return;
  const sw = w * p.s, sh = sw * img.height / img.width;
  if (sw < 2) return;
  ctx.save();
  ctx.globalAlpha = o.a ?? 1;
  const b = o.blur ?? dof(z);
  if (b > 0.8) ctx.filter = `blur(${b.toFixed(1)}px)`;
  ctx.translate(p.x, p.y); ctx.rotate(o.rot || 0);
  if (o.sx) ctx.scale(o.sx, 1);
  ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
  ctx.restore();
}

/* ---------------- pre-render helpers ---------------- */
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
let SOFT, RAYS, HALF_B, HALF_Y, GRAIN = [], VIG;
function prebuild() {
  SOFT = mk(128, 128); { const g = SOFT.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); }
  RAYS = mk(1800, 1800); { const g = RAYS.getContext('2d'); g.translate(900, 900);
    for (let i = 0; i < 28; i++) { const a0 = i / 28 * Math.PI * 2, a1 = a0 + Math.PI / 28 * (0.6 + hash(i) * .8); g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a0) * 1300, Math.sin(a0) * 1300); g.lineTo(Math.cos(a1) * 1300, Math.sin(a1) * 1300); g.closePath(); g.fillStyle = '#FFE66A'; g.fill(); }
    g.globalCompositeOperation = 'destination-in'; const r = g.createRadialGradient(0, 0, 0, 0, 0, 900); r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(.25, 'rgba(0,0,0,.7)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(-900, -900, 1800, 1800); }
  const half = (col, fn) => { const c = mk(W, H), g = c.getContext('2d'); g.fillStyle = col; const s = 26;
    for (let y = 0; y < H + s; y += s) for (let x = 0; x < W + s; x += s) { const ox = (y / s) % 2 ? s / 2 : 0; const r = fn(x + ox, y) * s * .55; if (r > .4) { g.beginPath(); g.arc(x + ox, y, r, 0, 7); g.fill(); } } return c; };
  HALF_B = half('#000', (x, y) => { const d = Math.hypot((x - W / 2) / W, (y - H / 2) / H) * 1.5; return clamp(d - .25); });
  HALF_Y = half('#E8B800', (x, y) => clamp(1 - y / H * 1.1));
  for (let k = 0; k < 4; k++) { const c = mk(540, 960), g = c.getContext('2d'); const id = g.createImageData(540, 960);
    for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (hash(i * .013 + k * 7.7) - .5) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    g.putImageData(id, 0, 0); GRAIN.push(c); }
  VIG = mk(W, H); { const g = VIG.getContext('2d'); const r = g.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .75); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = r; g.fillRect(0, 0, W, H); }
}

/* ---------------- primitives ---------------- */
function bg(c1, c2) { const r = ctx.createRadialGradient(W / 2, H * .45, 50, W / 2, H * .5, H * .8); r.addColorStop(0, c1); r.addColorStop(1, c2); ctx.fillStyle = r; ctx.fillRect(-200, -200, W + 400, H + 400); }
function rays(t, a, cx = W / 2, cy = H / 2, sc = 1.3, speed = .12) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.rotate(t * speed); ctx.scale(sc, sc); ctx.drawImage(RAYS, -900, -900); ctx.restore(); }
function glow(x, y, r, color, a) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore(); }
function halftone(img, a, comp = 'source-over') { ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = comp; ctx.drawImage(img, 0, 0); ctx.restore(); }

function bokeh(t, n, seed, color, a = .5) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const h1 = hash(i + seed), h2 = hash(i * 1.7 + seed + 3), h3 = hash(i * 2.3 + seed + 9);
    const z = lerp(-300, 2600, h3);
    const p = proj((h1 - .5) * 3200 + Math.sin(t * .6 + i) * 30, (((h2 * 4000 - t * (40 + h1 * 80)) % 4000) + 4000) % 4000 - 2000, z);
    const r = (6 + h1 * 16) * p.s * (1 + dof(z) * .25);
    ctx.globalAlpha = a * (0.35 + .65 * hash(i + 5)) * (z < 0 ? .45 : 1) * (0.7 + .3 * Math.sin(t * 2 + i));
    ctx.drawImage(color === 'w' ? SOFT : SOFTY(), p.x - r * 2, p.y - r * 2, r * 4, r * 4);
  }
  ctx.restore();
}
let _sy; function SOFTY() { if (!_sy) { _sy = mk(128, 128); const g = _sy.getContext('2d'); g.drawImage(SOFT, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = COL.Y; g.fillRect(0, 0, 128, 128); } return _sy; }

function sparks(t, t0, cx, cy, n, seed, power = 1) {
  const age = t - t0; if (age < 0 || age > 1.8) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = hash(i + seed) * Math.PI * 2, sp = lerp(700, 2600, hash(i * 3.1 + seed)) * power;
    const k = 3.2, life = lerp(.6, 1.8, hash(i * 7.7 + seed)); if (age > life) continue;
    const d = sp * (1 - Math.exp(-k * age)) / k, v = sp * Math.exp(-k * age);
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d + 260 * age * age;
    const tail = Math.max(6, v * .045);
    ctx.strokeStyle = hash(i + 2) > .3 ? COL.Y : '#FFFFFF';
    ctx.globalAlpha = (1 - age / life);
    ctx.lineWidth = 2 + hash(i + 4) * 6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a) * tail, y - Math.sin(a) * tail); ctx.stroke();
  }
  ctx.restore();
}
function shock(t, t0, cx, cy, col = COL.Y, R = 1000) {
  const p = prog(t, t0, t0 + .7); if (p <= 0 || p >= 1) return;
  ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha = 1 - p; ctx.lineWidth = 60 * (1 - p) + 2;
  ctx.beginPath(); ctx.arc(cx, cy, E.outExpo(p) * R, 0, 7); ctx.stroke(); ctx.restore();
}

/* ---------------- tipografia cinetica ---------------- */
function fitSize(str, maxW, maxS) { ctx.font = `100px Anton`; const w = ctx.measureText(str).width; return Math.min(maxS, 100 * maxW / w); }
/* desenha texto letra a letra, com extrusao 3D, contorno e animacao por letra */
function txt(str, x, y, size, o = {}) {
  const chars = [...str]; ctx.font = `${size}px Anton`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const sp = (o.track ?? 0.02) * size;
  const ws = chars.map(c => ctx.measureText(c).width); const total = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
  let cx = x - total / 2;
  const depth = o.depth ?? size * .07, dc = o.depthColor ?? COL.K;
  for (let i = 0; i < chars.length; i++) {
    const st = o.anim ? o.anim(i, chars.length) : {}; const a = st.a ?? 1;
    const ch = chars[i], w = ws[i];
    if (a > 0.01 && ch !== ' ') {
      ctx.save(); ctx.globalAlpha = a * (o.a ?? 1);
      ctx.translate(cx + w / 2 + (st.dx || 0), y + (st.dy || 0)); ctx.rotate(st.r || 0); const s = st.s ?? 1; ctx.scale(s * (st.sx ?? 1), s);
      if (st.blur > .8) ctx.filter = `blur(${st.blur.toFixed(1)}px)`;
      if (depth > 0) { ctx.fillStyle = dc; ctx.strokeStyle = dc; ctx.lineWidth = size * .09; ctx.lineJoin = 'round';
        const steps = Math.ceil(depth / 2); for (let k = steps; k >= 1; k--) { const dd = depth * k / steps; ctx.strokeText(ch, dd * .55, dd); ctx.fillText(ch, dd * .55, dd); } }
      if (o.stroke !== false) { ctx.lineWidth = size * (o.sw ?? .09); ctx.strokeStyle = o.strokeColor ?? COL.K; ctx.lineJoin = 'round'; ctx.strokeText(ch, 0, 0); }
      ctx.fillStyle = o.fill ?? COL.W; ctx.fillText(ch, 0, 0);
      if (o.shine) { ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.restore(); }
      ctx.restore();
    }
    cx += w + sp;
  }
  return total;
}
/* presets de animacao por letra */
const A = {
  slam: (t, t0, stag = .025, exitT = 99) => (i, n) => { const p = prog(t, t0 + i * stag, t0 + i * stag + .38); const q = prog(t, exitT, exitT + .3);
    return { s: lerp(2.8, 1, E.outExpo(p)) * (1 + E.inExpo(q) * .6), a: clamp(p * 5) * (1 - q), blur: (1 - E.outExpo(p)) * 10 + q * 12 }; },
  rise: (t, t0, stag = .035, exitT = 99, size = 120) => (i, n) => { const p = prog(t, t0 + i * stag, t0 + i * stag + .5); const q = prog(t, exitT + i * .015, exitT + i * .015 + .3);
    return { dy: lerp(size * 1.1, 0, E.outBack(p)) - E.inCubic(q) * size * 1.5, r: (1 - E.outCubic(p)) * .5 * (i % 2 ? 1 : -1), a: clamp(p * 3) * (1 - q), s: lerp(.4, 1, E.outBack(p)) }; },
  pop: (t, t0, stag = .04, exitT = 99) => (i, n) => { const p = prog(t, t0 + i * stag, t0 + i * stag + .45); const q = prog(t, exitT, exitT + .25);
    return { s: E.outElastic(p) * (1 - E.inCubic(q)), a: clamp(p * 6) * (1 - q), r: (1 - p) * .3 }; },
  slide: (t, t0, dir, exitT = 99, dist = 1400) => (i, n) => { const p = prog(t, t0, t0 + .42); const q = prog(t, exitT, exitT + .3);
    return { dx: (1 - E.outExpo(p)) * dist * dir - E.inExpo(q) * dist * dir, sx: 1 + (1 - E.outExpo(p)) * .6, a: clamp(p * 6) }; },
};

/* ---------------- camera shake (impactos) ---------------- */
function shakeAmt(t) { let s = 0; for (const ti of CUES.impact) s += env(t, ti, 9) * (CUES.impact_grande.includes(ti) ? 30 : 13); return s; }
function heartPulse(t) { let s = 0; CUES.heartbeat.forEach((ti, i) => s += env(t, ti, 7) * (i % 2 ? .6 : 1)); return s; }

/* ================= CENA 01 — ABERTURA (0-6s) ================= */
function scene1(t) {
  const hp = heartPulse(t);
  ctx.fillStyle = '#020309'; ctx.fillRect(-200, -200, W + 400, H + 400);
  glow(W / 2, H / 2, 900 + hp * 200, 'rgba(25,60,190,1)', .25 + hp * .35);
  ctx.save(); ctx.globalAlpha = .22 + hp * .2; ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'invert(1)'; ctx.drawImage(HALF_B, 0, 0); ctx.restore();
  ctx.fillStyle = 'rgba(2,3,9,.55)'; ctx.fillRect(-200, -200, W + 400, H + 400);
  bokeh(t, 26, 11, 'w', .25);
  // linha de ECG
  { const p = prog(t, .2, 5.8); ctx.save(); ctx.strokeStyle = COL.Y; ctx.lineWidth = 5; ctx.globalAlpha = .55 * (1 - prog(t, 3.3, 3.6) * .7); ctx.shadowColor = COL.Y; ctx.shadowBlur = 20; ctx.beginPath();
    for (let x = 0; x <= W; x += 6) { const tt = t - (W - x) / W * 1.2; let yv = 0; CUES.heartbeat.forEach((hb, i) => { const d = tt - hb; if (d > 0 && d < .18) yv += Math.sin(d / .18 * Math.PI * 2) * (i % 2 ? 70 : 140) * Math.exp(-d * 10); });
      const yy = H * .78 - yv; x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
    ctx.globalAlpha *= clamp(p * 8); ctx.stroke(); ctx.restore(); }
  // "EI, GALERA…"
  const recede = E.inOutCubic(prog(t, 3.25, 3.7));
  ctx.save(); ctx.translate(W / 2, H * .40 - recede * 260); ctx.scale(1 - recede * .35, 1 - recede * .35);
  if (recede > 0) ctx.filter = `blur(${(recede * 6).toFixed(1)}px)`;
  txt('EI, GALERA…', 0, 0, 175, { fill: COL.W, depth: 14, depthColor: COL.BD, anim: A.slam(t, 1.0, .03), a: 1 - recede * .5 });
  ctx.restore();
  // "ESTÃO PREPARADOS?"
  txt('ESTÃO', W / 2, H * .47, 190, { fill: COL.W, depth: 14, depthColor: COL.BD, anim: A.slam(t, 3.4, .03) });
  txt('PREPARADOS?', W / 2, H * .47 + 205, fitSize('PREPARADOS?', 960, 230), { fill: COL.Y, depth: 18, depthColor: '#5c4300', anim: A.slam(t, 3.5, .03) });
  // megafone halftone gritando
  const mp = prog(t, 3.45, 4.0); if (mp > 0) {
    const s = E.outBack(mp); ctx.save(); ctx.translate(W * .30 - (1 - s) * 300, H * .17 + Math.sin(t * 9) * 4); ctx.rotate(-.18 + Math.sin(t * 18) * .02 * (1 - prog(t, 4, 5)));
    ctx.scale(s * 1.0, s * 1.0); const m = IMG.megafone; ctx.drawImage(m, -230, -190, 460, 460 * m.height / m.width); ctx.restore(); }
  // transicao: iris azul (5.7 -> 6.05)
  const ir = E.inExpo(prog(t, 5.6, 6.0));
  if (ir > 0) { ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, ir * 1200, 0, 7); ctx.fillStyle = COL.B; ctx.fill(); ctx.lineWidth = 40; ctx.strokeStyle = COL.Y; ctx.stroke(); ctx.restore(); }
}

/* ================= CENA 02 — REVELACAO (6-14s) ================= */
function scene2(t) {
  const lt = t - 6;
  cam.z = -FOC + lt * 18; cam.focus = 0;
  bg('#2552d6', COL.BD);
  rays(t, .22 + env(t, 6, 2) * .5, W / 2, H * .36, 1.3);
  halftone(HALF_B, .28);
  bokeh(t, 40, 21, 'y', .45);
  // raios 3D em profundidade (parallax)
  const bIn = E.outExpo(prog(t, 6.05, 6.8));
  const fl = (k) => Math.sin(t * 1.6 + k) * 25;
  sprite(IMG.raioC, -620 + (1 - bIn) * -600, -820 + fl(1), 900, 520, { rot: -.3 + Math.sin(t) * .05 });
  sprite(IMG.raioA, 560 + (1 - bIn) * 700, -380 + fl(2), 300, 420, { rot: .25 + Math.sin(t * 1.3) * .06 });
  sprite(IMG.raioB, -520 + (1 - bIn) * -700, 160 + fl(3), 520, 520, { rot: -.15 });
  sprite(IMG.raioC, 600 + (1 - bIn) * 700, 650 + fl(4), 1200, 520, { rot: .4 });
  // logo voando da profundidade
  const lp = prog(t, 5.95, 6.6), up = E.inOutCubic(prog(t, 7.6, 8.1));
  const lz = lerp(5200, 0, E.outExpo(lp));
  const ly = lerp(-60, -470, up);
  glow(W / 2, H / 2 + ly * proj(0, 0, lz).s, 650, 'rgba(255,210,31,1)', .35 * E.outExpo(lp) + env(t, 6, 3) * .4);
  if (lp > 0) sprite(IMG.letters, 0, ly + Math.sin(t * 1.2) * 10, lz, lerp(980, 820, up), { rot: (1 - E.outBack(lp)) * -.35 + Math.sin(t * .9) * .015, blur: (1 - E.outExpo(lp)) * 14 });
  shock(t, 6.0, W / 2, H * .47); sparks(t, 6.0, W / 2, H * .47, 90, 1, 1.2);
  // textos
  const ex = 13.7;
  const s10 = fitSize('10ª EDIÇÃO', 900, 230);
  txt('10ª EDIÇÃO', W / 2, H * .55, s10, { fill: COL.Y, depth: 20, depthColor: '#5c4300', anim: A.slam(t, 8.0, .04, ex) });
  sparks(t, 8.0, W / 2, H * .55, 40, 7, .8);
  txt('GINCANA SOLIDÁRIA', W / 2, H * .67, fitSize('GINCANA SOLIDÁRIA', 900, 130), { fill: COL.W, depth: 10, depthColor: COL.BD, anim: A.rise(t, 10.0, .03, ex, 130) });
  // tarja PAFIES 2027
  const tp = E.outExpo(prog(t, 11.0, 11.4)) * (1 - E.inExpo(prog(t, ex, ex + .3)));
  if (tp > 0) { ctx.save(); ctx.translate(W / 2, H * .765); ctx.rotate(-.05); ctx.fillStyle = COL.K; ctx.fillRect(-460 * tp, -95, 920 * tp, 190); ctx.fillStyle = COL.Y; ctx.fillRect(-460 * tp, 80, 920 * tp, 14); ctx.restore();
    ctx.save(); ctx.translate(W / 2, H * .765); ctx.rotate(-.05); txt('PAFIES 2027', 0, 4, 150, { fill: COL.Y, depth: 0, stroke: false, anim: A.pop(t, 11.1, .035, ex) }); ctx.restore(); }
}

/* ================= CENA 03 — SOLIDARIEDADE (14-23s) ================= */
const FOODS = ['arroz', 'maca', 'lata', 'leite', 'pao', 'banana'];
function phoneScreen(t) {
  const c = phoneScreen.c || (phoneScreen.c = mk(412, 892)); const g = c.getContext('2d');
  const r = g.createLinearGradient(0, 0, 0, 892); r.addColorStop(0, COL.BL); r.addColorStop(1, COL.BD); g.fillStyle = r; g.fillRect(0, 0, 412, 892);
  g.save(); g.globalAlpha = .25; g.translate(206, 330); g.rotate(t * .3); g.drawImage(RAYS, -500, -500, 1000, 1000); g.restore();
  const hb = 1 + Math.sin(t * 7) * .03; g.save(); g.translate(206, 330); g.scale(hb, hb); g.drawImage(IMG.badge, -150, -150, 300, 300); g.restore();
  g.font = '64px Anton'; g.textAlign = 'center'; g.fillStyle = COL.Y; g.fillText('10ª EDIÇÃO', 206, 580);
  g.font = '40px Anton'; g.fillStyle = '#fff'; g.fillText('GINCANA SOLIDÁRIA', 206, 640);
  // botao
  const bp = .5 + .5 * Math.sin(t * 5); g.fillStyle = COL.Y; g.beginPath(); g.roundRect(66, 720, 280, 86, 43); g.fill();
  g.font = '42px Anton'; g.fillStyle = COL.K; g.fillText('PARTICIPE!', 206, 778);
  g.strokeStyle = `rgba(255,210,31,${.6 * (1 - bp)})`; g.lineWidth = 6; g.beginPath(); g.roundRect(66 - bp * 16, 720 - bp * 16, 280 + bp * 32, 86 + bp * 32, 60); g.stroke();
  return c;
}
function drawPhone(t, cx, cy, scale, ry) {
  const scr = phoneScreen(t);
  const pw = 460 * scale, ph = 940 * scale, cos = Math.cos(ry);
  ctx.save(); ctx.translate(cx, cy);
  // sombra
  ctx.save(); ctx.globalAlpha = .35; ctx.filter = 'blur(30px)'; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(40 * scale, ph * .55, pw * .45, 50 * scale, 0, 0, 7); ctx.fill(); ctx.restore();
  ctx.transform(cos, Math.sin(ry) * .18, 0, 1, 0, 0);
  // espessura (extrusao)
  const th = 26 * scale * Math.sign(ry || 1);
  for (let k = 12; k >= 1; k--) { ctx.fillStyle = k === 12 ? '#03050f' : '#1a2252'; ctx.beginPath(); ctx.roundRect(-pw / 2 + th * k / 12 / cos, -ph / 2 + 4 * scale * k / 12, pw, ph, 70 * scale); ctx.fill(); }
  const g = ctx.createLinearGradient(-pw / 2, -ph / 2, pw / 2, ph / 2); g.addColorStop(0, '#47529a'); g.addColorStop(1, '#0b1033');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 70 * scale); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(-pw / 2 + 24 * scale, -ph / 2 + 24 * scale, pw - 48 * scale, ph - 48 * scale, 52 * scale); ctx.clip();
  ctx.drawImage(scr, -pw / 2 + 24 * scale, -ph / 2 + 24 * scale, pw - 48 * scale, ph - 48 * scale);
  // reflexo especular movendo com a rotacao
  const rx = Math.sin(ry) * pw; const rg = ctx.createLinearGradient(-pw + rx, -ph / 2, pw + rx, ph / 2); rg.addColorStop(.35, 'rgba(255,255,255,0)'); rg.addColorStop(.5, 'rgba(255,255,255,.18)'); rg.addColorStop(.65, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg; ctx.fillRect(-pw, -ph, pw * 2, ph * 2); ctx.restore();
  ctx.fillStyle = '#03050f'; ctx.beginPath(); ctx.roundRect(-60 * scale, -ph / 2 + 42 * scale, 120 * scale, 30 * scale, 15 * scale); ctx.fill();
  ctx.restore();
}
function scene3(t) {
  cam.z = -FOC; cam.focus = 0;
  bg('#1f4bd0', '#051447');
  halftone(HALF_B, .3);
  // luz volumetrica vinda de cima
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) { const a = Math.sin(t * .5 + i * 1.7) * .12 + (i - 2) * .22; ctx.save(); ctx.translate(W / 2 + (i - 2) * 140, -200); ctx.rotate(a);
    const g = ctx.createLinearGradient(0, 0, 0, H * 1.1); g.addColorStop(0, 'rgba(255,230,120,.22)'); g.addColorStop(1, 'rgba(255,230,120,0)'); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.lineTo(220, H * 1.1); ctx.lineTo(-220, H * 1.1); ctx.fill(); ctx.restore(); }
  ctx.restore();
  bokeh(t, 36, 31, 'w', .35);
  // celular entra por baixo (continua o whip pan)
  const pin = E.outExpo(prog(t, 13.8, 14.5));
  const zoom = E.inExpo(prog(t, 22.55, 23.0)); // mergulho na tela -> cena 4
  const pcy = H * .56 + (1 - pin) * 1400 + Math.sin(t * 1.4) * 14;
  const ry = Math.sin(t * .8) * .32 * (1 - zoom);
  const ps = .92 * (1 + zoom * 7);
  // alimentos orbitando (ordenados por profundidade)
  const items = FOODS.map((f, i) => {
    const th = i / FOODS.length * Math.PI * 2 + (t - 14) * .55;
    const em = E.outBack(prog(t, 14.3 + i * .12, 14.9 + i * .12));
    const R = 500 * em;
    return { f, i, em, x: Math.cos(th) * R, z: Math.sin(th) * 520 * em, y: (hash(i) - .5) * 900 * em + Math.sin(t * 1.3 + i) * 30 };
  });
  items.sort((a, b) => b.z - a.z);
  const drawItem = it => { if (it.em <= 0) return; sprite(IMG[it.f], it.x, (pcy - H / 2) * .9 + it.y, it.z, 300 * Math.min(1, it.em + .2), { rot: Math.sin(t + it.i) * .2, a: clamp(it.em * 2) * (1 - zoom), blur: Math.min(8, Math.abs(it.z) / 90) }); };
  items.filter(i => i.z > 0).forEach(drawItem);
  drawPhone(t, W / 2, pcy, ps, ry);
  items.filter(i => i.z <= 0).forEach(drawItem);
  // raios flutuantes de primeiro plano (DOF)
  sprite(IMG.raioA, -560, 700 + Math.sin(t) * 40, -500, 330, { rot: -.4, a: 1 - zoom });
  sprite(IMG.raioC, 600, -760 + Math.sin(t * 1.2) * 30, 700, 300, { rot: .3, a: 1 - zoom });
  // textos
  const top = H * .115;
  const l1 = fitSize('MUITO MAIS QUE', 860, 150), l2 = fitSize('UMA COMPETIÇÃO.', 940, 150);
  txt('MUITO MAIS QUE', W / 2, top, l1, { fill: COL.W, depth: 10, depthColor: COL.BD, anim: A.rise(t, 15.0, .03, 17.75, l1) });
  txt('UMA COMPETIÇÃO.', W / 2, top + l1 * 1.05, l2, { fill: COL.Y, depth: 14, depthColor: '#5c4300', anim: A.rise(t, 15.25, .03, 17.75, l2) });
  // "UMA MISSAO DE SOLIDARIEDADE." com mascara (track matte) de tarja amarela
  const m1 = fitSize('UMA MISSÃO DE', 820, 140), m2 = fitSize('SOLIDARIEDADE.', 960, 170);
  txt('UMA MISSÃO DE', W / 2, top, m1, { fill: COL.W, depth: 10, depthColor: COL.BD, anim: A.rise(t, 18.0, .03, 22.5, m1) });
  const wp = E.outExpo(prog(t, 18.3, 18.75)), wx = E.inExpo(prog(t, 22.5, 22.75));
  if (wp > 0 && wx < 1) { const y2 = top + m1 * 1.08; ctx.save(); ctx.translate(W / 2, y2); ctx.rotate(-.03);
    ctx.fillStyle = COL.Y; ctx.fillRect(-500 + wx * 1000, -m2 * .62, 1000 * wp * (1 - wx), m2 * 1.18);
    ctx.beginPath(); ctx.rect(-500 + wx * 1000, -m2 * .62, 1000 * wp * (1 - wx), m2 * 1.18); ctx.clip();
    txt('SOLIDARIEDADE.', 0, 0, m2, { fill: COL.K, depth: 0, stroke: false }); ctx.restore(); }
  // palavras-chave no ritmo (20.0 - 22.5)
  const kw = ['DESAFIOS', 'UNIÃO', 'CRIATIVIDADE', 'DIVERSÃO', 'SOLIDARIEDADE'];
  kw.forEach((w, i) => { const t0 = 20.0 + i * .5, t1 = t0 + .5; if (t < t0 - .05 || t > t1 + .05) return;
    const p = E.outExpo(prog(t, t0, t0 + .18)), q = prog(t, t1 - .08, t1);
    ctx.save(); ctx.translate(W / 2, H * .895); ctx.rotate((i % 2 ? .04 : -.04)); ctx.scale(lerp(1.6, 1, p), lerp(1.6, 1, p)); ctx.globalAlpha = clamp(p * 3) * (1 - q);
    const s = fitSize(w, 760, 120); ctx.font = `${s}px Anton`; const tw = ctx.measureText(w).width;
    ctx.fillStyle = i % 2 ? COL.Y : COL.K; ctx.fillRect(-tw / 2 - 34, -s * .62, tw + 68, s * 1.2);
    ctx.restore();
    ctx.save(); ctx.translate(W / 2, H * .895); ctx.rotate((i % 2 ? .04 : -.04)); ctx.scale(lerp(1.6, 1, p), lerp(1.6, 1, p));
    txt(w, 0, 0, s, { fill: i % 2 ? COL.K : COL.Y, depth: 0, stroke: false, a: clamp(p * 3) * (1 - q) }); ctx.restore(); });
  if (zoom > 0) { ctx.fillStyle = `rgba(11,49,150,${E.inExpo(prog(t, 22.75, 23.0))})`; ctx.fillRect(-200, -200, W + 400, H + 400); }
}

/* ================= CENA 04 — EXPECTATIVA (23-32s) ================= */
function marquee(t, color, a, words) {
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H / 2); ctx.rotate(-.14);
  ctx.font = '190px Anton'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = color;
  const unit = words + '  •  '; const uw = ctx.measureText(unit).width;
  for (let r = -6; r <= 6; r++) { const dir = r % 2 ? 1 : -1, sp = 120 + (r & 3) * 40; const off = ((t * sp * dir) % uw + uw) % uw;
    for (let x = -1800 - off; x < 1800; x += uw) ctx.strokeText(unit, x, r * 210); }
  ctx.restore();
}
function phrase(t, lines, t0, tOut, style) {
  const n = lines.length, gap = 1.04;
  const sizes = lines.map(l => fitSize(l, 960, 360));
  const totalH = sizes.reduce((a, b) => a + b * gap, 0);
  let y = H / 2 - totalH / 2 + sizes[0] * gap / 2 + (style.yOff || 0);
  lines.forEach((l, i) => {
    const dir = i % 2 ? 1 : -1;
    txt(l, W / 2, y, sizes[i], { fill: style.fill[i % style.fill.length], depth: sizes[i] * .08, depthColor: style.depthColor, strokeColor: style.stroke ?? COL.K, sw: .06,
      anim: A.slide(t, t0 + i * .25, dir, tOut + i * .05) });
    y += sizes[i] * gap / 2 + (sizes[i + 1] || 0) * gap / 2;
  });
}
function scene4(t) {
  cam.z = -FOC; cam.focus = 0;
  let phase = t < 26 ? 0 : t < 29 ? 1 : 2;
  const push = phase === 2 ? E.inCubic(prog(t, 29.3, 31.0)) : 0;
  const col = E.inExpo(prog(t, 31.0, 31.75)); // colapso antes do drop
  ctx.save();
  ctx.translate(W / 2, H / 2); const sc = (1 + push * .25) * (1 - col); ctx.scale(sc, sc); ctx.rotate(col * 1.2); ctx.translate(-W / 2, -H / 2);
  if (phase === 0) {
    ctx.fillStyle = COL.B; ctx.fillRect(-400, -400, W + 800, H + 800);
    const wr = E.outExpo(prog(t, 23.0, 23.45)); ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, wr * 1250, 0, 7); ctx.clip();
    ctx.fillStyle = COL.Y; ctx.fillRect(-400, -400, W + 800, H + 800); halftone(HALF_Y, .55); marquee(t, '#B98A00', .55, 'PREPARE SUA EQUIPE');
    rays(t, .15, W / 2, H / 2, 1.4, -.2);
    phrase(t, ['PREPARE', 'SUA', 'EQUIPE!'], 23.0, 25.85, { fill: [COL.B, COL.W, COL.B], depthColor: COL.K });
    sprite(IMG.raioA, -380, -760 + Math.sin(t * 3) * 20, 200, 300, { rot: -.3 + E.outBack(prog(t, 23.6, 24)) * .3, a: prog(t, 23.6, 23.8) });
    sprite(IMG.raioB, 330, 760 + Math.sin(t * 2.4) * 20, 150, 440, { rot: .1, a: prog(t, 23.8, 24) });
    ctx.restore();
  } else if (phase === 1) {
    bg('#2552d6', COL.BD); halftone(HALF_B, .3); marquee(t, '#5b84ff', .35, 'REÚNA A GALERA'); rays(t, .18, W / 2, H * .82, 1.5, .25);
    bokeh(t, 30, 41, 'y', .5);
    phrase(t, ['REÚNA', 'A GALERA!'], 26.0, 28.85, { fill: [COL.W, COL.Y], depthColor: COL.K, yOff: -180 });
    const mp = E.outBack(prog(t, 26.5, 27.0)) * (1 - E.inExpo(prog(t, 28.8, 29.0)));
    if (mp > 0) { const m = IMG.megafone; ctx.save(); ctx.translate(W * .42, H * .80 + Math.sin(t * 20) * 5); ctx.rotate(-.12); ctx.scale(mp, mp); ctx.drawImage(m, -330, -330 * m.height / m.width, 660, 660 * m.height / m.width); ctx.restore(); }
    for (let k = 0; k < 3; k++) { const rp = ((t * 2.2 + k / 3) % 1); if (mp > .5) { ctx.save(); ctx.globalAlpha = 1 - rp; ctx.strokeStyle = COL.Y; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(W * .66, H * .78, 120 + rp * 380, -1.0, .6); ctx.stroke(); ctx.restore(); } }
  } else {
    ctx.fillStyle = '#050505'; ctx.fillRect(-400, -400, W + 800, H + 800);
    ctx.save(); ctx.globalAlpha = .5; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(HALF_Y, 0, 0); ctx.restore();
    ctx.fillStyle = 'rgba(5,5,5,.55)'; ctx.fillRect(-400, -400, W + 800, H + 800);
    marquee(t, '#3a3000', .9, 'ESSA EDIÇÃO PROMETE'); rays(t, .14 + push * .3, W / 2, H / 2, 1.6, .5);
    const fl = k => Math.sin(t * 2 + k) * 30;
    sprite(IMG.raioA, -520, -700 + fl(1), 600, 520, { rot: -.35 });
    sprite(IMG.raioC, 540, 640 + fl(2), 400, 440, { rot: .35 });
    sprite(IMG.raioB, 380, -900 + fl(3), -350, 520, { rot: .2 });
    phrase(t, ['ESSA', 'EDIÇÃO', 'PROMETE!'], 29.0, 99, { fill: [COL.W, COL.Y, COL.Y], depthColor: '#5c4300' });
  }
  ctx.restore();
  if (col > 0) { ctx.fillStyle = `rgba(0,0,0,${col})`; ctx.fillRect(-200, -200, W + 400, H + 400); }
  // faisca de antecipacao no centro
  const sp = prog(t, 31.6, 32.0); if (sp > 0) glow(W / 2, H / 2, 40 + sp * 260, 'rgba(255,220,60,1)', sp);
}

/* ================= CENA 05 — FINALIZACAO (32-40s) ================= */
function scene5(t) {
  const lt = t - 32;
  cam.z = -FOC + lt * 22; cam.focus = 0;
  bg('#2a5ae0', COL.BD);
  rays(t, .28 + env(t, 32, 2) * .6, W / 2, H * .47, 1.5, .15);
  halftone(HALF_B, .3);
  bokeh(t, 44, 51, 'y', .5);
  // alimentos ao fundo e em primeiro plano (DOF)
  const fi = E.outExpo(prog(t, 32.1, 33.0));
  const F = [['arroz', -560, -720, 1300], ['maca', 560, -560, 1600], ['leite', -600, 520, 1500], ['lata', 580, 860, 1200], ['pao', -320, 1050, -450], ['banana', 470, -1080, -500]];
  F.forEach(([k, x, y, z], i) => sprite(IMG[k], x * (0.6 + .4 * fi), y + Math.sin(t * 1.1 + i) * 30, z, 360, { rot: Math.sin(t * .7 + i) * .25, a: fi }));
  // raios 3D orbitando o logo
  for (let i = 0; i < 4; i++) { const th = i / 4 * Math.PI * 2 + t * .6; const R = 560 * fi;
    sprite(i % 2 ? IMG.raioA : IMG.raioC, Math.cos(th) * R, -80 + Math.sin(th) * 140, Math.sin(th) * 420, 230, { rot: Math.cos(th) * .4, blur: Math.max(0, Math.sin(th)) * 6 }); }
  // logo (badge) slam
  const lp = prog(t, 31.95, 32.4);
  const ls = lerp(3.4, 1, E.outExpo(lp)) * (1 + env(t, 37, 6) * .06);
  glow(W / 2, H * .46, 760, 'rgba(255,210,31,1)', .45 * E.outExpo(lp));
  if (lp > 0) { const p = proj(0, -80, 0); const d = 700 * p.s * ls;
    ctx.save(); ctx.translate(p.x, p.y + Math.sin(t * 1.4) * 8); ctx.rotate(Math.sin(t * .8) * .02);
    if (lp < 1) ctx.filter = `blur(${((1 - E.outExpo(lp)) * 18).toFixed(1)}px)`;
    // anel amarelo + sombra
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.filter = 'blur(24px)'; ctx.beginPath(); ctx.arc(14, 30, d / 2 + 18, 0, 7); ctx.fill(); ctx.restore();
    ctx.fillStyle = COL.Y; ctx.beginPath(); ctx.arc(0, 0, d / 2 + 18, 0, 7); ctx.fill();
    ctx.fillStyle = COL.K; ctx.beginPath(); ctx.arc(0, 0, d / 2 + 4, 0, 7); ctx.fill();
    ctx.drawImage(IMG.badge, -d / 2, -d / 2, d, d);
    // brilho (light sweep) mascarado pelo circulo
    const sw = prog(t, 37.9, 38.8); if (sw > 0 && sw < 1) { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, d / 2, 0, 7); ctx.clip(); ctx.rotate(.5); const x = lerp(-d, d, E.inOutCubic(sw));
      const g = ctx.createLinearGradient(x - 120, 0, x + 120, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(-d, -d, d * 2, d * 2); ctx.restore(); }
    ctx.restore(); }
  shock(t, 32.0, W / 2, H * .46, COL.Y, 1100); shock(t, 32.12, W / 2, H * .46, '#fff', 900);
  sparks(t, 32.0, W / 2, H * .46, 120, 61, 1.3);
  // textos
  const e1 = fitSize('PREPARADOS?', 900, 200);
  txt('ESTÃO', W / 2, H * .085, 120, { fill: COL.W, depth: 9, depthColor: COL.BD, anim: A.rise(t, 33.0, .04, 99, 120) });
  txt('PREPARADOS?', W / 2, H * .085 + 140, e1, { fill: COL.Y, depth: 14, depthColor: '#5c4300', anim: A.rise(t, 33.2, .03, 99, e1) });
  txt('PAFIES 2027', W / 2, H * .725, fitSize('PAFIES 2027', 800, 175), { fill: COL.W, depth: 14, depthColor: COL.K, anim: A.slam(t, 35.0, .035) });
  sparks(t, 35.0, W / 2, H * .725, 40, 71, .7);
  const vp = E.outExpo(prog(t, 37.0, 37.35));
  if (vp > 0) { ctx.save(); ctx.translate(W / 2, H * .87); ctx.rotate(-.045); ctx.scale(lerp(1.8, 1, vp), lerp(1.8, 1, vp)); ctx.globalAlpha = clamp(vp * 4);
    ctx.fillStyle = COL.K; ctx.fillRect(-500, -118, 1000, 236); ctx.fillStyle = COL.Y; ctx.fillRect(-500, 104, 1000, 14);
    const s = fitSize('VAMOS FAZER HISTÓRIA!', 900, 150); txt('VAMOS FAZER HISTÓRIA!', 0, 0, s, { fill: COL.Y, depth: 0, stroke: false }); ctx.restore(); }
  sparks(t, 37.0, W / 2, H * .87, 70, 81, 1);
}

/* ---------------- master comp ---------------- */
function draw(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, W, H);
  const sh = shakeAmt(t); const sx = (Math.sin(t * 91.3) + Math.sin(t * 57.1 + 1.3)) * .5 * sh, sy = (Math.sin(t * 77.7 + 2) + Math.sin(t * 43.3)) * .5 * sh;
  ctx.save(); ctx.translate(sx, sy);
  if (t < 6.0) scene1(t);
  else if (t < 14.0) {
    // whip pan para cima na saida (13.7 -> 14.0)
    const wp = E.inExpo(prog(t, 13.7, 14.0)); ctx.save(); ctx.translate(0, -wp * H); scene2(t); ctx.restore();
  } else if (t < 23.0) {
    const wp = 1 - E.outExpo(prog(t, 14.0, 14.3)); ctx.save(); ctx.translate(0, wp * H * .6); scene3(t); ctx.restore();
  } else if (t < 32.0) scene4(t);
  else scene5(t);
  ctx.restore();
  // flashes de impacto
  const fl = env(t, 6.0, 9) * .85 + env(t, 32.0, 9) * .9 + env(t, 23.0, 12) * .35 + env(t, 37.0, 12) * .3;
  if (fl > .01) { ctx.fillStyle = `rgba(255,255,255,${fl})`; ctx.fillRect(0, 0, W, H); }
}
let grainIdx = 0;
function finish(t) {
  actx.save(); actx.globalAlpha = .9; actx.drawImage(VIG, 0, 0); actx.restore();
  actx.save(); actx.globalCompositeOperation = 'overlay'; actx.globalAlpha = .07; actx.drawImage(GRAIN[Math.floor(t * FPS) % 4], 0, 0, W, H); actx.restore();
  const fo = prog(t, 39.4, 40); if (fo > 0) { actx.fillStyle = `rgba(0,0,0,${fo * .9})`; actx.fillRect(0, 0, W, H); }
}
/* motion blur: media de subframes dentro do obturador (180 graus) */
function renderAt(t, sub = 3, shutter = .5) {
  actx.globalAlpha = 1; actx.clearRect(0, 0, W, H);
  for (let i = 0; i < sub; i++) { const ts = t - shutter / FPS * (i / sub); draw(ts); actx.globalAlpha = 1 / (i + 1); actx.drawImage(cv, 0, 0); }
  actx.globalAlpha = 1; finish(t);
}
window.renderFrame = (f, sub, fmt = 'image/jpeg', q = .93) => { renderAt(f / FPS, sub); return acc.toDataURL(fmt, q); };

window.boot = async (assets, cues) => {
  CUES = cues;
  await new FontFace('Anton', `url(${assets.font})`).load().then(f => document.fonts.add(f));
  const load = (src, w) => new Promise(r => { const im = new Image(); im.onload = () => { if (!w) return r(im); const c = mk(w, Math.round(w * im.height / im.width)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); r(c); }; im.src = src; });
  for (const [k, v] of Object.entries(assets.img)) IMG[k] = await load(v.src, v.w);
  prebuild();
  return Object.keys(IMG);
};
