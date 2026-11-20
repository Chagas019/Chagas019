/* JESUS Remix · André Castro — biblioteca de cena (motion)
   Componentes compartilhados por abertura.html e capa_loop.html.
   Medidas e técnicas copiadas de 04_capa/src/frames.html (arte aprovada):
   - título Dela Gothic One comprimido scale(0.8, 1.16), extrusão azul-profundo deslocada (0.55, 1) px/camada
   - tabuleiro: grade (u,v) deformada por senos, mesmas fórmulas e parâmetros
   Diferença: a extrusão aqui é REAL (camadas empilhadas em Z dentro de preserve-3d), com
   compensação de perspectiva → em câmera neutra o resultado é idêntico ao estático aprovado.
   Tudo é função pura de t (nada de Math.random / relógio). */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const TOK = { azul: '#037AF4', azulProf: '#0A4F96', amarelo: '#EAC11A', magenta: '#F833F8', branco: '#F9F9F9', tinta: '#0B0B14' };
  const PHOTO = '../../03_assets/foto/artista_recorte.png'; // 1080×796, base cortada
  const PHOTO_AR = 796 / 1080;
  const TITLE_SX = 0.8, TITLE_SY = 1.16;   // compressão aprovada (opção A)
  const PERSP = 1100;                       // perspectiva da câmera do título (px)

  // PRNG determinístico (mulberry32, igual ao frames.html)
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // Formato pela query ?w=&h=  → 'square' | 'story' | 'wide'
  function format() {
    const q = new URLSearchParams(location.search);
    const W = +(q.get('w') || 1080), H = +(q.get('h') || 1080);
    return { W, H, kind: W > H ? 'wide' : (H > W ? 'story' : 'square'), q };
  }
  // Sobrescrita de CUES pela query (?bpm=&offset=) — atalho para sincronizar com beatmap.json
  function cuesFromQuery(C, q) { if (q.get('bpm')) C.bpm = +q.get('bpm'); if (q.get('offset')) C.offset = +q.get('offset'); return C; }

  function el(parent, tag, cls, css, html) { const e = document.createElement(tag); if (cls) e.className = cls;
    Object.assign(e.style, css || {}); if (html != null) e.innerHTML = html; parent.appendChild(e); return e; }
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const prog = (t, t0, d) => clamp((t - t0) / d);
  const E = n => gsap.parseEase(n);

  /* ───────── Tabuleiro ondulado (fórmula do frames.html, fase animável) ───────── */
  function checkerD(c, H, dph = 0, dph2 = 0) {
    const [cw, ch] = c.cell, A = c.A, B = c.B, x = c.x, y = c.y || 0, h = c.h || H;
    const ph = (c.ph || 0) + dph, ph2 = (c.ph2 || 0) + dph2, off = c.offset || 0;
    const P = (u, v) => [x + u * cw + A * Math.sin(2 * Math.PI * v / c.lv + ph + u * 0.55),
                         y + v * ch + B * Math.sin(2 * Math.PI * u / c.lu + ph2 + v * 0.35)];
    const N = 10, nc = Math.ceil(c.w / cw) + 2, nr = Math.ceil(h / ch) + 2;
    let d = '';
    for (let v = (c.vMin ?? -1); v < (c.vMax ?? nr); v++) for (let u = (c.uMin ?? -1); u < (c.uMax ?? nc); u++) {
      if (((u + v + off) % 2 + 2) % 2) continue;
      const pts = [];
      for (let i = 0; i < N; i++) pts.push(P(u + i / N, v));
      for (let i = 0; i < N; i++) pts.push(P(u + 1, v + i / N));
      for (let i = 0; i < N; i++) pts.push(P(u + 1 - i / N, v + 1));
      for (let i = 0; i < N; i++) pts.push(P(u, v + 1 - i / N));
      d += 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
    }
    return d;
  }
  function checkers(parent, list, W, H) {
    return list.map(c => {
      const wrap = el(parent, 'div', 'abs', { left: 0, top: 0, width: W + 'px', height: H + 'px' });
      const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', W); svg.setAttribute('height', H);
      svg.style.position = 'absolute'; svg.style.left = svg.style.top = 0; svg.style.overflow = 'visible';
      const p = document.createElementNS(NS, 'path'); p.setAttribute('fill', TOK.amarelo); svg.appendChild(p); wrap.appendChild(svg);
      return { wrap, spec: c, draw: (dph, dph2) => p.setAttribute('d', checkerD(c, H, dph, dph2)) };
    });
  }

  /* ───────── Marca ✕ + globo (vetor do frames.html, com partes animáveis) ───────── */
  function marks(parent, cx, cy, s) {
    const gap = s * 0.42, sw = s * 0.27, w = s * 2 + gap;
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', w); svg.setAttribute('height', s);
    Object.assign(svg.style, { position: 'absolute', left: (cx - w / 2) + 'px', top: (cy - s / 2) + 'px', overflow: 'visible' });
    const B = TOK.branco;
    svg.innerHTML = `<g stroke="${B}" stroke-width="${sw}" stroke-linecap="square">
      <line class="mx" x1="${sw * .6}" y1="${sw * .6}" x2="${s - sw * .6}" y2="${s - sw * .6}" pathLength="1"/>
      <line class="mx" x1="${s - sw * .6}" y1="${sw * .6}" x2="${sw * .6}" y2="${s - sw * .6}" pathLength="1"/></g>
    <g fill="none" stroke="${B}" stroke-width="${s * .075}" transform="translate(${s + gap + s / 2} ${s / 2})">
      <circle class="mg" r="${s * .46}" pathLength="1"/>
      <ellipse class="mg" rx="${s * .2}" ry="${s * .46}" pathLength="1"/>
      <line class="mg" x1="0" y1="${-s * .46}" x2="0" y2="${s * .46}" pathLength="1"/>
      <line class="mg" x1="${-s * .46}" y1="0" x2="${s * .46}" y2="0" pathLength="1"/>
      <line class="mg" x1="${-s * .41}" y1="${-s * .21}" x2="${s * .41}" y2="${-s * .21}" pathLength="1"/>
      <line class="mg" x1="${-s * .41}" y1="${s * .21}" x2="${s * .41}" y2="${s * .21}" pathLength="1"/></g>`;
    parent.appendChild(svg);
    const parts = [...svg.querySelectorAll('.mx,.mg')];
    parts.forEach(p => { p.style.strokeDasharray = '1 1'; });
    return { svg, parts, set(k) { parts.forEach((p, i) => { const kk = clamp(k * (parts.length + 2) / 3 - i / 3); p.style.strokeDashoffset = 1 - E('expo.out')(kk); }); } };
  }

  /* ───────── Título com extrusão real (camadas empilhadas em Z) ─────────
     Estrutura: wrap(perspective) > cam(preserve-3d, rotX/rotY) > squish(scale .8×1.16) > letra(preserve-3d) > [ext×D, face]
     Cada camada i: translate3d(0.55i, i, −zk·i) + escala de compensação de perspectiva (P+z)/P em torno
     da origem de perspectiva → com câmera neutra é pixel-idêntico ao text-shadow do estático. */
  function title3D(parent, text, o) {
    const size = o.size, depth = o.depth, align = o.align || 'center';
    const wrap = el(parent, 'div', 'abs t3d', { top: o.top + 'px', left: (align === 'center' ? o.cx : o.left) + 'px',
      perspective: PERSP + 'px', perspectiveOrigin: '50% 50%', transform: align === 'center' ? 'translateX(-50%)' : 'none' });
    const cam = el(wrap, 'div', 't3cam', { transformStyle: 'preserve-3d', transformOrigin: '50% 50%' });
    const squish = el(cam, 'div', 't3sq', { transformStyle: 'preserve-3d', transform: `scale(${TITLE_SX},${TITLE_SY})`,
      transformOrigin: align === 'center' ? '50% 0' : '0 0', fontFamily: '"Dela Gothic One"', fontSize: size + 'px',
      lineHeight: 1, letterSpacing: '-0.01em', whiteSpace: 'nowrap', color: o.color || TOK.magenta });
    const ext = o.ext || TOK.azulProf;
    const letters = [...text].map(ch => {
      const box = el(squish, 'span', 't3l', { display: 'inline-block', position: 'relative', transformStyle: 'preserve-3d' });
      const layers = [];
      for (let i = depth; i >= 1; i--) {
        const L = el(box, 'span', 't3e', { position: 'absolute', left: 0, top: 0, color: ext,
          backfaceVisibility: 'visible' }, ch === ' ' ? '&nbsp;' : ch);
        layers.push({ e: L, i });
      }
      const face = el(box, 'span', 't3f', { position: 'relative', display: 'inline-block' }, ch === ' ' ? '&nbsp;' : ch);
      return { box, face, layers, ch };
    });
    const api = { wrap, cam, squish, letters, depth, size,
      zk: 0, shineOn: false,
      // define profundidade visível (0..1), escala Z (px por camada)
      setDepth(k, zk) {
        const n = k * depth; const oy = (wrap.offsetHeight / 2) / TITLE_SY;
        for (const Lt of letters) {
          const left = Lt.box.offsetLeft;
          for (const { e, i } of Lt.layers) {
            if (i > n + 0.001) { e.style.visibility = 'hidden'; continue; }
            e.style.visibility = 'visible';
            const z = i * zk, s = (PERSP + z) / PERSP;
            // origem de perspectiva no espaço local do squish (independe de x porque o squish escala em torno do centro)
            e.style.transformOrigin = `${(api._pox - left).toFixed(2)}px ${oy.toFixed(2)}px`;
            e.style.transform = `translate3d(${(i * .55).toFixed(2)}px, ${i}px, ${(-z).toFixed(2)}px) scale(${s.toFixed(5)})`;
          }
        }
      },
      // brilho percorrendo a extrusão: band em [−0.3, 1.3] (fração da largura do título); null = desligado
      setShine(band, color) {
        for (const Lt of letters) for (const { e } of Lt.layers) {
          if (band == null) { e.style.backgroundImage = 'none'; e.style.color = ext; continue; }
          const tw = api._tw, left = Lt.box.offsetLeft, b = band * 100;
          e.style.color = 'transparent';
          e.style.backgroundImage = `linear-gradient(100deg, ${ext} ${(b - 14).toFixed(2)}%, ${color || '#8CC6FF'} ${b.toFixed(2)}%, ${ext} ${(b + 14).toFixed(2)}%)`;
          e.style.backgroundSize = `${tw}px 100%`; e.style.backgroundRepeat = 'no-repeat';
          e.style.backgroundPosition = `${-left}px 0`;
          e.style.webkitBackgroundClip = 'text'; e.style.backgroundClip = 'text';
        }
      },
      setCam(rx, ry, extra) { cam.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) ${extra || ''}`; },
      measure() { api._tw = squish.offsetWidth; api._pox = squish.offsetWidth / 2 / (align === 'center' ? 1 : TITLE_SX); },
      // métrica: y (no espaço do pai) da base do glifo
      baselineY() {
        const c = document.createElement('canvas').getContext('2d'); c.font = `${size}px "Dela Gothic One"`;
        const m = c.measureText(text); const asc = m.fontBoundingBoxAscent, des = m.fontBoundingBoxDescent;
        const half = (size - (asc + des)) / 2; return o.top + (half + asc + m.actualBoundingBoxDescent) * TITLE_SY;
      },
      glyphTopY() {
        const c = document.createElement('canvas').getContext('2d'); c.font = `${size}px "Dela Gothic One"`;
        const m = c.measureText(text); const asc = m.fontBoundingBoxAscent, des = m.fontBoundingBoxDescent;
        const half = (size - (asc + des)) / 2; return o.top + (half + asc - m.actualBoundingBoxAscent) * TITLE_SY;
      },
    };
    return api;
  }

  /* Reflexo 2D do título no piso (cópia espelhada, máscara degradê) */
  function reflection(parent, text, o, baseY) {
    const align = o.align || 'center';
    const wrap = el(parent, 'div', 'abs refl', { left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' });
    const flip = el(wrap, 'div', 'abs', { left: 0, top: 0, width: '100%', height: '100%',
      transformOrigin: `50% ${baseY}px`, transform: 'scaleY(-1)' });
    const t = title3D(flip, text, Object.assign({}, o, { depth: Math.round(o.depth * .6) }));
    // máscara aplicada no wrap espelhado: começa na linha do piso e some rápido
    const mk = `linear-gradient(to bottom, transparent ${baseY}px, rgba(0,0,0,1) ${baseY}px, transparent ${baseY + o.size * .62}px)`;
    wrap.style.maskImage = mk; wrap.style.webkitMaskImage = mk;
    return { wrap, flip, t };
  }

  /* ───────── "remix" (Yellowtail) ───────── */
  function script(parent, text, o) {
    const ex = []; const n = Math.max(1, Math.round(o.size * .035));
    for (let i = 1; i <= n; i++) ex.push(`${(i * .6).toFixed(1)}px ${i}px 0 rgba(10,79,150,0.85)`);
    const wrap = el(parent, 'div', 'abs', { left: (o.left != null ? o.left : o.cx) + 'px', top: o.top + 'px',
      transform: `translateX(${o.left != null ? 0 : -50}%) rotate(${o.rot ?? -6}deg)`,
      fontFamily: 'Yellowtail', color: TOK.branco, fontSize: o.size + 'px', lineHeight: 1, whiteSpace: 'nowrap' });
    const inner = el(wrap, 'div', '', { textShadow: ex.join(','), padding: '0 .12em' }, text);
    wrap.style.marginLeft = (o.left != null ? -0.12 * o.size : 0) + 'px';
    return { wrap, inner };
  }
  function mono(parent, text, o) {
    const e = el(parent, 'div', 'abs mono', { fontSize: o.size + 'px', fontWeight: o.weight || 400, letterSpacing: (o.track ?? .06) + 'em',
      top: o.top + 'px', color: o.color || TOK.branco, fontFamily: '"Roboto Mono"', textTransform: 'uppercase', whiteSpace: 'nowrap' }, text);
    if (o.align === 'center') { e.style.left = o.cx + 'px'; e.style.transform = 'translateX(-50%)'; } else e.style.left = o.left + 'px';
    return e;
  }
  function signature(parent, o) {
    const e = el(parent, 'div', 'abs mono', { fontSize: o.size + 'px', fontWeight: 400, letterSpacing: '0.05em', lineHeight: 1.02,
      top: o.top + 'px', left: (o.left != null ? o.left : o.cx) + 'px', transform: o.left != null ? 'none' : 'translateX(-50%)',
      fontFamily: '"Roboto Mono"', color: TOK.branco, whiteSpace: 'nowrap', textAlign: 'left' },
      `<span class="row"><span>ANDRÉ<span style="font-weight:700;font-size:.62em;vertical-align:.32em;margin-left:.18em">✕</span></span></span><span class="row"><span>CASTRO</span></span>`);
    const rows = [...e.querySelectorAll('.row > span')];
    e.querySelectorAll('.row').forEach(r => Object.assign(r.style, { display: 'block', overflow: 'hidden', height: '1.04em', paddingTop: '.1em', marginTop: '-.1em' }));
    rows.forEach(r => r.style.display = 'inline-block');
    return { e, rows };
  }
  function photo(parent, o) {
    const fade = o.fade ?? .16;
    const pos = el(parent, 'div', 'abs', { left: (o.cx - o.width / 2) + 'px', top: o.top + 'px', width: o.width + 'px',
      height: (o.width * PHOTO_AR) + 'px', transformOrigin: '50% 100%' });
    const fx = el(pos, 'div', 'abs', { left: 0, top: 0, width: '100%', height: '100%', transformOrigin: '50% 100%' });
    const m = `linear-gradient(to bottom, #000 ${(1 - fade) * 100}%, transparent 100%)`;
    const img = el(fx, 'img', '', { display: 'block', width: '100%', maskImage: m, webkitMaskImage: m,
      filter: `contrast(1.06) saturate(1.04) drop-shadow(0 18px 30px rgba(5,40,90,.35))` });
    img.src = PHOTO;
    return { pos, fx, img };
  }

  /* ───────── Contador rolante (odômetro) em Dela comprimida + extrusão ───────── */
  function odometer(parent, str, o) {
    const align = o.align || 'center';
    const n = Math.max(1, Math.round(o.depth));
    const sh = []; for (let i = 1; i <= n; i++) sh.push(`${(i * .55).toFixed(2)}px ${i}px 0 ${o.ext || TOK.azulProf}`);
    const wrap = el(parent, 'div', 'abs', { top: o.top + 'px', left: (align === 'center' ? o.cx : o.left) + 'px',
      transform: align === 'center' ? 'translateX(-50%)' : 'none' });
    const sq = el(wrap, 'div', '', { fontFamily: '"Dela Gothic One"', fontSize: o.size + 'px', lineHeight: 1, letterSpacing: '-0.01em',
      whiteSpace: 'nowrap', color: o.color || TOK.branco, textShadow: sh.join(','), transform: `scale(${TITLE_SX},${TITLE_SY})`,
      transformOrigin: align === 'center' ? '50% 0' : '0 0' });
    const CELL = 1.25; // em — célula alta para a extrusão não vazar para o dígito vizinho
    const cols = [...str].map((ch, idx) => {
      const win = el(sq, 'span', '', { display: 'inline-block', position: 'relative', height: CELL + 'em', verticalAlign: 'top',
        overflow: /\d/.test(ch) ? 'hidden' : 'visible', paddingRight: '.1em', marginRight: '-.1em' });
      if (!/\d/.test(ch)) { win.textContent = ch; return { win, ch, digit: false }; }
      el(win, 'span', '', { visibility: 'hidden' }, ch); // largura = dígito final
      const reel = el(win, 'span', '', { position: 'absolute', left: 0, top: 0, display: 'block' });
      const f = +ch, spins = (o.spins || 1) * 10 + ((idx * 3) % 7);
      const seq = []; for (let k = spins; k >= 0; k--) seq.push(((f - k) % 10 + 10) % 10);
      seq.forEach(d => el(reel, 'span', '', { display: 'block', height: CELL + 'em' }, d));
      return { win, reel, ch, digit: true, steps: spins };
    });
    // define a rolagem do dígito idx: k ∈ [0,1] (0 = início do rolo, 1 = dígito final); vblur em px
    const filt = document.createElementNS(NS, 'svg'); filt.setAttribute('width', 0); filt.setAttribute('height', 0); filt.style.position = 'absolute';
    const id = 'vb' + Math.round(o.top) + '_' + Math.round(o.size);
    filt.innerHTML = cols.map((c, i) => `<filter id="${id}_${i}" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="0 0"/></filter>`).join('');
    parent.appendChild(filt);
    const gb = [...filt.querySelectorAll('feGaussianBlur')];
    return { wrap, cols,
      setCol(i, k, blur) { const c = cols[i]; if (!c.digit) return;
        c.reel.style.transform = `translateY(${(-k * c.steps * CELL).toFixed(4)}em)`;
        if (blur > .3) { gb[i].setAttribute('stdDeviation', `0 ${blur.toFixed(2)}`); c.reel.style.filter = `url(#${id}_${i})`; }
        else c.reel.style.filter = 'none'; },
    };
  }

  /* ───────── Grão de papel + speckle (seed fixa; mesma receita do frames.html) ───────── */
  function grain(parent, W, H, nTiles = 4) {
    const c = el(parent, 'canvas', 'abs', { left: 0, top: 0, mixBlendMode: 'overlay', opacity: .13, pointerEvents: 'none' });
    c.width = W; c.height = H; const x = c.getContext('2d');
    const tiles = [];
    for (let k = 0; k < nTiles; k++) {
      const img = x.createImageData(W, H); const R = rng(1512 + k);
      for (let i = 0; i < img.data.length; i += 4) { const v = (R() * 255) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      tiles.push(img);
    }
    let last = -1;
    return { c, draw(k) { k = ((k % nTiles) + nTiles) % nTiles; if (k !== last) { x.putImageData(tiles[k], 0, 0); last = k; } } };
  }
  function specks(parent, W, H, seed = 2026) {
    const c = el(parent, 'canvas', 'abs', { left: 0, top: 0, opacity: .5, pointerEvents: 'none' });
    c.width = W; c.height = H; const x = c.getContext('2d');
    const R = rng(seed), n = Math.round(W * H / 2600), list = [];
    for (let i = 0; i < n; i++) { const a = R(); list.push({ white: a < .7, x: R() * W, y: R() * H, r: .4 + R() * 1.4, q: .4 + R() * .8, rot: R() * 3,
      ph: R() * Math.PI * 2, k: 1 + ((R() * 3) | 0), dr: 1 + R() * 2.5 }); }
    // phase ∈ [0,1): tudo com nº inteiro de ciclos → loop perfeito
    return { c, draw(phase, alpha = 1) {
      x.clearRect(0, 0, W, H); if (alpha <= 0) return;
      const a2 = Math.PI * 2 * phase;
      for (const s of list) {
        const tw = s.white ? .55 + .45 * Math.sin(a2 * s.k + s.ph) : 1;
        x.globalAlpha = alpha * tw; x.fillStyle = s.white ? 'rgba(255,255,255,.35)' : 'rgba(10,40,90,.35)';
        const px = s.x + s.dr * Math.cos(a2 + s.ph), py = s.y + s.dr * Math.sin(a2 + s.ph);
        x.beginPath(); x.ellipse(px, py, s.r, s.r * s.q, s.rot, 0, 7); x.fill();
      }
      x.globalAlpha = 1; } };
  }
  function vignette(parent, W, H) {
    return el(parent, 'div', 'abs', { left: 0, top: 0, width: W + 'px', height: H + 'px', pointerEvents: 'none',
      background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(4,30,80,.22) 100%)' });
  }
  async function fontsReady() {
    await Promise.all(['200px "Dela Gothic One"', '186px Yellowtail', '300 40px "Roboto Mono"', '400 40px "Roboto Mono"', '700 40px "Roboto Mono"']
      .map(f => document.fonts.load(f, 'JESUS remix ANDRÉ ✕ 0123456789')));
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })));
  }

  window.JR = { NS, TOK, PHOTO_AR, TITLE_SX, TITLE_SY, PERSP, rng, format, cuesFromQuery, el, clamp, lerp, prog, E,
    checkers, marks, title3D, reflection, script, mono, signature, photo, odometer, grain, specks, vignette, fontsReady };
})();
