const D = __DATA__;
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fmt = (v, n = 1) => v.toFixed(n).replace(".", ",");
const say = (el, text) => { if (el.textContent !== text) el.textContent = text; };
const follow = (x, target, dt, sec) => (still.matches ? target : x + (target - x) * (1 - Math.exp(-dt / sec)));

// ---------- laço compartilhado: só anima blocos visíveis ----------
const tiles = [];
let frame = 0, last = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
  let busy = false;
  for (const t of tiles) if (t.visible && t.step(dt)) busy = true;
  frame = busy ? requestAnimationFrame(tick) : 0; if (!busy) last = 0;
}
const run = () => { if (!frame) frame = requestAnimationFrame(tick); };
function register(id, step) {
  const el = document.getElementById(id); const t = { el, step, visible: false }; tiles.push(t);
  new IntersectionObserver((e) => { t.visible = e[e.length - 1].isIntersecting; if (t.visible) run(); }, { rootMargin: "80px 0px" }).observe(el);
  return t;
}
function pointerShare(stage, e) { const b = stage.querySelector("svg").getBoundingClientRect(); return [clamp((e.clientX - b.left) / b.width), clamp((e.clientY - b.top) / b.height), b]; }
function flash(id) { const el = document.getElementById(id); if (!el) return; el.scrollIntoView({ behavior: still.matches ? "auto" : "smooth", block: "center" }); el.setAttribute("data-flash", ""); setTimeout(() => el.removeAttribute("data-flash"), 1400); }

// =====================================================================
// 1. herói: desmontagem com molas escalonadas e reordenação de profundidade
{
  const H = D.hero, root = document.getElementById("camera"), stage = root.querySelector(".stage"), layer = stage.querySelector(".hero-parts");
  const readout = root.querySelector("[data-readout]"), chips = [...root.querySelectorAll(".chip")];
  const nodes = [...layer.querySelectorAll(".it")].map((el) => { const m = el.dataset.m.split(",").map(Number); return { el, piece: el.dataset.piece, inner: el.hasAttribute("data-inner"), key: +el.dataset.k, m, lift: m[0] * H.V[0] + m[1] * H.V[1] + m[2] * H.V[2], shown: "", op: -1 }; });
  let order = nodes.map((_, i) => i);
  const SPRING = { stagger: 0.04, stiffness: 64, damping: 14.2 };
  const ids = [...new Set(nodes.map((n) => n.piece))];
  const sp = Object.fromEntries(ids.map((id) => [id, { x: 0, v: 0, target: 0, pending: null }]));
  let clock = 0, apart = false, selected = null, touring = !still.matches, tourT = 0, idle = 0;
  const TILE = { lente: "lente", foco: "lente", frente: "lente", diafragma: "diafragma", obturador: "obturador", sensor: "sensor", visor: "visor", bateria: "bateria", placa: "placa", dissipador: "placa", cartao: "placa" };
  function setApart(on) {
    if (apart === on) return; apart = on; let i = 0;
    for (const id of on ? H.order : [...H.order].reverse()) { const s = sp[id]; if (!s) continue; const goal = on ? 1 : 0; if (s.target === goal) { s.pending = null; continue; } s.pending = { value: goal, at: clock + (still.matches ? 0 : i++ * SPRING.stagger) }; }
    describe(); run();
  }
  function select(id) {
    if (id === "corpo") id = null; if (selected === id) return; selected = id;
    for (const n of nodes) n.piece === id && id ? n.el.setAttribute("data-on", "") : n.el.removeAttribute("data-on");
    id ? stage.setAttribute("data-focus", "") : stage.removeAttribute("data-focus");
    chips.forEach((c) => (c.dataset.part === id ? c.setAttribute("data-on", "") : c.removeAttribute("data-on")));
    describe();
  }
  function describe() { say(readout, selected ? H.pieces[selected].say : apart ? "desmontada · 12 conjuntos" : "montada · 12 conjuntos"); }
  function place() {
    for (const n of nodes) {
      const s = sp[n.piece].x;
      const tx = (H.EX[0] * n.m[0] + H.EY[0] * n.m[1] + H.EZ[0] * n.m[2]) * s, ty = (H.EX[1] * n.m[0] + H.EY[1] * n.m[1] + H.EZ[1] * n.m[2]) * s;
      const text = s === 0 ? "" : `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`;
      if (text !== n.shown) { n.shown = text; text ? n.el.setAttribute("transform", text) : n.el.removeAttribute("transform"); }
      if (n.inner) { const op = +smooth(0.05, 0.32, s).toFixed(3); if (op !== n.op) { n.op = op; n.el.style.opacity = op; n.el.style.pointerEvents = op < .5 ? "none" : ""; } }
    }
    const next = nodes.map((_, i) => i).sort((a, b) => nodes[a].key + nodes[a].lift * sp[nodes[a].piece].x - (nodes[b].key + nodes[b].lift * sp[nodes[b].piece].x));
    if (next.some((v, i) => v !== order[i])) { const f = document.createDocumentFragment(); for (const i of next) f.appendChild(nodes[i].el); layer.appendChild(f); order = next; }
  }
  register("camera", (dt) => {
    clock += dt; let moving = false;
    if (touring) { tourT += dt; const ph = tourT % 9; setApart(ph > 1.2 && ph < 7.4); const list = H.order.filter((x) => x !== "corpo"); select(ph > 2.6 && ph < 7 ? list[Math.floor((ph - 2.6) / 0.48) % list.length] : null); moving = true; }
    for (const id of ids) {
      const s = sp[id];
      if (s.pending && clock >= s.pending.at) { s.target = s.pending.value; s.pending = null; }
      if (still.matches) { s.x = s.target; s.v = 0; continue; }
      for (let k = 0; k < 4; k++) { const h = dt / 4; s.v += ((s.target - s.x) * SPRING.stiffness - s.v * SPRING.damping) * h; s.x += s.v * h; }
      if (Math.abs(s.target - s.x) < 2e-4 && Math.abs(s.v) < 2e-4) { s.x = s.target; s.v = 0; } else moving = true;
      if (s.pending) moving = true;
    }
    place(); return moving;
  });
  const takeOver = () => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; tourT = 0; run(); }, 8000); };
  stage.addEventListener("pointerenter", () => { takeOver(); setApart(true); });
  stage.addEventListener("pointerleave", () => { takeOver(); select(null); setApart(false); });
  stage.addEventListener("pointerover", (e) => { const it = e.target.closest(".it"); if (it) { takeOver(); select(it.dataset.piece); } });
  stage.addEventListener("click", (e) => { const it = e.target.closest(".it"); takeOver(); if (!apart) { setApart(true); return; } if (it && TILE[it.dataset.piece]) flash(TILE[it.dataset.piece]); });
  stage.addEventListener("keydown", (e) => {
    const list = H.order.filter((x) => x !== "corpo"); let i = list.indexOf(selected);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") i = (i + 1) % list.length; else if (e.key === "ArrowLeft" || e.key === "ArrowUp") i = (i - 1 + list.length) % list.length;
    else if (e.key === "Escape") { takeOver(); select(null); setApart(false); return; } else if (e.key === "Enter" && selected) { flash(TILE[selected]); return; } else return;
    e.preventDefault(); takeOver(); setApart(true); select(list[i]);
  });
  chips.forEach((c) => { c.addEventListener("pointerenter", () => { takeOver(); setApart(true); select(c.dataset.part); }); c.addEventListener("focus", () => { takeOver(); setApart(true); select(c.dataset.part); }); c.addEventListener("click", () => flash(TILE[c.dataset.part])); });
  place(); describe();
}

// =====================================================================
// 2. lente: avanço = f² / (d − f)
{
  const root = document.getElementById("lente"), stage = root.querySelector(".stage"), readout = root.querySelector("[data-readout]");
  const front = root.querySelector(".focus-front"), phases = [...root.querySelectorAll(".focus-ring [data-ph]")];
  const f = 50, EY = D.lens.EY; let s = 0, target = 0, touring = !still.matches, t = 0, idle = 0, shownPh = 0;
  register("lente", (dt) => {
    if (touring) { t += dt; target = 0.5 - 0.5 * Math.cos(t * 0.7); }
    s = follow(s, target, dt, 0.25); if (Math.abs(target - s) < 1e-4) s = target;
    const d = s < 1e-4 ? Infinity : 450 / s; const e = d === Infinity ? 0 : (f * f) / (d - f);
    front.setAttribute("transform", `translate(${(EY[0] * e).toFixed(2)} ${(EY[1] * e).toFixed(2)})`);
    const ph = Math.floor((s * 80) / 0.625) % 8; if (ph !== shownPh) { phases[shownPh].style.display = "none"; phases[ph].style.display = ""; shownPh = ph; }
    say(readout, `foco ${d === Infinity ? "∞" : fmt(d / 1000, 2) + " m"} · avanço ${fmt(e, 2)} mm`);
    return touring || s !== target;
  });
  stage.addEventListener("pointermove", (e) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; run(); }, 5000); target = smooth(0.15, 0.85, pointerShare(stage, e)[0]); run(); });
}

// =====================================================================
// 3. diafragma: sete lâminas; luz ∝ 1/N²
{
  const root = document.getElementById("diafragma"), stage = root.querySelector(".stage"), readout = root.querySelector("[data-readout]"), g = root.querySelector(".iris-blades");
  const STOPS = [1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16];
  const N = 7, R = 20, tanH = Math.tan(Math.PI / N);
  const paths = Array.from({ length: N }, () => { const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); g.appendChild(p); return p; });
  let x = 0, target = 0, touring = !still.matches, t = 0, idle = 0;
  function draw(n) {
    const r = 19.2 * 1.8 / n;
    paths.forEach((p, i) => {
      const a = (i / N) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const pts = [[-r * tanH - 3, r], [R * 1.35, r], [R * 1.45, R * .8], [R * .9, R + 6], [-r * tanH - 6, R + 4]];
      p.setAttribute("d", "M" + pts.map(([u, v]) => `${(u * c - v * s).toFixed(2)} ${(u * s + v * c).toFixed(2)}`).join("L") + "Z");
    });
  }
  register("diafragma", (dt) => {
    if (touring) { t += dt; target = 0.5 - 0.5 * Math.cos(t * 0.6); }
    x = follow(x, target, dt, 0.2); if (Math.abs(target - x) < 1e-4) x = target;
    const idx = x * (STOPS.length - 1), lo = Math.floor(idx), hi = Math.min(STOPS.length - 1, lo + 1);
    const n = STOPS[lo] * Math.pow(STOPS[hi] / STOPS[lo], idx - lo); draw(n);
    const named = STOPS[Math.round(idx)];
    say(readout, `f/${fmt(named, named < 10 && named % 1 ? 1 : 0)} · ${Math.max(1, Math.round(100 * (1.8 / named) ** 2))}% da luz de f/1,8`);
    return touring || x !== target;
  });
  stage.addEventListener("pointermove", (e) => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; run(); }, 5000); target = smooth(0.12, 0.88, pointerShare(stage, e)[0]); run(); });
  draw(1.8);
}

// =====================================================================
// 4. obturador: 1ª cortina abre, 2ª fecha; em alta velocidade, uma fenda
{
  const root = document.getElementById("obturador"), stage = root.querySelector(".stage"), readout = root.querySelector("[data-readout]");
  const g = root.querySelector(".shut-curtains"), glow = root.querySelector(".shut-sensor"), buttons = [...root.querySelectorAll("[data-speed]")];
  const NS = "http://www.w3.org/2000/svg", TAU = 3;          // trânsito das cortinas ≈ 3 ms (ilustrativo; varia conforme o modelo)
  const mk = () => Array.from({ length: 4 }, () => { const r = document.createElementNS(NS, "rect"); r.setAttribute("x", "-1"); r.setAttribute("width", "38"); r.setAttribute("rx", ".4"); g.appendChild(r); return r; });
  const c1 = mk(), c2 = mk();
  let speed = "1/250", T = 4, t = -1, dur = 1, slow = 1, touring = !still.matches, nextAt = 0.6, clockT = 0, idle = 0, hovering = false;
  const msOf = (sp) => 1000 / +sp.split("/")[1];
  function choose(sp) { speed = sp; T = msOf(sp); buttons.forEach((b) => (b.dataset.speed === sp ? b.setAttribute("data-on", "") : b.removeAttribute("data-on"))); }
  function fire() { const total = TAU + T + TAU; slow = Math.round(1.7 / (total / 1000) / 10) * 10; dur = total; t = 0; run(); }
  function lay(rs, a, b) { // cortina cobrindo [a, b] (mm, 0 = topo da janela)
    const h = Math.max(b - a, 0), each = h / 4;
    rs.forEach((r, i) => { const y = a + i * each - .3, hh = Math.max(each + .6, .9); r.setAttribute("y", y.toFixed(2)); r.setAttribute("height", hh.toFixed(2)); r.style.display = h < .05 ? "none" : ""; });
  }
  function pose(ms) { // estado no tempo real (ms) desde o disparo
    const p1 = 24 * clamp(ms / TAU), p2 = 24 * clamp((ms - T) / TAU);
    lay(c1, p1, 24 + 1); lay(c2, -1, p2);
    const open = Math.max(0, p1 - p2) / 24; glow.setAttribute("opacity", (.18 + .75 * open).toFixed(3));
    return { p1, p2 };
  }
  register("obturador", (dt) => {
    clockT += dt;
    if ((touring || hovering) && t < 0 && clockT > nextAt) { if (touring) choose(["1/1000", "1/250", "1/30"][Math.floor(clockT / 3.2) % 3]); fire(); }
    if (t >= 0) {
      t += dt; const ms = (t / 1.9) * (dur + TAU * .5);
      const { p1, p2 } = pose(Math.min(ms, dur));
      const slit = T < TAU ? `fenda de ${fmt(24 * T / TAU, 0)} mm` : "janela toda aberta";
      say(readout, `${speed} s · ${slit} · câmera lenta ×${slow}`);
      if (t > 2.6) { t = -1; nextAt = clockT + .8; lay(c1, 0, 25); lay(c2, -1, 0); glow.setAttribute("opacity", ".18"); }
      return true;
    }
    return touring || hovering;
  });
  buttons.forEach((b) => b.addEventListener("click", () => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; run(); }, 8000); choose(b.dataset.speed); fire(); }));
  stage.addEventListener("pointerenter", () => { touring = false; hovering = true; if (t < 0) fire(); });
  stage.addEventListener("pointerleave", () => { hovering = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; run(); }, 6000); });
  stage.addEventListener("click", () => { touring = false; if (t < 0) fire(); });
  lay(c1, 0, 25); lay(c2, -1, 0); choose("1/250");
}

// =====================================================================
// 5. visor eletrônico
{
  const root = document.getElementById("visor"), stage = root.querySelector(".stage"), readout = root.querySelector("[data-readout]");
  const hud = root.querySelector(".evf-hud"), sun = root.querySelector(".evf-sun");
  let on = 0, target = 0, t = 0, hover = false, touring = !still.matches;
  register("visor", (dt) => {
    t += dt; if (touring) target = (t % 6) > 3 ? 1 : 0;
    on = follow(on, target, dt, .18); hud.setAttribute("opacity", on.toFixed(3));
    sun.setAttribute("cy", (13 + Math.sin(t * .4) * 1.2).toFixed(2));
    say(readout, on > .5 ? "HUD ligado · exposição sobre a imagem ao vivo" : "micro-OLED · imagem ao vivo do sensor");
    return !still.matches;
  });
  stage.addEventListener("pointerenter", () => { touring = false; target = 1; hover = true; run(); });
  stage.addEventListener("pointerleave", () => { target = 0; hover = false; run(); });
  void hover;
}

// =====================================================================
// 6. sensor: o ponteiro é um feixe de luz
{
  const S = D.sensor, root = document.getElementById("sensor"), stage = root.querySelector(".stage"), readout = root.querySelector("[data-readout]");
  const cells = [...root.querySelectorAll(".px")].map((el) => ({ el, top: el.querySelector(".px-top"), c: el.dataset.c, x: +el.dataset.x, y: +el.dataset.y, b: 0, shown: -1 }));
  const NAME = { R: "vermelho", G: "verde", B: "azul" };
  let spot = [0, 0], target = [0, 0], touring = !still.matches, t = 0, idle = 0, active = 0, aTarget = 1;
  const det = S.ex[0] * S.ey[1] - S.ex[1] * S.ey[0];
  const toWorld = (sx, sy) => { const dx = sx - S.o[0], dy = sy - S.o[1]; return [(dx * S.ey[1] - dy * S.ey[0]) / det, (S.ex[0] * dy - S.ex[1] * dx) / det]; };
  register("sensor", (dt) => {
    if (touring) { t += dt; target = [Math.sin(t * .55) * S.gw * .38, Math.sin(t * .9) * S.gd * .32]; aTarget = 1; }
    spot = [follow(spot[0], target[0], dt, .12), follow(spot[1], target[1], dt, .12)]; active = follow(active, aTarget, dt, .3);
    let best = null, bd = 1e9;
    for (const c of cells) {
      const cx = -S.gw / 2 + (c.x + .5) * S.PX, cy = -S.gd / 2 + (c.y + .5) * S.PX, d2 = (cx - spot[0]) ** 2 + (cy - spot[1]) ** 2;
      const want = active * Math.exp(-d2 / (2 * 11 * 11)); c.b = follow(c.b, want, dt, want > c.b ? .08 : .5);
      const op = +(.22 + .78 * c.b).toFixed(2); if (op !== c.shown) { c.shown = op; c.top.setAttribute("opacity", op); }
      if (d2 < bd) { bd = d2; best = c; }
    }
    if (best && active > .2) say(readout, `pixel (${best.x + 1}, ${best.y + 1}) · filtro ${NAME[best.c]} · carga ${Math.round(best.b * 100)}%`);
    else say(readout, "50% verde · 25% vermelho · 25% azul");
    return true;
  });
  stage.addEventListener("pointermove", (e) => {
    touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; run(); }, 5000);
    const [, , b] = pointerShare(stage, e); const svg = stage.querySelector("svg"); const vb = svg.viewBox.baseVal;
    target = toWorld(((e.clientX - b.left) / b.width) * vb.width, ((e.clientY - b.top) / b.height) * vb.height); aTarget = 1; run();
  });
  stage.addEventListener("pointerleave", () => { aTarget = 0; });
}

// =====================================================================
// 7. placa: pipeline do processador
{
  const root = document.getElementById("placa"), stage = root.querySelector(".stage"), readout = root.querySelector("[data-readout]");
  const flow = root.querySelector(".flow"), lines = [...flow.querySelectorAll(".iso-line")], proc = root.querySelector(".proc"), card = root.querySelector(".card");
  const STEPS = ["1 · leitura dos pixels", "2 · conversão A/D", "3 · demosaico: cores reconstruídas", "4 · redução de ruído", "5 · tons e balanço de branco", "6 · compressão → gravação no cartão"];
  const EX = D.board.EX; let on = false, touring = !still.matches, t = 0, phase = 0, cardX = 0, idle = 0;
  register("placa", (dt) => {
    if (touring) { t += dt; on = (t % 9) < 6.5; }
    if (on) phase += dt; else phase = 0;
    flow.toggleAttribute("data-on", on);
    lines.forEach((l, i) => l.style.strokeDashoffset = (-(phase * 26) - i * 3).toFixed(1));
    const step = Math.min(STEPS.length - 1, Math.floor(phase / .85));
    say(readout, on ? STEPS[step] : "em espera");
    proc.style.opacity = on ? (.75 + .25 * Math.sin(phase * 8)).toFixed(3) : "1";
    cardX = follow(cardX, on && step === 5 ? 1 : 0, dt, .25);
    card.setAttribute("transform", `translate(${(EX[0] * 16 * cardX).toFixed(2)} ${(EX[1] * 16 * cardX).toFixed(2)})`);
    if (on && phase > 6.6 && !touring) phase = 0;
    return touring || on || cardX > .001;
  });
  stage.addEventListener("pointerenter", () => { touring = false; on = true; phase = 0; run(); });
  stage.addEventListener("pointerleave", () => { on = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; run(); }, 6000); run(); });
}

// =====================================================================
// 8. bateria: 16,4 Wh
{
  const root = document.getElementById("bateria"), stage = root.querySelector(".stage"), readout = root.querySelector("[data-readout]");
  const segs = [...root.querySelectorAll(".bat-seg")].sort((a, b) => a.dataset.i - b.dataset.i);
  let q = 1, mode = 0, touring = !still.matches, t = 0, idle = 0;
  register("bateria", (dt) => {
    if (touring) { t += dt; mode = (t % 10) < 6 ? -1 : 1; }
    q = clamp(q + mode * dt * (mode < 0 ? .09 : .14));
    segs.forEach((s, i) => { const lit = q * 8 - i; s.setAttribute("opacity", (.12 + .73 * clamp(lit)).toFixed(2)); s.style.fill = q < .2 ? "var(--anatomy-red)" : "var(--anatomy-lit)"; });
    say(readout, `${Math.round(q * 100)}% · ${fmt(16.4 * q)} Wh${mode < 0 ? " · fotografando" : mode > 0 && q < 1 ? " · carregando" : ""}`);
    return touring || (mode < 0 && q > 0) || (mode > 0 && q < 1);
  });
  stage.addEventListener("pointerenter", () => { touring = false; mode = -1; run(); });
  stage.addEventListener("pointerleave", () => { mode = 1; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; run(); }, 6000); run(); });
}

document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => flash(b.dataset.go)));
