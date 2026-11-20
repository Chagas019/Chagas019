/* JESUS Remix — motor de cenas do teaser e dos reels (usa kit.js).
   Camadas: palco escuro → mundo 3D (reflexo/piso/objetos: esfera, JESUS 3D, remix) → close do artista
   → layout da capa (2D, por formato) → tipografia cinética → wipe → flash → vinheta → grão.
   Cada quadro: o roteiro (teaser.html / reels.html) escolhe o plano ativo e chama SC.<plano>(...). */
(() => {
const { TOK, E, seg, clamp, lerp, wobble, spring } = KIT;

window.makeScene = function (W, H, fmt, CUES) {
  const stage = document.getElementById('stage');
  Object.assign(stage.style, { width: W + 'px', height: H + 'px' });
  const div = (css, html = '', cls = 'abs', parent = stage) => { const d = document.createElement('div'); d.className = cls; d.style.cssText += css; d.innerHTML = html; parent.appendChild(d); return d; };
  const ext = (n, c, dx = .55) => Array.from({ length: Math.max(1, Math.round(n)) }, (_, i) => `${((i + 1) * dx).toFixed(2)}px ${i + 1}px 0 ${c}`).join(',');
  const fs = fmt === 'wide' ? 1.42 : 1;                       // escala do mundo por formato
  const SIZE = 227, DEPTH = 46;                               // JESUS 3D (unidades do mundo, base 1080)

  /* ── palco ── */
  const bg = div(`width:${W}px;height:${H}px;background:radial-gradient(75% 60% at 50% 55%, #0B4C93 0%, ${TOK.palco} 55%, ${TOK.palcoFundo} 100%)`);
  const halo = div(`width:${W}px;height:${H}px;background:radial-gradient(40% 30% at 50% 58%, rgba(120,190,255,.35), rgba(3,122,244,0) 70%)`);

  /* ── mundo 3D ── */
  const W3 = KIT.world(stage, W, H, { persp: fmt === 'wide' ? 1700 : 1500, po: 48, floorW: 3400, floorD: 3000, floorRes: .42, reflOpacity: .5 });
  const camMB = KIT.blur(W3.cam), floorMB = KIT.blur(W3.floorCam);
  const word = KIT.word3D(W3, 'JESUS', { size: SIZE, depth: DEPTH, step: 2, face: TOK.magenta, side: TOK.azulProfundo });
  const L = word.letters, J = L[0];
  // remix como plano no mundo, à frente do título, sobrepondo a base (como na capa)
  const remix = W3.obj((c, isR) => { const d = document.createElement('div'); d.className = 'script';
    Object.assign(d.style, { position: 'absolute', left: '0', top: '0', fontSize: SIZE * .92 + 'px', color: isR ? KIT.shade(TOK.branco, .6) : TOK.branco,
      textShadow: ext(SIZE * .03, 'rgba(10,79,150,.85)', .6), transform: `translate(-30%, -46%) rotate(-6deg)`, padding: '0 30px' });
    d.textContent = 'remix'; c.appendChild(d); return d; });
  const remixMB = KIT.blur(remix.ra);
  // esfera magenta (SVG em billboard) → morph em J
  const R0 = SIZE * .4;
  const ball = W3.obj((c, isR) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const V = SIZE * 1.6;
    s.setAttribute('width', V * 2); s.setAttribute('height', V * 2); s.setAttribute('viewBox', `${-V} ${-V} ${V * 2} ${V * 2}`);
    Object.assign(s.style, { position: 'absolute', left: -V + 'px', top: -V + 'px', overflow: 'visible' });
    const id = 'sph' + (isR ? 'r' : 'a');
    s.innerHTML = `<defs><radialGradient id="${id}" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#FFC4FF"/><stop offset=".28" stop-color="${TOK.magenta}"/><stop offset="1" stop-color="#9A169F"/></radialGradient></defs>
      <path class="sh" fill="url(#${id})"/><path class="fl" fill="${TOK.magenta}" opacity="0"/>`;
    c.appendChild(s); const g = s; if (isR) s.style.opacity = .8;
    return { s, sh: s.querySelector('.sh'), fl: s.querySelector('.fl') };
  });
  // sombra de contato no piso (desenhada no canvas do piso)
  /* ── close do artista (2D) ── */
  const art = div(`width:${W}px;height:${H}px;display:none;overflow:hidden;background:radial-gradient(70% 60% at 50% 40%, #0B4C93, ${TOK.palcoFundo})`);
  const artImg = document.createElement('img'); artImg.src = KIT.PHOTO; art.appendChild(artImg);
  Object.assign(artImg.style, { position: 'absolute', left: 0, top: 0, width: '1080px', transformOrigin: '0 0',
    maskImage: 'linear-gradient(to bottom,#000 78%,transparent 99%)', webkitMaskImage: 'linear-gradient(to bottom,#000 78%,transparent 99%)' });
  const artLight = div(`width:${W}px;height:${H}px;mix-blend-mode:soft-light`, '', 'abs', art);
  const artMB = KIT.blur(artImg);

  /* ── layout da capa (2D, por formato; coordenadas de 04_capa/src/frames.html) ── */
  const LY = {
    square: { ck: [{ x: -14, cw: 122, ch: 124, A: 20, B: 8, lv: 3.4, lu: 2.2, ph: .4, ph2: 1.1, cols: 2, rows: 10 }, { x: 828, cw: 122, ch: 124, A: 20, B: 8, lv: 3.4, lu: 2.2, ph: 2.3, ph2: .2, offset: 1, uMin: 0, cols: 3, rows: 10 }],
      marks: [540, 92, 50], photo: { cx: 532, top: 262, w: 610, fade: .16 }, title: { cx: 540, top: 578, size: 198, depth: 14 }, remix: { cx: 560, top: 700, size: 188 },
      sign: { cx: 540, top: 888, size: 32 }, date: { cx: 540, top: 984, size: 50 }, rule: null },
    story: { ck: [{ x: -30, cw: 100, ch: 112, A: 16, B: 7, lv: 3.6, lu: 2.0, ph: .9, ph2: .4, cols: 2, rows: 18 }, { x: 910, cw: 100, ch: 112, A: 16, B: 7, lv: 3.6, lu: 2.0, ph: 2.8, ph2: 1.3, offset: 1, uMin: 0, cols: 3, rows: 18 }],
      marks: [540, 300, 46], photo: { cx: 532, top: 470, w: 730, fade: .16 }, title: { cx: 540, top: 860, size: 186, depth: 13 }, remix: { cx: 560, top: 972, size: 176 },
      rule: [390, 1250, 300], date: { cx: 540, top: 1290, size: 92 }, plat: { cx: 540, top: 1436, size: 27 }, sign: { cx: 540, top: 1530, size: 40 } },
    wide: { ck: [{ x: -40, cw: 124, ch: 124, A: 22, B: 9, lv: 3.0, lu: 2.4, ph: .6, ph2: .9, cols: 3, rows: 10 }, { x: 1760, cw: 124, ch: 124, A: 22, B: 9, lv: 3.0, lu: 2.4, ph: 2.0, ph2: .1, offset: 1, uMin: 0, cols: 3, rows: 10 }],
      marks: [1610, 110, 38], photo: { cx: 620, top: 343, w: 1000, fade: 0 }, title: { left: 1090, top: 262, size: 178, depth: 13 }, remix: { left: 1290, top: 384, size: 160 },
      rule: [1096, 626, 120], date: { left: 1092, top: 660, size: 80 }, plat: { left: 1096, top: 770, size: 22 }, sign: { left: 1096, top: 880, size: 34 } },
  }[fmt];
  const capa = div(`width:${W}px;height:${H}px;display:none;overflow:hidden;background:${TOK.azul}`);
  const capaIn = div(`width:${W}px;height:${H}px;transform-origin:50% 50%`, '', 'abs', capa);
  const ckC = document.createElement('canvas'); ckC.width = W; ckC.height = H; ckC.className = 'abs'; capaIn.appendChild(ckC); const ckX = ckC.getContext('2d');
  const m = LY.marks, ms = m[2], gap = ms * .42, sw = ms * .27, mw = ms * 2 + gap;
  const marks = div(`left:${m[0] - mw / 2}px;top:${m[1] - ms / 2}px;width:${mw}px;height:${ms}px`, `<svg width="${mw}" height="${ms}" style="overflow:visible">
    <g class="mx" stroke="${TOK.branco}" stroke-width="${sw}" stroke-linecap="square" style="transform-origin:${ms / 2}px ${ms / 2}px"><line x1="${sw * .6}" y1="${sw * .6}" x2="${ms - sw * .6}" y2="${ms - sw * .6}"/><line x1="${ms - sw * .6}" y1="${sw * .6}" x2="${sw * .6}" y2="${ms - sw * .6}"/></g>
    <g fill="none" stroke="${TOK.branco}" stroke-width="${ms * .075}" transform="translate(${ms + gap + ms / 2} ${ms / 2})"><g class="gl"><circle r="${ms * .46}" pathLength="1"/><ellipse rx="${ms * .2}" ry="${ms * .46}" pathLength="1"/><line x1="0" y1="${-ms * .46}" x2="0" y2="${ms * .46}" pathLength="1"/><line x1="${-ms * .46}" y1="0" x2="${ms * .46}" y2="0" pathLength="1"/><line x1="${-ms * .41}" y1="${-ms * .21}" x2="${ms * .41}" y2="${-ms * .21}" pathLength="1"/><line x1="${-ms * .41}" y1="${ms * .21}" x2="${ms * .41}" y2="${ms * .21}" pathLength="1"/></g></g></svg>`, 'abs', capaIn);
  const glLines = [...marks.querySelectorAll('.gl > *')]; glLines.forEach(e => e.setAttribute('stroke-dasharray', '1'));
  const mx = marks.querySelector('.mx');
  const P = LY.photo, pm = `linear-gradient(to bottom, #000 ${(1 - P.fade) * 100 - (P.fade ? 0 : 0)}%, transparent 100%)`;
  const photo = document.createElement('img'); photo.src = KIT.PHOTO; photo.className = 'abs'; capaIn.appendChild(photo);
  Object.assign(photo.style, { width: P.w + 'px', left: (P.cx - P.w / 2) + 'px', top: P.top + 'px', filter: 'contrast(1.06) saturate(1.04) drop-shadow(0 18px 30px rgba(5,40,90,.35))',
    maskImage: P.fade ? pm : 'none', webkitMaskImage: P.fade ? pm : 'none', transformOrigin: '50% 100%' });
  const T = LY.title, center = T.cx != null;
  const title = div(`top:${T.top}px;left:${center ? T.cx : T.left}px;font-size:${T.size}px;color:${TOK.magenta};text-shadow:${ext(T.depth, TOK.azulProfundo)};transform-origin:${center ? '50% 0' : '0 0'}`, '', 'abs dela', capaIn);
  title.innerHTML = [...'JESUS'].map(c => `<span style="display:inline-block;transform-origin:50% 90%">${c}</span>`).join('');
  const tLet = [...title.children];
  const Rm = LY.remix;
  const remix2 = div(`top:${Rm.top}px;left:${Rm.cx ?? Rm.left}px;font-size:${Rm.size}px;text-shadow:${ext(Rm.size * .035, 'rgba(10,79,150,.85)', .6)};padding:0 30px`, 'remix', 'abs script', capaIn);
  const remix2MB = KIT.blur(remix2);
  const S = LY.sign;
  const sign = div(`top:${S.top}px;left:${S.cx ?? S.left}px;font-size:${S.size}px;font-weight:400;letter-spacing:.05em;line-height:1.02;text-align:left`,
    `<span style="display:block;overflow:hidden"><span style="display:inline-block">ANDRÉ<span style="font-weight:700;font-size:.62em;vertical-align:.32em;margin-left:.18em">✕</span></span></span><span style="display:block;overflow:hidden"><span style="display:inline-block">CASTRO</span></span>`, 'abs mono', capaIn);
  const signRows = [...sign.querySelectorAll(':scope > span > span')];
  const rule = LY.rule ? div(`left:${LY.rule[0]}px;top:${LY.rule[1]}px;width:${LY.rule[2]}px;height:3px;background:${TOK.branco};opacity:.9;transform-origin:${center ? '50%' : '0'} 50%`, '', 'abs', capaIn) : null;
  const D = LY.date;
  const dateBox = div(`top:${D.top}px;left:0`, '', 'abs', capaIn);
  const od = KIT.odometer(dateBox, '15.12.2026', { size: D.size, color: TOK.branco, track: -.01 });
  od.cols.forEach(c => c.strip.style.textShadow = ext(D.size * .075, TOK.azulProfundo));
  dateBox.style.left = ((D.cx != null ? D.cx - od.width / 2 : D.left)) + 'px';
  dateBox.style.transformOrigin = `${od.width / 2}px 80%`;
  const plat = LY.plat ? div(`top:${LY.plat.top}px;left:${LY.plat.cx ?? LY.plat.left}px;font-size:${LY.plat.size}px;letter-spacing:.16em;font-weight:400`, 'nas plataformas digitais', 'abs mono', capaIn) : null;
  // posição horizontal dos centrados
  const centerX = (el, cx, sx = 1, sy = 1, extra = '') => el.style.transform = `translateX(-50%) ${extra} scale(${sx},${sy})`;

  /* ── tipografia cinética (reels) ── */
  const kin = div(`width:${W}px;height:${H}px;display:none;overflow:hidden;background:${TOK.azul}`);
  const kinCk = document.createElement('canvas'); kinCk.width = W; kinCk.height = H; kinCk.className = 'abs'; kin.appendChild(kinCk); const kinX = kinCk.getContext('2d');
  const kinWord = div(`left:0;top:0;white-space:nowrap`, '', 'abs', kin);
  const kinSub = div(`left:0;top:0;white-space:nowrap`, '', 'abs', kin);
  const kinMB = KIT.blur(kinWord), kinSubMB = KIT.blur(kinSub);
  const kinOdBox = div(`left:0;top:0`, '', 'abs', kin);
  const kinOd = KIT.odometer(kinOdBox, '15.12.2026', { size: 150, color: TOK.branco });
  kinOd.cols.forEach(c => c.strip.style.textShadow = ext(10, TOK.azulProfundo));

  /* ── overlays ── */
  const wipe = KIT.wipe(stage, W, H, { skew: fmt === 'story' ? .22 : .34 });
  const flash = div(`width:${W}px;height:${H}px;background:#fff;opacity:0;mix-blend-mode:screen`);
  const black = div(`width:${W}px;height:${H}px;background:${TOK.palcoFundo};opacity:0`);
  const vign = div(`width:${W}px;height:${H}px;background:radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(2,14,32,.45) 100%)`);
  const G = KIT.grain(stage, W, H, .55);

  /* ───────── esfera: física por tempo da música ─────────
     bounces = [{t: pouso, h: altura do arco que TERMINA nesse pouso}] em tempo do clipe. */
  function ballState(t, bounces, x0, x1) {
    if (!bounces.length || t < bounces[0].t - bounces[0].fall) return null;
    let i = 0; while (i < bounces.length - 1 && t >= bounces[i].t) i++;
    const b = bounces[i]; let y, vy, squash = 0;
    const prev = i > 0 ? bounces[i - 1].t : b.t - b.fall;
    if (t >= b.t) { y = 0; vy = 0; }
    else if (i === 0) { const u = seg(t, prev, b.t); y = b.h * (1 - u * u); vy = 2 * b.h * u / b.fall; }
    else { const T = b.t - prev, u = (t - prev) / T; y = 4 * b.h * u * (1 - u); vy = Math.abs(4 * b.h * (1 - 2 * u) / T); }
    // squash no contato (último pouso anterior)
    for (const c of bounces) if (t >= c.t && t - c.t < .4) squash = Math.max(squash, wobble(t - c.t, 5, 10) * (c.sq ?? .4));
    const st = clamp(vy / 3200, 0, 1) * .45;                   // stretch ∝ velocidade
    const xk = E.sineInOut(seg(t, bounces[0].t - bounces[0].fall, bounces[bounces.length - 1].t));
    return { x: lerp(x0, x1, xk), y, sy: (1 + st) * (1 - squash), sx: (1 / Math.sqrt(1 + st)) * (1 + squash * .85) };
  }

  const API = {
    ballAt: (t, B) => ballState(t, B.bounces, B.x0, B.x1),
    W, H, fmt, fs, SIZE, word, L, J, stage, W3, LY, od,
    hideAll() { W3.show(false); bg.style.display = halo.style.display = 'none'; art.style.display = capa.style.display = kin.style.display = 'none'; },

    /* mundo 3D: cam {cx,cy,z,rx,ry,rz}, blur de câmera (whip) */
    world(t, { cam, whip = 0, floorGlow = 1, ballOn = null, titleOn = false, titleState = null, remixK = 0, remixBlur = 0, floorTint = .5 }) {
      W3.show(true); bg.style.display = halo.style.display = '';
      W3.set({ cx: W / 2, cy: H * (fmt === 'story' ? .6 : .66), s: fs, ...cam });
      camMB(Math.min(whip, 36), 0); floorMB(Math.min(whip, 36), 0);
      const pulse = CUES.pulse(t, 7);
      let bs = null;
      if (ballOn) bs = ballState(t, ballOn.bounces, ballOn.x0, ballOn.x1);
      W3.drawFloor({ glow: floorGlow * (1 + .25 * pulse), glowR: 1100, tint: floorTint,
        checker: { x: -1700, y: -1500, cw: 220, ch: 220, cols: 16, rows: 14, A: 30, B: 16, lv: 3.4, lu: 2.4, ph: t * CUES.bpm / 60 * .5, ph2: t * .8, color: 'rgba(3,122,244,.45)', uMin: 0, vMin: 0 },
        extra: c => { if (bs) { const k = clamp(1 - bs.y / 700); c.fillStyle = `rgba(2,14,32,${.55 * k})`; c.beginPath(); c.ellipse(bs.x, 0, R0 * (1.2 - .5 * (1 - k)) * bs.sx, R0 * .35, 0, 0, 7); c.fill(); } } });
      halo.style.opacity = .6 + .4 * floorGlow;
      // esfera / morph
      const mo = ballOn && ballOn.morph;   // {t0, dur}
      const mk = mo ? E.expoOut(seg(t, mo.t0, mo.t0 + mo.dur)) : 0;
      if (bs && mk < 1) {
        ball.show(true);
        const jx = J.x0, mp = KIT.morphPath('J', mk, { r: R0, size: SIZE });
        const cx = lerp(bs.x, jx + mp.gx, mk), cy = lerp(-(bs.y + R0 * bs.sy), mp.gy, mk);
        const sx = lerp(bs.sx, 1, mk), sy = lerp(bs.sy, 1, mk);
        // pivô no ponto de contato para o squash (base da esfera)
        ball.tf(`translate3d(${cx}px,${cy}px,0) translateY(${R0 * sy * (1 - mk)}px) scale(${sx},${sy}) translateY(${-R0 * (1 - mk)}px)`);
        for (const r of [ball.ra, ball.rb]) { r.sh.setAttribute('d', mp.d); r.fl.setAttribute('d', mp.d); r.fl.setAttribute('opacity', mk.toFixed(3)); }
      } else ball.show(false);
      // título 3D
      L.forEach((l, i) => {
        const st = titleState ? titleState(i, t) : null;
        if (!titleOn || !st || !st.on) { l.ob.show(false); return; }
        l.ob.show(true);
        l.ob.tf(`translate3d(${l.x0 + (st.dx || 0)}px,${st.dy || 0}px,${st.dz || 0}px) scale(${st.sx ?? 1},${st.sy ?? 1})`);
        KIT.setDepth(l.ob, st.depth ?? 1);
        l.ob.a.style.filter = st.blur > .5 ? `blur(${(st.blur * .25).toFixed(1)}px)` : '';
      });
      // remix (escrito com clip + motion blur)
      if (titleOn && remixK > 0) {
        remix.show(true); remix.tf(`translate3d(${word.width * .12}px,${SIZE * .02}px,40px)`);
        remix.ra.style.clipPath = remix.rb.style.clipPath = `inset(-40% ${100 - 100 * remixK}% -40% 0)`; remixMB(remixBlur, 0);
      } else remix.show(false);
      return bs;
    },

    /* close do artista: focus = ponto da foto (px na imagem 1080×796) no centro do quadro */
    artist(t, { f0, f1, z0, z1, k, light = 1, whip = 0, shift = 0, bgCk = false }) {
      art.style.display = '';
      const f = [lerp(f0[0], f1[0], k), lerp(f0[1], f1[1], k)], z = lerp(z0, z1, k) * (fmt === 'wide' ? 1.25 : fmt === 'story' ? 1.35 : 1);
      artImg.style.transform = `translate(${W / 2 - f[0] * z + shift}px,${H * .46 - f[1] * z}px) scale(${z})`;
      artImg.style.filter = `brightness(${.45 + .55 * light}) contrast(1.08) saturate(${.8 + .2 * light})`;
      artLight.style.background = `radial-gradient(45% 40% at ${50 + 10 * Math.sin(t * .6)}% 30%, rgba(160,210,255,${.35 * light}), rgba(0,0,0,0) 70%)`;
      artMB(Math.min(whip, 36), 0);
    },

    /* layout da capa com estados 0..1 por elemento */
    capa(t, st) {
      capa.style.display = '';
      const pulse = CUES.pulse(t, 8);
      // tabuleiro (loop contínuo, fase = tempo × BPM/60) + pulso no beat
      ckX.clearRect(0, 0, W, H);
      LY.ck.forEach((c, i) => { const inK = st.ck ?? 1; const off = (i ? 1 : -1) * ((1 - inK) * 320 + pulse * 6);
        KIT.drawChecker(ckX, { ...c, x: c.x + off, y: 0, ph: c.ph + t * CUES.bpm / 60 * .35, ph2: c.ph2 + t * .5 }); });
      capaIn.style.transform = `translate(${(st.px || 0)}px,${(st.py || 0)}px) scale(${st.zoom || 1})`;
      capaIn.style.transformOrigin = st.origin || '50% 50%';
      // marcas
      const mk = st.marks ?? 1; mx.style.transform = `rotate(${-90 * (1 - mk)}deg) scale(${mk})`;
      glLines.forEach((e, i) => e.setAttribute('stroke-dashoffset', (1 - clamp(mk * 1.4 - i * .07)).toFixed(3)));
      // foto (revelada por wipe → aqui entra com subida curta)
      const pk = st.photo ?? 1; photo.style.opacity = pk > 0 ? 1 : 0; photo.style.transform = `translateY(${(1 - pk) * 60}px) scale(${.96 + .04 * pk})`;
      // título: letras com squash na entrada
      tLet.forEach((s, i) => { const lk = st.title ? st.title(i) : 1; const w = lk.w || 0;
        s.style.opacity = (lk.k ?? 1) > 0 ? 1 : 0; s.style.transform = `translateY(${(1 - (lk.k ?? 1)) * -220}px) scale(${1 + .18 * w},${1 - .22 * w})`; });
      const tsc = st.titleScale || 1;
      title.style.transform = center ? `translateX(-50%) scale(${.8 * tsc},${1.16 * tsc})` : `scale(${.8 * tsc},${1.16 * tsc})`;
      const rk = st.remix ?? 1;
      remix2.style.clipPath = `inset(-40% ${100 - 100 * rk}% -40% 0)`;
      remix2.style.transform = `translateX(${Rm.cx != null ? -50 : 0}%) rotate(-6deg)`; remix2MB(st.remixBlur || 0, 0);
      const sk = st.sign ?? 1; signRows.forEach((r, i) => r.style.transform = `translateY(${(1 - E.expoOut(clamp(sk * 1.3 - i * .3))) * 105}%)`);
      sign.style.transform = S.cx != null ? 'translateX(-50%)' : 'none';
      if (rule) rule.style.transform = `scaleX(${st.rule ?? 1})`;
      const dk = st.date; dateBox.style.visibility = dk == null ? 'hidden' : 'visible';
      if (dk != null) { od.set(dk.u, dk.du, 2); dateBox.style.transform = `scale(${dk.sx ?? 1},${dk.sy ?? 1})`; }
      if (plat) { const pk2 = st.plat ?? 0; plat.style.clipPath = `inset(0 ${100 - 100 * pk2}% 0 0)`; plat.style.transform = LY.plat.cx != null ? 'translateX(-50%)' : 'none'; }
    },

    /* tipografia cinética: palavra grande com motion blur + squash */
    kinetic(t, { html, cls, size, x, y, dx = 0, dy = 0, blurX = 0, blurY = 0, sx = 1, sy = 1, rot = 0, sub = null, odo = null, bgColor = TOK.azul, ck = true, color = TOK.branco, shadow = '' }) {
      kin.style.display = ''; kin.style.background = bgColor;
      kinX.clearRect(0, 0, W, H);
      if (ck) LY.ck.forEach((c, i) => KIT.drawChecker(kinX, { ...c, ph: c.ph + t * CUES.bpm / 60 * .35, ph2: c.ph2 + t * .5 }));
      if (html != null) {
        kinWord.style.display = ''; kinWord.className = 'abs ' + cls; kinWord.innerHTML = html;
        Object.assign(kinWord.style, { fontSize: size + 'px', color, textShadow: shadow, left: x + 'px', top: y + 'px', transformOrigin: '50% 60%',
          transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) rotate(${rot}deg) scale(${sx},${sy})` });
        kinMB(blurX, blurY);
      } else kinWord.style.display = 'none';
      if (sub) { kinSub.style.display = ''; kinSub.className = 'abs mono'; kinSub.innerHTML = sub.text;
        Object.assign(kinSub.style, { fontSize: sub.size + 'px', letterSpacing: '.16em', left: sub.x + 'px', top: sub.y + 'px', transform: `translate(-50%,-50%) translate(${sub.dx || 0}px,0)`, opacity: sub.o ?? 1 });
        kinSubMB(sub.blur || 0, 0);
      } else kinSub.style.display = 'none';
      if (odo) { kinOdBox.style.display = ''; kinOd.set(odo.u, odo.du, 2);
        kinOdBox.style.left = (odo.x - kinOd.width / 2) + 'px'; kinOdBox.style.top = (odo.y - kinOd.H / 2) + 'px';
        kinOdBox.style.transformOrigin = '50% 80%'; kinOdBox.style.transform = `scale(${odo.sx ?? 1},${odo.sy ?? 1})`;
      } else kinOdBox.style.display = 'none';
    },

    wipes(t, list) {             // list: tempos de CORTE (tela 100% azul); o wipe começa .44 s antes
      for (const c of list) { const t0 = c - wipe.cutTime(0); if (t >= t0 - .01 && t <= c + .4) { wipe.at(t, t0); return; } }
      wipe.at(t, -99);
    },
    fx(t, { flash: f = 0, black: b = 0 }) { flash.style.opacity = f; black.style.opacity = b; G.draw(Math.round(t * 30)); },
  };
  return API;
};
})();
