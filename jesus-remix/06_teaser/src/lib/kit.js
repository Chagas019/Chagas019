/* JESUS Remix · André Castro — KIT de motion (Editor de Vídeo / Sound Designer / VFX, fase 2)
   Compartilhado por 06_teaser, 07_social/reels, 07_social/countdown e 08_visualizer.
   Tudo é função pura do tempo t → window.seek(t) é determinístico (render quadro a quadro).

   Direção de movimento (cliente, ref 01_referencia/motion_ref): palco escuro azul-profundo com piso
   reflexivo + glow, câmera 3D inclinada (perspective/rotateX/rotateY/dolly), motion blur direcional
   (feGaussianBlur "x 0"), squash & stretch, morph esfera→letra, wipes de cor magenta→amarelo→azul,
   contador em odômetro, cortes no beat. Paleta e tipografia: 02_identidade/IDENTIDADE.md.            */
(() => {
const LIB = new URL('.', document.currentScript.src).href;           // .../06_teaser/src/lib/
const ROOT = new URL('../../../', LIB).href;                          // .../jesus-remix/
const TOK = { azul: '#037AF4', azulProfundo: '#0A4F96', amarelo: '#EAC11A', magenta: '#F833F8', branco: '#F9F9F9', tinta: '#0B0B14',
              palco: '#062A55', palcoFundo: '#041D3D' };          // palco = azul-profundo escurecido (nunca preto/tinta)
const PHOTO = ROOT + '03_assets/foto/artista_recorte.png';        // 1080×796, base cortada → esconder sob título/fade/borda

/* ───────── fontes ───────── */
const F = ROOT + '02_identidade/fontes/';
const css = document.createElement('style');
css.textContent = `
@font-face{font-family:"Dela";src:url(${F}dela-gothic-one-latin-400-normal.woff2) format("woff2")}
@font-face{font-family:"Yellowtail";src:url(${F}yellowtail-latin-400-normal.woff2) format("woff2")}
@font-face{font-family:"RMono";font-weight:300;src:url(${F}roboto-mono-latin-300-normal.woff2) format("woff2")}
@font-face{font-family:"RMono";font-weight:400;src:url(${F}roboto-mono-latin-400-normal.woff2) format("woff2")}
@font-face{font-family:"RMono";font-weight:700;src:url(${F}roboto-mono-latin-700-normal.woff2) format("woff2")}
html,body{margin:0;padding:0;background:#000;overflow:hidden}
#stage{position:relative;overflow:hidden;background:${TOK.palco}}
#stage .abs{position:absolute;left:0;top:0}
.dela{font-family:"Dela";line-height:1;white-space:nowrap}
.script{font-family:"Yellowtail";line-height:1;white-space:nowrap;color:${TOK.branco}}
.mono{font-family:"RMono";text-transform:uppercase;white-space:nowrap;color:${TOK.branco}}
.p3{transform-style:preserve-3d;position:absolute;left:0;top:0;width:0;height:0}
`;
document.head.appendChild(css);
async function fontsReady() {
  await Promise.all(['200px "Dela"', '200px "Yellowtail"', '300 40px "RMono"', '400 40px "RMono"', '700 40px "RMono"'].map(f => document.fonts.load(f)));
  await document.fonts.ready;
}
function loadImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(i); i.src = src; }); }

/* ───────── matemática / curvas (equivalentes às eases GSAP da identidade) ───────── */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  expoOut: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  expoIn: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  expoInOut: x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  power3In: x => x * x * x,
  power3Out: x => 1 - Math.pow(1 - x, 3),
  power2InOut: x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2,
  sineInOut: x => -(Math.cos(Math.PI * x) - 1) / 2,
  backOut: (x, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
};
// mola amortecida: 0→1 com overshoot (física de squash & stretch)
const spring = (dt, f = 7, z = 6) => dt <= 0 ? 0 : 1 - Math.exp(-z * dt) * Math.cos(f * Math.PI * dt);
// oscilação amortecida centrada em 0 (squash no contato)
const wobble = (dt, f = 6, z = 9) => dt < 0 ? 0 : Math.exp(-z * dt) * Math.cos(f * Math.PI * dt);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ───────── CUES: placeholder BPM 120 ↔ 09_audio/analise/beatmap.json ─────────
   O render (render.js) injeta window.__BEATMAP se o JSON existir; ao abrir a cena no navegador
   tentamos ler o arquivo direto (XHR file:// com --allow-file-access-from-files). Sem JSON → placeholder.
   def = { bpm, impactoBeat, nBeats }: a estrutura é escrita em BEATS; os tempos saem do grid. */
function readJSON(rel) {
  try { const x = new XMLHttpRequest(); x.open('GET', ROOT + rel, false); x.send(); if (x.status === 0 || x.status === 200) return JSON.parse(x.responseText); } catch (e) {}
  return null;
}
function cues(def) {
  const bm = window.__BEATMAP || readJSON('09_audio/analise/beatmap.json');
  let C;
  if (bm && bm.beats && bm.beats.length > 8) {
    const spb = 60 / bm.bpm;
    // trecho: impacto principal do clipe = primeiro impacto detectado da música (ou def.trechoImpacto se escolhido à mão)
    const alvo = def.trechoImpacto ?? (bm.impactos && bm.impactos.length ? bm.impactos[0] : bm.beats[Math.min(bm.beats.length - 1, def.impactoBeat)]);
    const iBeat = bm.beats.reduce((bi, b, i) => Math.abs(b - alvo) < Math.abs(bm.beats[bi] - alvo) ? i : bi, 0);
    const i0 = iBeat - def.impactoBeat;
    const t0 = i0 >= 0 ? bm.beats[i0] : bm.beats[0] + i0 * spb;
    const beats = []; for (let n = 0; n <= def.nBeats + 8; n++) { const k = i0 + n; beats.push((k >= 0 && k < bm.beats.length ? bm.beats[k] : t0 + n * spb) - t0); }
    C = { fonte: 'beatmap.json', bpm: bm.bpm, spb, trechoInicio: +t0.toFixed(3), beats };
  } else {
    const spb = 60 / def.bpm; const beats = []; for (let n = 0; n <= def.nBeats + 8; n++) beats.push(n * spb);
    C = { fonte: 'placeholder', bpm: def.bpm, spb, trechoInicio: 0, beats };
  }
  // B(n): tempo do beat n (aceita frações → interpola dentro do beat)
  C.B = n => { const i = Math.floor(n), f = n - i; const a = C.beats[clamp(i, 0, C.beats.length - 1)], b = C.beats[clamp(i + 1, 0, C.beats.length - 1)]; return a + (b - a) * f; };
  C.impacto = C.B(def.impactoBeat); C.duracao = C.B(def.nBeats);
  // pulso de beat: decai a partir do último beat ≥ from
  C.pulse = (t, from = 0, k = 10) => { let last = -1; for (const b of C.beats) { if (b > t + 1e-6) break; if (b >= C.B(from) - 1e-6) last = b; } return last < 0 ? 0 : Math.exp(-(t - last) * k); };
  window.CUES = C; return C;
}

/* ───────── motion blur direcional (SVG feGaussianBlur "x y") ───────── */
const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
defs.setAttribute('width', 0); defs.setAttribute('height', 0); defs.style.position = 'absolute';
document.body.appendChild(defs); let fid = 0;
function blur(el) {
  const id = 'mb' + (fid++);
  defs.insertAdjacentHTML('beforeend', `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0"/></filter>`);
  const g = defs.querySelector('#' + id + ' feGaussianBlur'); let last = '';
  return (sx, sy = 0, extra = '') => {
    sx = Math.abs(sx); sy = Math.abs(sy);
    const on = sx > .25 || sy > .25; const v = on ? `${sx.toFixed(1)} ${sy.toFixed(1)}` : '0 0';
    if (v !== last) { g.setAttribute('stdDeviation', v); last = v; }
    el.style.filter = (on ? `url(#${id}) ` : '') + extra || 'none';
  };
}

/* ───────── grão de papel + speckle (seed fixa, tile por quadro) ───────── */
function grain(stage, W, H, opacity = .5) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; c.className = 'abs';
  c.style.mixBlendMode = 'overlay'; c.style.opacity = opacity; c.style.pointerEvents = 'none'; stage.appendChild(c);
  const x = c.getContext('2d'); const tiles = [];
  for (let k = 0; k < 5; k++) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d');
    const img = cx.createImageData(W, H); const R = rng(1512 + k);
    for (let i = 0; i < img.data.length; i += 4) { const v = R() * 255 | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 58; }
    cx.putImageData(img, 0, 0); tiles.push(cv);
  }
  return { el: c, draw(frame) { x.clearRect(0, 0, W, H); x.drawImage(tiles[frame % tiles.length], 0, 0); } };
}

/* ───────── tabuleiro ondulado (mesma função seno da capa, com fase no tempo) ─────────
   x = x0 + u·cw + A·sin(2π v/lv + ph + u·0.55),  y = y0 + v·ch + B·sin(2π u/lu + ph2 + v·0.35) */
function drawChecker(ctx, o) {
  const { x = 0, y = 0, cw, ch, cols, rows, A = 18, B = 8, lv = 3.4, lu = 2.2, ph = 0, ph2 = 0, offset = 0, color = TOK.amarelo, uMin = -1, vMin = -1, alpha = 1, colorB = null } = o;
  const P = (u, v) => [x + u * cw + A * Math.sin(2 * Math.PI * v / lv + ph + u * .55), y + v * ch + B * Math.sin(2 * Math.PI * u / lu + ph2 + v * .35)];
  const N = 8; ctx.globalAlpha = alpha;
  for (const pass of colorB ? [0, 1] : [0]) {
    ctx.fillStyle = pass ? colorB : color; ctx.beginPath();
    for (let v = vMin; v < rows; v++) for (let u = uMin; u < cols; u++) {
      if ((((u + v + offset) % 2) + 2) % 2 !== pass) continue;
      for (let i = 0; i < N; i++) { const p = P(u + i / N, v); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
      for (let i = 0; i < N; i++) { const p = P(u + 1, v + i / N); ctx.lineTo(p[0], p[1]); }
      for (let i = 0; i < N; i++) { const p = P(u + 1 - i / N, v + 1); ctx.lineTo(p[0], p[1]); }
      for (let i = 0; i < N; i++) { const p = P(u, v + 1 - i / N); ctx.lineTo(p[0], p[1]); }
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ───────── mundo 3D: câmera (perspective) → mundo (preserve-3d) → piso reflexivo ─────────
   Coordenadas do mundo: x → direita, y → baixo (objetos "em pé" têm y < 0), z → para a câmera.
   Piso = plano y = 0. Reflexo = grupo espelhado scaleY(-1) com os mesmos objetos, visto através
   do piso semitransparente (reflexo real em perspectiva, sem truque 2D).                       */
function world(parent, W, H, o = {}) {
  const cam = document.createElement('div'); cam.className = 'abs';
  Object.assign(cam.style, { width: W + 'px', height: H + 'px', perspective: (o.persp || 1400) + 'px', perspectiveOrigin: `50% ${o.po ?? 42}%` });
  const wd = document.createElement('div'); wd.className = 'p3'; cam.appendChild(wd);
  const refl = document.createElement('div'); refl.className = 'p3'; refl.style.transform = 'scaleY(-1)'; wd.appendChild(refl);
  // piso: canvas desenhado por quadro (glow + tabuleiro opcional), deitado no plano y=0
  const FW = o.floorW || 3200, FD = o.floorD || 2600, FR = o.floorRes || 0.5;
  const floor = document.createElement('canvas'); floor.width = FW * FR; floor.height = FD * FR;
  Object.assign(floor.style, { position: 'absolute', left: -FW / 2 + 'px', top: -FD / 2 + 'px', width: FW + 'px', height: FD + 'px', transform: 'rotateX(90deg)', transformOrigin: '50% 50%' });
  // o canvas fica em z ∈ [-FD/2, FD/2] (frente = +z = perto da câmera)
  wd.appendChild(floor);
  const front = document.createElement('div'); front.className = 'p3'; wd.appendChild(front);
  parent.appendChild(cam);
  const fctx = floor.getContext('2d');
  const W3 = {
    cam, wd, refl, front, floor, fctx, FW, FD, FR,
    // câmera: centro na tela (cx, cy), dolly z, inclinação rx (graus, + = olhando de cima), órbita ry, roll rz
    set({ cx = W / 2, cy = H * .62, z = 0, rx = 14, ry = 0, rz = 0, s = 1 } = {}) {
      wd.style.transform = `translate3d(${cx}px,${cy}px,${z}px) rotateZ(${rz}deg) rotateX(${-rx}deg) rotateY(${ry}deg) scale(${s})`;
    },
    // objeto 3D com cópia refletida; build(container, isRefl) cria o conteúdo e devolve o nó
    obj(build) {
      const a = document.createElement('div'); a.className = 'p3'; front.appendChild(a);
      const b = document.createElement('div'); b.className = 'p3'; refl.appendChild(b);
      const ra = build(a, false), rb = build(b, true);
      return { a, b, ra, rb, tf(s) { a.style.transform = s; b.style.transform = s; }, show(v) { a.style.display = b.style.display = v ? '' : 'none'; } };
    },
    // piso: fundo translúcido azul + glow + (opcional) tabuleiro em perspectiva
    drawFloor({ glow = 1, glowX = 0, glowZ = 0, glowR = 900, glowColor = '120,190,255', tint = .78, checker = null, extra = null } = {}) {
      const c = fctx, w = floor.width, h = floor.height, k = FR;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
      c.setTransform(k, 0, 0, k, FW / 2 * k, FD / 2 * k);            // origem no centro do piso, unidades do mundo
      // superfície azul profunda translúcida (deixa ver o reflexo)
      c.fillStyle = `rgba(6,42,85,${tint})`; c.fillRect(-FW / 2, -FD / 2, FW, FD);
      if (checker) { c.save(); drawChecker(c, checker); c.restore(); }
      if (extra) extra(c);
      // glow do palco
      const g = c.createRadialGradient(glowX, glowZ, 0, glowX, glowZ, glowR);
      g.addColorStop(0, `rgba(${glowColor},${.55 * glow})`); g.addColorStop(.35, `rgba(${glowColor},${.22 * glow})`); g.addColorStop(1, `rgba(${glowColor},0)`);
      c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(-FW / 2, -FD / 2, FW, FD); c.globalCompositeOperation = 'source-over';
      // névoa ao fundo (horizonte some no escuro azul) — z negativo = longe
      const fog = c.createLinearGradient(0, -FD / 2, 0, FD * .1);
      fog.addColorStop(0, 'rgba(4,29,61,1)'); fog.addColorStop(1, 'rgba(4,29,61,0)');
      c.fillStyle = fog; c.fillRect(-FW / 2, -FD / 2, FW, FD);
      c.setTransform(1, 0, 0, 1, 0, 0);
    },
  };
  return W3;
}

/* ───────── texto Dela em 3D com extrusão REAL (camadas em Z) ─────────
   Dela Gothic One comprimida 0.8 × 1.16 (técnica aprovada da capa). Cada letra é uma pilha:
   face (cor) + n camadas azul-profundo escurecendo para trás. Base da letra em y = 0 (pousa no piso). */
let BASE = null;
function baseline() {
  if (BASE) return BASE;
  const d = document.createElement('div'); d.className = 'dela'; d.style.cssText = 'position:absolute;left:-9999px;top:0;font-size:1000px;line-height:1';
  d.innerHTML = 'J<span style="display:inline-block;width:1px;height:0;vertical-align:baseline"></span>'; document.body.appendChild(d);
  BASE = d.querySelector('span').offsetTop / 1000; d.remove(); return BASE;
}
function adv(ch) { return (window.GLYPHS && GLYPHS[ch] ? GLYPHS[ch].adv : (ch >= '0' && ch <= '9' ? .72 : ch === '.' ? .32 : .88)); }
function letter3D(parent, ch, { size, depth, face = TOK.magenta, side = TOK.azulProfundo, step = 2, refl = false, sx = .8, sy = 1.16 }) {
  const n = Math.max(1, Math.round(depth / step)); const layers = [];
  const box = document.createElement('div'); box.className = 'p3'; parent.appendChild(box);
  const inner = document.createElement('div'); inner.className = 'p3'; box.appendChild(inner);
  inner.style.transform = `scale(${sx},${sy})`;
  const top = -baseline() * size;
  for (let k = n; k >= 0; k--) {
    const L = document.createElement('div'); L.className = 'dela'; L.textContent = ch;
    const dark = k === 0 ? face : shade(side, 1 - .35 * (k / n));
    Object.assign(L.style, { position: 'absolute', left: 0, top: top + 'px', fontSize: size + 'px', color: refl ? shade(dark, .55) : dark, transform: `translateZ(${-k * step}px)` });
    inner.appendChild(L); layers.push(L);
  }
  return { box, layers, n, step, w: adv(ch) * size * sx };
}
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) * f, g = (n >> 8 & 255) * f, b = (n & 255) * f; return `rgb(${r | 0},${g | 0},${b | 0})`; }
// palavra 3D centrada em x=0; devolve letras com posição base para animar individualmente
function word3D(W3, text, o) {
  const tracking = o.tracking ?? -.01;
  const ws = [...text].map(ch => adv(ch) * o.size * .8 + tracking * o.size);
  const total = ws.reduce((a, b) => a + b, 0) - tracking * o.size;
  let x = -total / 2; const letters = [];
  [...text].forEach((ch, i) => {
    const ob = W3.obj((c, isR) => letter3D(c, ch, { ...o, refl: isR }));
    letters.push({ ch, ob, x0: x, w: ws[i] }); x += ws[i];
  });
  return { letters, width: total };
}
// define a profundidade visível (0..1) da extrusão — camadas além somem (extrusão "cresce" no impacto)
function setDepth(ob, k) { for (const r of [ob.ra, ob.rb]) r.layers.forEach((L, i) => { const layerK = r.n - i; L.style.visibility = layerK <= Math.round(k * r.n) ? 'visible' : 'hidden'; }); }

/* ───────── wipe de cor: magenta → amarelo → azul enchem a tela; o azul sai revelando a cena ─────────
   Borda diagonal com motion blur horizontal proporcional à velocidade da borda.                    */
function wipe(stage, W, H, { colors = [TOK.magenta, TOK.amarelo, TOK.azul], skew = .32, dir = 1 } = {}) {
  const els = colors.map(c => { const d = document.createElement('div'); d.className = 'abs'; Object.assign(d.style, { width: W + 'px', height: H + 'px', background: c, display: 'none' }); stage.appendChild(d); return { d, mb: blur(d) }; });
  const S = H * skew;
  const X = p => [p * (W + S + 40) - 20, p * (W + S + 40) - 20 - S];          // borda (x no topo, x na base)
  const poly = (p, cover) => { let [a, b] = X(p); if (dir < 0) { a = W - a; b = W - b; }
    return cover ? (dir > 0 ? `polygon(-40px 0,${a}px 0,${b}px ${H}px,-40px ${H}px)` : `polygon(${W + 40}px 0,${a}px 0,${b}px ${H}px,${W + 40}px ${H}px)`)
                 : (dir > 0 ? `polygon(${a}px 0,${W + 40}px 0,${W + 40}px ${H}px,${b}px ${H}px)` : `polygon(${a}px 0,-40px 0,-40px ${H}px,${b}px ${H}px)`); };
  return {
    // t0 = início; dur = tempo de cada camada cobrir; gap = defasagem entre cores; out = tempo do azul sair
    // devolve o instante do corte (tela 100% azul) para a cena trocar o conteúdo por baixo
    at(t, t0, dur = .3, gap = .07, out = .32) {
      const n = els.length, tCut = t0 + (n - 1) * gap + dur;
      els.forEach(({ d, mb }, i) => {
        const a = t0 + i * gap; let p = E.expoInOut(seg(t, a, a + dur)); let cover = true;
        const last = i === n - 1;
        if (t >= tCut) { if (!last) p = 0; else { p = E.expoInOut(seg(t, tCut, tCut + out)); cover = false; if (p >= 1) p = 0; } }
        if (p <= 0 || (!cover && p >= 1)) { d.style.display = 'none'; return; }
        d.style.display = ''; d.style.clipPath = poly(p, cover);
        const dp = Math.abs(E.expoInOut(seg(t + 1 / 60, cover ? a : tCut, (cover ? a : tCut) + (cover ? dur : out))) - E.expoInOut(seg(t - 1 / 60, cover ? a : tCut, (cover ? a : tCut) + (cover ? dur : out))));
        mb(Math.min(40, dp * (W + S) * .18), 0);
      });
      return tCut;
    },
    cutTime(t0, dur = .3, gap = .07) { return t0 + (els.length - 1) * gap + dur; },
  };
}

/* ───────── odômetro (contador de dígitos rolando até travar) ─────────
   Cada coluna é uma fita 0–9 repetida; v = posição contínua; blur vertical ∝ velocidade.     */
function odometer(parent, text, { size, color = TOK.branco, sx = .8, sy = 1.16, cls = 'dela', track = -.01 }) {
  const wrap = document.createElement('div'); wrap.style.cssText = `position:absolute;left:0;top:0;white-space:nowrap;display:flex;align-items:flex-start`;
  parent.appendChild(wrap);
  const H = size * 1.0; const cols = [];
  [...text].forEach(ch => {
    const isD = ch >= '0' && ch <= '9';
    const w = adv(ch) * size * sx + track * size;
    const win = document.createElement('div'); win.style.cssText = `position:relative;overflow:hidden;width:${w}px;height:${H * sy * 1.04}px`;
    const strip = document.createElement('div'); strip.className = cls;
    strip.style.cssText = `position:absolute;left:0;top:0;font-size:${size}px;line-height:${H}px;color:${color};transform-origin:0 0`;
    strip.innerHTML = isD ? Array.from({ length: 30 }, (_, i) => `<div>${i % 10}</div>`).join('') : `<div>${ch}</div>`;
    win.appendChild(strip); wrap.appendChild(win);
    cols.push({ ch, isD, d: isD ? +ch : 0, win, strip, mb: blur(strip), w });
  });
  return {
    wrap, cols, H: H * sy, width: cols.reduce((a, c) => a + c.w, 0),
    // u: progresso 0..1 da rolagem (já com easing aplicado fora); turns: voltas extras por coluna
    set(u, du = 0, turns = 2) {
      cols.forEach((c, i) => {
        if (!c.isD) { c.strip.style.transform = `scale(${sx},${sy})`; return; }
        const T = turns + i * .5;                                   // colunas da direita giram mais (odômetro)
        const v = c.d + 10 + T * 10 * (1 - u);                      // termina exatamente no dígito
        const y = -((v % 10) + 10) * H;                              // usa a fita do meio (10..19)
        c.strip.style.transform = `scale(${sx},${sy}) translateY(${y}px)`;
        c.mb(0, Math.min(26, Math.abs(du) * T * 10 * H * sy * .045));
      });
    },
  };
}

/* ───────── esfera magenta (squash & stretch) + morph em letra ─────────
   Pontos do círculo e do glifo (GLYPHS, mesmo nº de pontos, mesma orientação, começando no topo). */
function circlePts(n, r) { const a = []; for (let i = 0; i < n; i++) { const th = -Math.PI / 2 + 2 * Math.PI * i / n; a.push([r * Math.cos(th), r * Math.sin(th)]); } return a; }
function morphPath(ch, k, { r, size, sx = .8, sy = 1.16 }) {
  const G = GLYPHS[ch], n = G.pts.length, C = circlePts(n, r);
  // glifo centrado no centro do círculo (o círculo vira a letra "no lugar")
  const xs = G.pts.map(p => p[0]), ys = G.pts.map(p => p[1]);
  const gx = (Math.min(...xs) + Math.max(...xs)) / 2, gy = (Math.min(...ys) + Math.max(...ys)) / 2;
  // alinhamento por rotação de índice: escolhe o deslocamento que minimiza a distância total
  let best = 0, bd = 1e18;
  for (let s = 0; s < n; s += 3) { let d = 0; for (let i = 0; i < n; i += 6) { const g = G.pts[(i + s) % n]; const c = C[i]; d += (c[0] - (g[0] - gx) * size * sx) ** 2 + (c[1] - (g[1] - gy) * size * sy) ** 2; } if (d < bd) { bd = d; best = s; } }
  let d = '';
  for (let i = 0; i < n; i++) {
    const g = G.pts[(i + best) % n], c = C[i];
    const x = lerp(c[0], (g[0] - gx) * size * sx, k), y = lerp(c[1], (g[1] - gy) * size * sy, k);
    d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  return { d: d + 'Z', gy: gy * size * sy, gx: gx * size * sx };
}

/* ───────── impacto (identidade): escala 1.04→1, flash 2 quadros, shake ≤ 6 px ───────── */
function impact(t, ti, fps = 30) {
  const it = t - ti; let sx = 0, sy = 0;
  if (it >= 0 && it < .35) { const k = Math.exp(-it * 12); sx = 6 * k * Math.sin(it * 95); sy = 4 * k * Math.cos(it * 120); }
  const fi = Math.round(t * fps) - Math.round(ti * fps);
  const flash = fi === 0 ? .26 : fi === 1 ? .1 : 0;
  const scale = it >= 0 ? 1 + .04 * Math.pow(1 - E.power3Out(seg(it, 0, .5)), 1) : 1;
  return { sx, sy, flash, scale };
}

window.KIT = { TOK, PHOTO, ROOT, clamp, lerp, seg, E, spring, wobble, rng, cues, readJSON, blur, grain, drawChecker, world, word3D, letter3D, setDepth, shade, wipe, odometer, morphPath, impact, fontsReady, loadImg, adv, baseline };
})();
