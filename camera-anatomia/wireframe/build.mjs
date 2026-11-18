// Anatomia de uma câmera — Bento grid interativo, desenhado com a skill anatomy (kit isométrico).
// node build.mjs  → index.html
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = join(HERE, "../../.agents/skills/anatomy");
const k = await import(join(SKILL, "kit/iso-kit.mjs"));
const G = await import(join(SKILL, "kit/lathe.mjs"));
const { kitScript } = await import(join(SKILL, "scripts/inline-kit.mjs"));

const DEG = Math.PI / 180;
const r2 = (n) => Math.round(n * 100) / 100;
function kitFor(P) {
  return {
    P, at: (p) => k.iso(p, P), V: G.viewOf(P),
    S: (paths, st) => k.solidSvg(paths, st), L: (d, st) => k.lineSvg(d, st), D: (pts, st) => k.dotsSvg(pts, st),
    // matriz que leva coordenadas locais (u, v) de um plano 3D para a tela
    face(o, u, v) { const O = k.iso(o, P), a = k.axisVector(P, u), b = k.axisVector(P, v); return `matrix(${[a[0], a[1], b[0], b[1], O[0], O[1]].map((n) => +n.toFixed(4)).join(" ")})`; },
    vec: (v) => k.axisVector(P, v).map(r2),
  };
}

// cota técnica isométrica: linhas de chamada, linha de cota com traços a 45° e texto alinhado
function dimSvg(T, a, b, off, label) {
  const add = (p, o, k = 1) => p.map((v, i) => v + o[i] * k);
  const A = T.at(add(a, off, .12)), B = T.at(add(b, off, .12)), PA = T.at(add(a, off)), PB = T.at(add(b, off)), XA = T.at(add(a, off, 1.12)), XB = T.at(add(b, off, 1.12));
  const ang = Math.atan2(PB[1] - PA[1], PB[0] - PA[0]); let deg = ang * 180 / Math.PI; if (deg > 90) deg -= 180; if (deg < -90) deg += 180;
  const f = (P) => P.map((v) => v.toFixed(1)).join(" ");
  const tick = (P) => { const c = Math.cos(ang + Math.PI / 4) * 2.6, s = Math.sin(ang + Math.PI / 4) * 2.6; return `M${(P[0] - c).toFixed(1)} ${(P[1] - s).toFixed(1)}L${(P[0] + c).toFixed(1)} ${(P[1] + s).toFixed(1)}`; };
  const mx = (PA[0] + PB[0]) / 2, my = (PA[1] + PB[1]) / 2;
  return `<g class="dim"><path class="dim-ext" d="M${f(A)}L${f(XA)}M${f(B)}L${f(XB)}"/><path class="dim-line" d="M${f(PA)}L${f(PB)}${tick(PA)}${tick(PB)}"/><text transform="translate(${mx.toFixed(1)} ${my.toFixed(1)}) rotate(${deg.toFixed(1)})" y="-3.2" text-anchor="middle">${label}</text></g>`;
}
const dims = (T, list) => `<g class="dims">${list.map((d) => dimSvg(T, ...d)).join("")}</g>`;
// placa-base sobre pés, com ranhura, parafusos e régua (vocabulário da skill)
function basePlate(T, plan, h = 7, { ruler = true } = {}) {
  const { P, S, L, D, at } = T; const out = [`<path class="iso-halo" d="${k.haloOf(plan, -h - 4, h, P)}"/>`];
  for (const [x, y] of k.corners(plan, 14)) { out.push(S(k.cylinder(x, y, 5.5, -h - 4, 1.4, P, 24), { tone: "lo" }), S(k.cylinder(x, y, 4.2, -h - 2.6, 2.6, P, 24), { tone: "mid" })); }
  out.push(S(k.slabOf(plan, -h, h, P, 8, 1.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 5), 0, P), { tone: "lo" }));
  const sc = k.corners(plan, 9); out.push(L(sc.map(([x, y]) => k.ring(x, y, 1.8, 0, P, 14)).join(""), { tone: "lo" }), D(sc.map((p) => at([p[0], p[1], 0])), { size: 0.45 }));
  if (ruler) {
    const strip = { x: plan.x + 18, y: plan.y + plan.d - 13, w: plan.w - 36, d: 6, r: 1 };
    out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
    const t = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }), D([at([strip.x + 1.6, strip.y + 3, 0.6]), at([strip.x + strip.w - 1.6, strip.y + 3, 0.6])], { size: 0.4 }));
  }
  return out.join("");
}
const fig = (w, h, label, body, cls = "") => k.figureSvg({ width: w, height: h, label, body, className: cls });

// =====================================================================
// 1. HERÓI — câmera completa, desmonta passando o mouse
// eixo óptico = +x; corpo: x −20..20 (frente em x=20), y −62..62, z 0..66
function hero() {
  const W = 760, H = 520;
  const AXY = 4, AXZ = 31;
  const PIECES = {
    corpo: { name: "Corpo", say: "corpo · chassi de magnésio que segura tudo alinhado", move: [0, 0, 0] },
    lente: { name: "Lente", say: "lente 50 mm f/1.8 · forma a imagem sobre o sensor", move: [96, 0, 0] },
    foco: { name: "Anel de foco", say: "anel de foco · gira e desloca o grupo óptico", move: [124, 0, 0] },
    diafragma: { name: "Diafragma", say: "diafragma · lâminas que controlam a abertura", move: [110, 0, 0] },
    frente: { name: "Elementos ópticos", say: "grupo frontal · vidros que fazem a luz convergir", move: [150, 0, 0] },
    obturador: { name: "Obturador", say: "obturador · duas cortinas definem o tempo de exposição", move: [-74, 0, 0] },
    sensor: { name: "Sensor", say: "sensor · 36 × 24 mm convertendo luz em carga", move: [-112, 0, 0] },
    dissipador: { name: "Dissipador", say: "dissipador · tira o calor do sensor e do processador", move: [-146, 0, 0] },
    placa: { name: "Placa principal", say: "placa principal · processador de imagem e memória", move: [-186, 0, 0] },
    visor: { name: "Visor eletrônico", say: "visor eletrônico · micro-OLED com ocular", move: [0, 0, 64] },
    bateria: { name: "Bateria", say: "bateria · íon-lítio, 7,2 V", move: [0, 0, -86] },
    cartao: { name: "Cartão", say: "cartão de memória · onde o arquivo é gravado", move: [0, 52, 0] },
  };
  const INNER = new Set(["obturador", "sensor", "dissipador", "placa", "visor", "bateria", "cartao", "diafragma"]);
  const pts = [[-206, -62, 0], [-206, 62, 66], [230, -40, 70], [230, 50, 0], [0, -62, -92], [0, 62, 150], [20, 110, 40]];
  const P = k.fitProjection(pts, W, H, { pad: 28, azimuth: 28, elevation: 26 });
  const T = kitFor(P); const { S, L, D, at, V } = T;
  const items = [];
  const put = (piece, ref, svg, bias = 0) => items.push({ piece, key: k.depthOf(ref, P) + bias, svg });
  const FL = (s) => G.frameOf([23 + s, AXY, AXZ], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const F = FL(0);
  // corpo
  {
    const out = [];
    out.push(S(k.slabOf({ x: -20, y: -62, w: 40, d: 124, r: 5 }, 0, 64, P, 8, 1.2), { tone: "mid", inner: L(k.sideSeam({ x: -20, y: -62, w: 40, d: 124, r: 5 }, 52, P, 8), { tone: "faint" }) }));
    out.push(S(k.slabOf({ x: -21, y: -61, w: 42, d: 122, r: 4 }, 64, 3, P, 6, 0.6), { tone: "mid" }));
    out.push(S(k.slabOf({ x: -18, y: -14, w: 34, d: 36, r: 5 }, 67, 13, P, 6, 0.8), { tone: "mid" }));
    out.push(S(k.slabOf({ x: -10, y: -6, w: 18, d: 20, r: 1 }, 80, 1.6, P, 3, 0.3), { tone: "hi" }));
    out.push(L(k.planOutline({ x: -7, y: -3, w: 12, d: 14, r: .5 }, 81.6, P, 2), { tone: "lo" }));
    // seletor de modo e disco traseiro
    for (const [x, y, r, h] of [[-4, -36, 9, 6], [-12, 40, 7, 4]]) {
      out.push(S(k.cylinder(x, y, r, 67, h, P, 48, 0.5), { tone: "hi" }), L(k.knurl(x, y, r, 67.4, 67 + h - .6, 44, P, .3), { tone: "lo" }), L(k.ring(x, y, r - 2.4, 67 + h, P, 32), { tone: "lo" }));
    }
    out.push(L(k.lineOnTop([-4, -36], [-4 + 6, -36], 73, P), { tone: "hi" }), D([at([-4, -36, 73])], { size: .5, tone: "hi" }));
    out.push(S(k.cylinder(-6, 18, 3, 67, 1.6, P, 24), { tone: "mid" }), S(k.cylinder(-6, 18, 2, 68.6, .8, P, 20), { tone: "hi" }));
    out.push(D([at([-6, 18, 69.4])], { size: .7, tone: "hi" }));
    out.push(S(k.slabOf({ x: -3, y: 62, w: 8, d: 3, r: 1.5 }, 46, 9, P, 4), { tone: "mid" }));          // alça
    out.push(S(k.slabOf({ x: -3, y: -65, w: 8, d: 3, r: 1.5 }, 46, 9, P, 4), { tone: "mid" }));
    // porta do cartão na lateral +y
    const door = T.face([-15, 62.05, 46], [1, 0, 0], [0, 0, -1]);
    out.push(`<g transform="${door}"><rect x="0" y="0" width="30" height="36" rx="2.5" class="iso-line" data-tone="lo" style="fill:none"/><rect x="3" y="31" width="10" height="2" rx="1" class="iso-line" data-tone="faint" style="fill:none"/></g>`);
    put("corpo", [0, 0, 33], out.join(""));
    // empunhadura (frente, lado −y)
    put("corpo", [26, -49, 31], S(k.slabOf({ x: 14, y: -62, w: 22, d: 27, r: 9 }, 0, 62, P, 10, 1.2), { tone: "mid" }) + L(k.sideSeam({ x: 14, y: -62, w: 22, d: 27, r: 9 }, 8, P, 10), { tone: "faint" }), 2);
    put("corpo", [26, -49, 63], S(k.cylinder(26, -49, 6.4, 62, 1.6, P, 32), { tone: "mid" }) + S(k.cylinder(26, -49, 4.6, 63.6, 2.4, P, 32, .4), { tone: "hi" }), 3);
    // baioneta e garganta na face frontal (x = 20)
    const throat = G.circleOf(G.frameOf([20.05, AXY, AXZ], [1, 0, 0], [0, 1, 0], [0, 0, 1]), 0, 22, P);
    put("corpo", [21, AXY, AXZ], `<path d="${throat}" style="fill:var(--anatomy-shade-0)"/>` + S(G.ringBand(0, 3, 22, 29.5, G.frameOf([20, AXY, AXZ], [1, 0, 0], [0, 1, 0], [0, 0, 1]), P), { tone: "hi" })
      + D(G.dotsOf(G.frameOf([20, AXY, AXZ], [1, 0, 0], [0, 1, 0], [0, 0, 1]), 3, 26, 4, P, { all: true, phase: 45 * DEG }), { size: .55, tone: "mid" }), 4);
    put("corpo", [21, 40, 13], S(G.disc(0, 2.4, 3.4, G.frameOf([20, 40, 13], [1, 0, 0], [0, 1, 0], [0, 0, 1]), P), { tone: "hi" }), 4);
    put("corpo", [21, AXY, 60], D([at([20.2, AXY, 62])], { size: .9, tone: "hi" }), 4);
  }
  // lente: barril traseiro + baioneta
  put("lente", [23 + 10, AXY, AXZ], S(G.ringBand(-3, 0, 21, 27.5, F, P), { tone: "hi" }) + S(G.solidOf([[0, 29], [2, 30.5], [18, 30.5], [19.5, 29.5]], F, P), { tone: "mid", inner: L(G.arcOf(F, 9, 30.5, P), { tone: "faint" }) })
    + D([at(G.pointOf(F, 10, 30.6, 90 * DEG))], { size: .8, tone: "hi" }), 0);
  // diafragma (dentro, aparece ao desmontar)
  put("diafragma", [23 + 21, AXY, AXZ], S(G.ringBand(19.6, 22.4, 12, 27, F, P), { tone: "hi" }) + `<path d="${G.circleOf(F, 22.45, 12, P)}" style="fill:var(--anatomy-lit);opacity:.85"/>`, 0);
  // anel de foco (serrilhado)
  put("foco", [23 + 32, AXY, AXZ], S(G.solidOf([[23, 32], [42, 32]], F, P), { tone: "mid", inner: k.fadedSvg(G.ribsOf(F, 23.6, 41.4, 32, 96, P, { fade: [0.04, 0.42], seams: true }), { tone: "lo" }) }), 0);
  // grupo frontal com vidro
  {
    const glass = G.solidOf([[58, 21.5], [59.4, 16, 1], [60.4, 0]], F, P);
    put("frente", [23 + 52, AXY, AXZ], S(G.solidOf([[43, 30.5], [57, 31], [58.5, 30], [58.5, 22]], F, P), { tone: "mid", inner: L(G.arcOf(F, 50, 31, P), { tone: "faint" }) })
      + `<path d="${G.circleOf(F, 58.5, 26, P)}" class="iso-line" data-tone="lo"/>` + S(glass, { tone: "lo" })
      + `<path d="${G.arcOf(F, 59.6, 12, P, { from: 200 * DEG, to: 260 * DEG, least: -1 })}" class="iso-line" data-tone="hi" data-free="true"/>`, 0);
  }
  // internos
  {
    const box = (piece, plan, z, h, tone, extra = "", bias = 0) => put(piece, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, 3, .5), { tone }) + extra, bias);
    const fx = (x, ...a) => T.face([x, ...a[0]], [0, -1, 0], [0, 0, -1]);
    // obturador: moldura com janela 36 × 24
    box("obturador", { x: 6, y: -28, w: 5, d: 62, r: 1.5 }, 6, 50, "hi", `<g transform="${fx(11.05, [AXY + 18, AXZ + 12])}"><rect x="0" y="0" width="36" height="24" rx="1" style="fill:var(--anatomy-shade-0)" class="iso-line" data-tone="mid"/>${[0, 1, 2, 3].map((i) => `<path class="iso-line" data-tone="lo" d="M0 ${i * 6 + 3}H36"/>`).join("")}</g>`);
    box("obturador", { x: 2, y: 36, w: 9, d: 9, r: 4 }, 32, 18, "mid", "", 1);
    // sensor
    box("sensor", { x: -2, y: -30, w: 4, d: 64, r: 2 }, 4, 54, "hi", `<g transform="${fx(2.05, [AXY + 22, AXZ + 16])}"><rect x="0" y="0" width="44" height="32" rx="1.5" style="fill:var(--anatomy-shade-3)" class="iso-line" data-tone="mid"/><rect x="4" y="4" width="36" height="24" style="fill:var(--anatomy-red);opacity:.85"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${4 + i * 4.5} 4V28" stroke="#000" stroke-opacity=".25" stroke-width=".4"/>`).join("")}</g>`);
    // dissipador: base + aletas
    box("dissipador", { x: -6, y: -26, w: 2.4, d: 56, r: 1 }, 8, 46, "mid");
    for (let i = 0; i < 8; i++) box("dissipador", { x: -16, y: -24 + i * 7, w: 10, d: 1.6, r: .4 }, 10, 42, "hi", "", .1 + i * .01);
    // placa principal (vertical) com chips na face +x
    box("placa", { x: -12, y: -56, w: 2, d: 112, r: 2 }, 4, 56, "mid", `<g transform="${fx(-9.95, [56, 60])}">${[[8, 8, 18, 12], [34, 10, 14, 14], [56, 20, 20, 20], [86, 8, 14, 10], [86, 30, 18, 12], [10, 34, 22, 10]].map(([x, y, w, h], i) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" class="iso-line" data-tone="${i === 2 ? "red" : "lo"}" style="fill:var(--anatomy-shade-${i === 2 ? 3 : 1})"/>`).join("")}<text x="66" y="32" class="iso-face-text" font-size="3.2" text-anchor="middle" data-tone="hi">IMAGE PROC</text>${Array.from({ length: 12 }, (_, i) => `<path class="iso-line" data-tone="faint" d="M${4 + i * 9} 52V46H${8 + i * 9}"/>`).join("")}</g>`);
    // visor eletrônico (no capô)
    box("visor", { x: -14, y: -10, w: 26, d: 26, r: 3 }, 66, 12, "hi", "");
    put("visor", [14, 3, 72], S(G.disc(0, 6, 7, G.frameOf([12, 3, 72], [1, 0, 0], [0, 1, 0], [0, 0, 1]), P), { tone: "mid" }) + `<path d="${G.circleOf(G.frameOf([12, 3, 72], [1, 0, 0], [0, 1, 0], [0, 0, 1]), 6.05, 5, P)}" style="fill:var(--anatomy-shade-0)" class="iso-line" data-tone="lo"/>`, 1);
    // bateria (na empunhadura)
    box("bateria", { x: 14, y: -58, w: 18, d: 20, r: 3 }, 4, 54, "hi", `<g transform="${T.face([32.05, -40, 50], [0, -1, 0], [0, 0, -1])}"></g>` + L(k.sideSeam({ x: 14, y: -58, w: 18, d: 20, r: 3 }, 46, P, 3), { tone: "lo" }));
    // cartão
    box("cartao", { x: -12, y: 56, w: 24, d: 2.1, r: 1 }, 10, 32, "hi", L(k.planOutline({ x: -9, y: 56.4, w: 6, d: 1.2, r: .2 }, 42, P, 2), { tone: "lo" }));
  }
  const ORDER = ["frente", "foco", "diafragma", "lente", "cartao", "visor", "bateria", "obturador", "sensor", "dissipador", "placa", "corpo"];
  items.sort((a, b) => a.key - b.key);
  const groups = items.map((it) => { const m = PIECES[it.piece].move; return `<g class="it" data-piece="${it.piece}"${INNER.has(it.piece) ? " data-inner" : ""} data-k="${it.key.toFixed(2)}" data-m="${m.join(",")}">${it.svg}</g>`; }).join("");
  const halo = `<path class="iso-halo" d="${k.haloOf({ x: -40, y: -70, w: 90, d: 140, r: 30 }, -96, 1, P)}" style="filter:blur(10px)"/>`;
  const hd = dims(T, [[[20, -62, 0], [20, 62, 0], [0, 0, -16], '124 mm'], [[20, 62, 0], [20, 62, 64], [0, 16, 0], '64 mm'], [[-20, 62, 81.6], [20, 62, 81.6], [0, 16, 0], '40 mm']]);
  const svg = fig(W, H, "Câmera sem espelho genérica com lente 50 mm. Passe o mouse para desmontá-la: a lente sai para a frente, o visor sobe, a bateria desce e o obturador, o sensor, o dissipador e a placa saem por trás.", `${halo}<g class="hero-parts">${groups}</g>${hd}`);
  const data = { V, EX: T.vec([1, 0, 0]), EY: T.vec([0, 1, 0]), EZ: T.vec([0, 0, 1]), pieces: Object.fromEntries(Object.entries(PIECES).map(([id, p]) => [id, { name: p.name, say: p.say }])), order: ORDER };
  return { svg, data, PIECES };
}

// =====================================================================
// 2. LENTE — foco: o anel gira e o grupo frontal avança f²/(d − f)
function lens() {
  const W = 360, H = 270;
  const plan = { x: -48, y: -14, w: 96, d: 104, r: 8 };
  const P = k.fitProjection([...k.boxCorners(plan, -11, 0), [0, 96, 76], [0, -6, 76], [40, 40, 76], [-40, 40, 76]], W, H, { pad: 18, azimuth: 52, elevation: 28 });
  const T = kitFor(P); const { S, L, D, at } = T;
  const F = G.frameOf([0, 4, 40], [0, 1, 0], [-1, 0, 0], [0, 0, 1]);
  const out = [basePlate(T, plan)];
  for (const s of [8, 34]) { const pl = { x: -14, y: 4 + s - 4, w: 28, d: 8, r: 1.5 }; out.push(S(k.slabOf(pl, 0, 9, P, 3, .5), { tone: "mid" })); out.push(D([at([-10, 4 + s, 9]), at([10, 4 + s, 9])], { size: .45 })); }
  out.push(S(G.ringBand(-3, 0, 21, 27.5, F, P), { tone: "mid" }));
  out.push(S(G.solidOf([[0, 29], [2, 30.5], [18, 30.5], [19.5, 29.5]], F, P), { tone: "mid", inner: L(G.arcOf(F, 9, 30.5, P), { tone: "faint" }) }));
  // escala de distância gravada no barril traseiro (topo)
  const marks = [["∞", 0], ["3", .08], ["1,5", .18], ["1", .3], ["0,7", .5], ["0,45", 1]];
  out.push(`<g class="lens-scale">${marks.map(([t, f]) => { const a = (90 - 40 + f * 80) * DEG; const p = G.pointOf(F, 16.5, 30.6, a); return `<text class="iso-face-text" data-tone="lo" font-size="3.4" text-anchor="middle" x="${r2(k.iso(p, P)[0])}" y="${r2(k.iso(p, P)[1])}">${t}</text>`; }).join("")}</g>`);
  out.push(D([at(G.pointOf(F, 19.8, 30.6, 90 * DEG))], { size: .9, tone: "hi" }));
  // anel de foco: 8 fases do serrilhado, trocadas ao girar
  const ringPaths = G.solidOf([[21, 32], [40, 32]], F, P);
  const phases = Array.from({ length: 8 }, (_, i) => k.fadedSvg(G.ribsOf(F, 21.6, 39.4, 32, 72, P, { fade: [0.04, 0.42], seams: true, phase: (i / 8) * (2 * Math.PI / 72) }), { tone: "lo" }));
  out.push(`<g class="focus-ring">${S(ringPaths, { tone: "hi", lit: true })}${phases.map((p, i) => `<g data-ph="${i}"${i ? ' style="display:none"' : ""}>${p}</g>`).join("")}</g>`);
  // grupo frontal móvel
  const front = S(G.solidOf([[41, 30.5], [56, 31], [57.5, 30], [57.5, 22]], F, P), { tone: "mid", inner: L(G.arcOf(F, 49, 31, P), { tone: "faint" }) })
    + `<path d="${G.circleOf(F, 57.5, 26, P)}" class="iso-line" data-tone="lo"/>` + S(G.solidOf([[57, 21.5], [58.6, 16, 1], [59.6, 0]], F, P), { tone: "lo" })
    + `<path d="${G.arcOf(F, 58.8, 12, P, { from: 200 * DEG, to: 260 * DEG, least: -1 })}" class="iso-line" data-tone="hi" data-free="true"/>`
    + `<g transform="${T.face(G.pointOf(F, 57.55, 0, 0), [-1, 0, 0], [0, 0, -1])}"><text class="iso-face-text" data-tone="lo" font-size="3.2" text-anchor="middle" y="-23.5">50 mm  1:1.8</text></g>`;
  out.push(`<g class="focus-front">${front}</g>`);
  out.push(dims(T, [[[0, 1, 72], [0, 63.6, 72], [0, 0, 12], '62 mm'], [[0, 63.6, 8], [0, 63.6, 72], [40, 0, 0], '⌀ 64 mm']]));
  return { svg: fig(W, H, "Lente 50 mm f/1.8 sobre dois berços em V. Girar o anel de foco avança o grupo frontal: para focar a 45 cm ele anda 6,25 mm.", out.join("")), data: { EY: T.vec([0, 1, 0]) } };
}

// =====================================================================
// 3. DIAFRAGMA — lâminas no plano da face, f/1.8 → f/16
function iris() {
  const W = 360, H = 270;
  const plan = { x: -46, y: -30, w: 92, d: 70, r: 8 };
  const P = k.fitProjection([...k.boxCorners(plan, -11, 0), [0, 0, 84], [-38, 0, 84], [38, 0, 84]], W, H, { pad: 18, azimuth: 62, elevation: 20 });
  const T = kitFor(P); const { S, L, D, at } = T;
  const C = [0, 6, 42]; const F = G.frameOf(C, [0, 1, 0], [-1, 0, 0], [0, 0, 1]);
  const out = [basePlate(T, plan)];
  out.push(S(k.slabOf({ x: -10, y: -6, w: 20, d: 14, r: 1.5 }, 0, 8, P, 3, .5), { tone: "mid" }));
  out.push(S(G.solidOf([[-6, 34], [0, 34]], F, P), { tone: "mid" }));
  out.push(S(G.ringBand(0, 2, 20, 34, F, P), { tone: "hi" }));
  out.push(D(G.dotsOf(F, 2, 30.5, 6, P, { all: true, phase: 30 * DEG }), { size: .5, tone: "mid" }));
  // atuador (motor de passo) no topo e alavanca
  out.push(S(G.disc(-5, 5, 6, G.frameOf([0, 1, 81], [0, 1, 0], [-1, 0, 0], [0, 0, 1]), P), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -3, y: -2, w: 6, d: 6, r: 1 }, 75, 2.5, P, 2), { tone: "lo" }));
  const M = T.face([C[0], C[1] + 2.05, C[2]], [-1, 0, 0], [0, 0, -1]);
  const holes = `<clipPath id="irisClip"><circle cx="0" cy="0" r="20"/></clipPath>`;
  out.push(`<defs>${holes}</defs><g transform="${M}"><circle r="20" style="fill:var(--anatomy-lit);opacity:.9"/><g clip-path="url(#irisClip)" class="iris-blades"></g><circle r="20" class="iso-line" data-tone="hi" style="fill:none"/></g>`);
  out.push(dims(T, [[[0, 8, 8], [0, 8, 76], [44, 0, 0], '⌀ 68 mm'], [[-34, 8, 0], [34, 8, 0], [0, 18, 0], '68 mm']]));
  return { svg: fig(W, H, "Diafragma de sete lâminas em seu anel. Mova o ponteiro para fechar de f/1,8 a f/16; a luz que passa cai com o quadrado do número f.", out.join("")), data: {} };
}

// =====================================================================
// 4. OBTURADOR — cortinas no plano focal, janela 36 × 24
function shutter() {
  const W = 360, H = 270;
  const plan = { x: -50, y: -26, w: 100, d: 56, r: 8 };
  const P = k.fitProjection([...k.boxCorners(plan, -11, 0), [-36, 4, 66], [42, 4, 66]], W, H, { pad: 18, azimuth: 62, elevation: 20 });
  const T = kitFor(P); const { S, L, D, at } = T;
  const yF = 6, x0 = -18, z0 = 14;     // janela: x −18..18, z 14..38
  const out = [basePlate(T, plan)];
  out.push(S(k.slabOf({ x: -40, y: -4, w: 80, d: 6, r: 1 }, 0, 4, P, 3, .4), { tone: "mid" }));
  // fundo: sensor visto pela janela
  out.push(`<g transform="${T.face([x0, 0, z0 + 24], [1, 0, 0], [0, 0, -1])}"><rect width="36" height="24" class="shut-sensor" style="fill:var(--anatomy-red)" opacity=".18"/></g>`);
  // cortinas (plano y = 2), recortadas pela janela
  out.push(`<defs><clipPath id="shutClip"><rect x="0" y="0" width="36" height="24"/></clipPath></defs><g transform="${T.face([x0, 2, z0 + 24], [1, 0, 0], [0, 0, -1])}"><g clip-path="url(#shutClip)" class="shut-curtains"></g></g>`);
  // paredes internas da abertura (fundo e esquerda), depois a moldura em 4 barras
  const q = (pts, tone) => `<path d="${k.pathOf ? "" : ""}M${pts.map((p) => at(p).map(r2).join(" ")).join("L")}Z" class="iso-shade" data-shade="${tone}"/>`;
  out.push(q([[x0, yF, z0], [x0 + 36, yF, z0], [x0 + 36, 1, z0], [x0, 1, z0]], 3), q([[x0, yF, z0], [x0, yF, z0 + 24], [x0, 1, z0 + 24], [x0, 1, z0]], 1));
  const bar = (x, z, w, h) => S(k.slabOf({ x, y: 1, w, d: 5, r: .6 }, z, h, P, 2, .4), { tone: "hi" });
  out.push(bar(-34, 4, 68, 10), bar(-34, 38, 68, 12), bar(-34, 14, 16, 24), bar(18, 14, 16, 24));
  out.push(D([[-30, 8], [30, 8], [-30, 46], [30, 46]].map(([x, z]) => at([x, yF, z])), { size: .55, tone: "mid" }));
  out.push(L([[-30, 8], [30, 8], [-30, 46], [30, 46]].map(([x, z]) => k.sideRing([x, yF, z], 1.6, "y", P, 14)).join(""), { tone: "lo" }));
  // motor de carga + engrenagem + bobina, no lado +x
  out.push(S(k.cylinder(42, 4, 5, 26, 24, P, 32, .4), { tone: "mid" }), L(k.sideArc(42, 4, 5, 40, P, 16), { tone: "faint" }));
  out.push(S(G.disc(0, 1.8, 6, G.frameOf([35, 4, 18], [1, 0, 0], [0, 1, 0], [0, 0, 1]), P), { tone: "hi" }));
  out.push(S(k.slabOf({ x: 35, y: -2, w: 10, d: 10, r: 1 }, 4, 9, P, 2, .4), { tone: "mid" }));
  out.push(k.wireSvg(at([45, 3, 9]), at([47, 3, 26]), { via: [at([49, 3, 12])], tone: "lo" }));
  out.push(dims(T, [[[-18, 6, 14], [18, 6, 14], [0, 26, 0], '36 mm'], [[-34, 6, 14], [-34, 6, 38], [-10, 0, 0], '24 mm']]));
  return { svg: fig(W, H, "Obturador de plano focal: duas cortinas de lâminas correm por trás de uma janela de 36 × 24 mm. Escolha a velocidade e veja em câmera lenta.", out.join("")), data: {} };
}

// =====================================================================
// 5. SENSOR — matriz de pixels com filtro Bayer
function sensor() {
  const W = 760, H = 300, NX = 16, NY = 10, PX = 7;
  const gw = NX * PX, gd = NY * PX;
  const plan = { x: -gw / 2 - 30, y: -gd / 2 - 22, w: gw + 60, d: gd + 44, r: 8 };
  const P = k.fitProjection([...k.boxCorners(plan, -11, 0), [0, 0, 24]], W, H, { pad: 18, azimuth: 38, elevation: 34 });
  const T = kitFor(P); const { S, L, D, at } = T;
  const out = [basePlate(T, plan, 7, { ruler: false })];
  const pkg = { x: -gw / 2 - 12, y: -gd / 2 - 10, w: gw + 24, d: gd + 20, r: 3 };
  out.push(S(k.slabOf(pkg, 0, 4, P, 4, .6), { tone: "mid" }));
  for (let i = 0; i < 14; i++) { const x = pkg.x + 8 + i * (pkg.w - 16) / 13; out.push(S(k.slabOf({ x: x - 1.2, y: pkg.y + pkg.d - 4, w: 2.4, d: 3, r: .3 }, 4, .5, P, 2), { tone: "hi", crease: "none" })); }
  out.push(S(k.slabOf({ x: -gw / 2 - 3, y: -gd / 2 - 3, w: gw + 6, d: gd + 6, r: 1 }, 4, 1.4, P, 2, .3), { tone: "lo" }));
  const bay = (ix, iy) => (iy % 2 ? (ix % 2 ? "B" : "G") : (ix % 2 ? "G" : "R"));
  const COL = { R: "var(--anatomy-red)", G: "var(--anatomy-green)", B: "var(--anatomy-blue)" };
  const cells = [];
  for (let iy = 0; iy < NY; iy++) for (let ix = 0; ix < NX; ix++) {
    const x = -gw / 2 + ix * PX, y = -gd / 2 + iy * PX; const pl = { x: x + .5, y: y + .5, w: PX - 1, d: PX - 1, r: 1 };
    const sp = k.slabOf(pl, 5.4, 1.6, P, 2);
    const c = bay(ix, iy);
    cells.push({ key: k.depthOf([x, y, 6], P), svg: `<g class="px" data-c="${c}" data-x="${ix}" data-y="${iy}">${k.solidSvg(sp, { tone: "lo", crease: "none" })}<path d="${sp.top}" class="px-top" style="fill:${COL[c]}" opacity=".22"/>${k.lineSvg(k.ring(x + PX / 2, y + PX / 2, 1.9, 7, P, 12), { tone: "faint" })}</g>` });
  }
  cells.sort((a, b) => a.key - b.key);
  out.push(`<g class="px-grid">${cells.map((c) => c.svg).join("")}</g>`);
  out.push(k.faceTextSvg(k.topMatrix([pkg.x + 8, pkg.y + 4], 4, P, "x"), "36 × 24 mm · ESCALA ILUSTRATIVA", { size: 3.2, tone: "lo" }));
  // inversa do plano z = 7 para o ponteiro
  const o = at([0, 0, 7]), ex = T.vec([1, 0, 0]), ey = T.vec([0, 1, 0]);
  out.push(dims(T, [[[-gw / 2, gd / 2 + 6, 6], [gw / 2, gd / 2 + 6, 6], [0, 14, 0], '16 pixels · ≈ 0,1 mm reais']]));
  return { svg: fig(W, H, "Recorte ampliado de um sensor: cada célula é um fotossítio com um filtro vermelho, verde ou azul no padrão Bayer. Mova o ponteiro como se fosse um feixe de luz.", out.join("")), data: { o, ex, ey, NX, NY, PX, gw, gd } };
}

// =====================================================================
// 6. VISOR ELETRÔNICO — tela micro-OLED + ocular
function evf() {
  const W = 360, H = 270;
  const plan = { x: -42, y: -30, w: 84, d: 96, r: 8 };
  const P = k.fitProjection([...k.boxCorners(plan, -11, 0), [0, -10, 60], [0, 70, 50]], W, H, { pad: 18, azimuth: 56, elevation: 24 });
  const T = kitFor(P); const { S, L, D, at } = T;
  const out = [basePlate(T, plan)];
  // painel micro-OLED em pé
  out.push(S(k.slabOf({ x: -24, y: -12, w: 48, d: 6, r: 1.5 }, 0, 4, P, 3, .4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -22, y: -8, w: 44, d: 3, r: 1 }, 4, 34, P, 3, .4), { tone: "mid" }));
  const scr = T.face([-18, -4.95, 34], [1, 0, 0], [0, 0, -1]);
  out.push(`<defs><clipPath id="evfClip"><rect width="36" height="24" rx=".6"/></clipPath><linearGradient id="evfSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#20345c"/><stop offset=".65" stop-color="#d9774a"/><stop offset="1" stop-color="#f2c070"/></linearGradient></defs>`
    + `<g transform="${scr}"><g clip-path="url(#evfClip)"><rect width="36" height="24" fill="url(#evfSky)"/><circle class="evf-sun" cx="23" cy="13" r="2.6" fill="#ffe9b0"/><path d="M0 16 L7 10 L13 14.5 L19 8.5 L27 15 L36 11 V24 H0Z" fill="#3a2f45"/><rect y="17.5" width="36" height="7" fill="#1d2a3d"/>`
    + `<g class="evf-hud" opacity="0"><path d="M12 12h12M18 6v12" stroke="#fff" stroke-width=".25" opacity=".7"/><rect x="14" y="8" width="8" height="8" fill="none" stroke="#6be0a0" stroke-width=".35"/><rect x="0" y="21" width="36" height="3" fill="#000" opacity=".55"/><text x="1.2" y="23.2" font-size="1.7" fill="#fff" font-family="ui-monospace,monospace">1/250  f/4  ISO 400  ±0</text><text x="34.6" y="23.2" font-size="1.7" fill="#fff" text-anchor="end" font-family="ui-monospace,monospace">● REC</text></g>`
    + `</g><rect width="36" height="24" rx=".6" class="iso-line" data-tone="hi" style="fill:none"/></g>`);
  out.push(L(k.sideSeam({ x: -22, y: -8, w: 44, d: 3, r: 1 }, 36, P, 3), { tone: "faint" }));
  // flex do painel
  out.push(S(k.slabOf({ x: -6, y: -12, w: 12, d: 1, r: .2 }, 4, .4, P, 2), { tone: "hi", crease: "none" }));
  // ocular: dois grupos de lentes e a borracha
  const F = G.frameOf([0, 0, 21], [0, 1, 0], [-1, 0, 0], [0, 0, 1]);
  for (const [s, r] of [[18, 14], [32, 15]]) {
    out.push(S(k.slabOf({ x: -6, y: s - 3, w: 12, d: 6, r: 1 }, 0, 6, P, 2, .3), { tone: "mid" }));
    out.push(S(G.ringBand(s - 2, s + 2, r - 2.5, r, F, P), { tone: "hi" }) + S(G.solidOf([[s - 1, r - 2.5], [s + 1, r - 4, 1], [s + 2.2, 0]], F, P), { tone: "lo" }));
  }
  out.push(S(k.slabOf({ x: -8, y: 50, w: 16, d: 8, r: 1 }, 0, 4, P, 2, .3), { tone: "mid" }));
  out.push(S(G.ringBand(48, 62, 13, 18, F, P), { tone: "mid", inner: L(G.arcOf(F, 55, 18, P), { tone: "faint" }) }));
  out.push(dims(T, [[[0, -12, 0], [0, 62, 0], [-48, 0, 0], '74 mm'], [[-22, -8, 38], [22, -8, 38], [0, 0, 12], 'micro-OLED (ampliado)']]));
  return { svg: fig(W, H, "Visor eletrônico: um micro-OLED mostra a imagem vinda do sensor, e a ocular a amplia para o olho. Passe o mouse para ligar as informações de exposição.", out.join("")), data: {} };
}

// =====================================================================
// 7. PLACA — sensor → processador → cartão
function board() {
  const W = 760, H = 300;
  const plan = { x: -120, y: -48, w: 240, d: 100, r: 10 };
  const P = k.fitProjection([...k.boxCorners(plan, -11, 0), [0, 0, 30], [120, -48, 26]], W, H, { pad: 16, azimuth: 40, elevation: 32 });
  const T = kitFor(P); const { S, L, D, at } = T;
  const out = [basePlate(T, plan, 7, { ruler: false })];
  const pcb = { x: -100, y: -36, w: 200, d: 76, r: 4 };
  for (const [x, y] of k.corners(pcb, 6)) out.push(S(k.cylinder(x, y, 2.6, 0, 6, P, 16), { tone: "mid" }));
  out.push(S(k.slabOf(pcb, 6, 2, P, 6, .4), { tone: "lo" }));
  const Z = 8;
  // trilhas (fluxo de dados)
  const route = (pts) => k.onTop(pts, Z, P);
  const routes = [
    [[-84, 0], [-60, 0], [-50, -10], [-14, -10]], [[-84, 6], [-58, 6], [-48, 16], [-14, 16]], [[-84, -6], [-62, -6], [-52, -18], [-14, -18]],
    [[14, 2], [40, 2], [52, -10], [70, -10]], [[14, 10], [36, 10], [46, 20], [66, 20]],
  ];
  out.push(L(routes.map(route).join(""), { tone: "faint" }));
  out.push(`<g class="flow">${routes.map((r, i) => k.lineSvg(route(r), { tone: i < 3 ? "hi" : "red", flow: true })).join("")}</g>`);
  // conector do flex do sensor + flex
  out.push(S(k.slabOf({ x: -96, y: -14, w: 10, d: 28, r: 1 }, Z, 4, P, 2, .3), { tone: "mid" }));
  for (let i = 0; i < 6; i++) out.push(L(k.lineOnTop([-94, -10 + i * 4], [-88, -10 + i * 4], Z + 4, P), { tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([-96, -20], Z, P, "y"), "DO SENSOR", { size: 3.4, tone: "lo" }));
  // processador com dissipador
  out.push(S(k.slabOf({ x: -14, y: -24, w: 28, d: 48, r: 2 }, Z, 2.4, P, 3, .4), { tone: "mid" }));
  out.push(`<g class="proc">${S(k.slabOf({ x: -11, y: -21, w: 22, d: 42, r: 1.5 }, Z + 2.4, 2, P, 3, .4), { tone: "hi", lit: true })}</g>`);
  out.push(S(k.slabOf({ x: -12, y: -22, w: 24, d: 44, r: 1 }, Z + 4.4, 1.6, P, 3, .3), { tone: "mid" }));
  for (let i = 0; i < 7; i++) out.push(S(k.slabOf({ x: -12 + i * 3.8, y: -22, w: 1.2, d: 44, r: .2 }, Z + 6, 10, P, 2), { tone: "hi", crease: "none" }));
  // memória, regulador, cristal
  for (const [x, y, w, d] of [[24, -30, 18, 14], [24, 22, 14, 12], [-44, -32, 12, 10], [-44, 24, 10, 10]]) {
    out.push(S(k.slabOf({ x, y, w, d, r: 1 }, Z, 2.4, P, 2, .3), { tone: "mid" }), D([at([x + 2, y + 2, Z + 2.4])], { size: .45 }));
  }
  for (let i = 0; i < 10; i++) out.push(S(k.slabOf({ x: -40 + (i % 5) * 5, y: -2 + Math.floor(i / 5) * 6, w: 2.4, d: 1.4, r: .2 }, Z, 1, P, 1), { tone: "hi", crease: "none" }));
  // slot e cartão
  out.push(S(k.slabOf({ x: 66, y: -32, w: 36, d: 64, r: 2 }, Z, 4, P, 3, .4), { tone: "mid" }));
  const card = { x: 70, y: -26, w: 30, d: 44, r: 2 };
  out.push(`<g class="card">${S(k.slabOf(card, Z + 4, 2, P, 3, .4), { tone: "hi" })}${k.faceTextSvg(k.topMatrix([74, -18], Z + 6, P, "x"), "SD", { size: 7, tone: "mid" })}${k.lineSvg(k.planOutline({ x: 74, y: -6, w: 22, d: 18, r: 1 }, Z + 6, P, 2), { tone: "lo" })}</g>`);
  out.push(dims(T, [[[-100, 40, 8], [100, 40, 8], [0, 16, 0], '100 mm · escala 2:1']]));
  return { svg: fig(W, H, "Placa principal: os dados chegam do sensor pelo conector flex, passam pelo processador de imagem sob o dissipador e são gravados no cartão.", out.join("")), data: { EX: T.vec([1, 0, 0]) } };
}

// =====================================================================
// 8. BATERIA
function battery() {
  const W = 360, H = 270;
  const plan = { x: -40, y: -30, w: 80, d: 64, r: 8 };
  const P = k.fitProjection([...k.boxCorners(plan, -11, 0), [0, 0, 74]], W, H, { pad: 18, azimuth: 40, elevation: 24 });
  const T = kitFor(P); const { S, L, D, at } = T;
  const out = [basePlate(T, plan)];
  const cell = { x: -19, y: -11, w: 38, d: 22, r: 3 };
  out.push(S(k.slabOf(cell, 0, 56, P, 4, 1), { tone: "mid", inner: L(k.sideSeam(cell, 48, P, 4), { tone: "faint" }) }));
  out.push(S(k.slabOf(k.insetPlan(cell, 2), 56, 2.5, P, 4, .4), { tone: "hi" }));
  for (let i = 0; i < 4; i++) out.push(S(k.slabOf({ x: -9 + i * 5, y: -2.5, w: 2.6, d: 5, r: .4 }, 58.5, .6, P, 2), { tone: "hi", crease: "none", lit: i === 0 || i === 3 }));
  out.push(k.faceTextSvg(k.topMatrix([-12, 6.5], 59.1, P, "x"), "+     T     C     −", { size: 2.4, tone: "lo" }));
  // rótulo na face +y e medidor de carga na face +x
  const lab = T.face([-15, 11.05, 44], [1, 0, 0], [0, 0, -1]);
  out.push(`<g transform="${lab}"><text class="iso-face-text" data-tone="hi" font-size="5.4" y="0">Li-ion</text><text class="iso-face-text" font-size="3.4" y="7">7,2 V · 2280 mAh</text><text class="iso-face-text" data-tone="lo" font-size="3.4" y="12.5">16,4 Wh</text><path class="iso-line" data-tone="red" d="M0 16H14"/></g>`);
  const meter = T.face([19.05, 8, 46], [0, -1, 0], [0, 0, -1]);
  out.push(`<g transform="${meter}"><rect width="16" height="36" rx="1" class="iso-line" data-tone="lo" style="fill:var(--anatomy-shade-0)"/>${Array.from({ length: 8 }, (_, i) => `<rect class="bat-seg" data-i="${7 - i}" x="2" y="${2 + i * 4.1}" width="12" height="3.2" rx=".4" style="fill:var(--anatomy-green)" opacity=".85"/>`).join("")}</g>`);
  out.push(dims(T, [[[-19, 11, 0], [19, 11, 0], [0, 14, 0], '38 mm'], [[19, -11, 0], [19, 11, 0], [14, 0, 0], '22 mm'], [[19, 11, 0], [19, 11, 56], [10, 10, 0], '56 mm']]));
  return { svg: fig(W, H, "Bateria de íon-lítio: 7,2 V × 2,28 Ah = 16,4 Wh. Passe o mouse para simular uma sessão de fotos.", out.join("")), data: {} };
}

// =====================================================================
const H1 = hero(), Ls = lens(), Ir = iris(), Sh = shutter(), Se = sensor(), Ev = evf(), Bo = board(), Ba = battery();
const DATA = { hero: H1.data, lens: Ls.data, sensor: Se.data, board: Bo.data };
const chips = H1.data.order.filter((id) => id !== "corpo").map((id, i) => `<button type="button" class="chip" data-part="${id}"><span class="num">${String(i + 1).padStart(2, "0")}</span>${H1.PIECES[id].name}</button>`).join("");
const card = ({ id, cls, fig: f, title, hint, readout, svg, extra = "", note = "" }) => `
<section class="tile ${cls}" id="${id}" data-tile="${id}">
  <header><span class="fig">${f}</span><span class="title">${title}</span></header>
  <div class="stage" tabindex="0">${svg}</div>
  ${extra}
  <footer><span class="hint">${hint}</span><span class="readout" data-readout>${readout}</span></footer>
  ${note ? `<p class="note">${note}</p>` : ""}
</section>`;
const tiles = [
  card({ id: "camera", cls: "t-hero", fig: "Fig 1", title: "Câmera sem espelho · vista explodida", hint: "Passe o mouse para desmontar · toque numa peça", readout: "montada · 12 conjuntos", svg: H1.svg, extra: `<div class="chips">${chips}</div>`, note: "Câmera genérica, para fins didáticos: posição de placas, dissipador e bateria varia conforme o modelo." }),
  card({ id: "lente", cls: "t-sq", fig: "Fig 2", title: "Lente · foco", hint: "Mova o ponteiro para focar", readout: "foco ∞ · avanço 0,00 mm", svg: Ls.svg }),
  card({ id: "diafragma", cls: "t-sq", fig: "Fig 3", title: "Diafragma", hint: "Mova o ponteiro para fechar", readout: "f/1,8 · 100% da luz", svg: Ir.svg }),
  card({ id: "obturador", cls: "t-sq", fig: "Fig 4", title: "Obturador", hint: "Escolha a velocidade", readout: "1/250 s", svg: Sh.svg, extra: `<div class="speeds">${["1/1000", "1/250", "1/30"].map((s, i) => `<button type="button" class="chip" data-speed="${s}"${i === 1 ? " data-on" : ""}>${s} s</button>`).join("")}</div>` }),
  card({ id: "visor", cls: "t-sq", fig: "Fig 5", title: "Visor eletrônico", hint: "Passe o mouse para ligar o HUD", readout: "micro-OLED · imagem ao vivo", svg: Ev.svg }),
  card({ id: "sensor", cls: "t-wide", fig: "Fig 6", title: "Sensor · matriz Bayer", hint: "O ponteiro é um feixe de luz", readout: "50% verde · 25% vermelho · 25% azul", svg: Se.svg }),
  card({ id: "bateria", cls: "t-sq", fig: "Fig 7", title: "Bateria", hint: "Passe o mouse para fotografar", readout: "100% · 16,4 Wh", svg: Ba.svg }),
  `<section class="tile t-sq t-text" id="ficha"><header><span class="fig">Ficha</span><span class="title">Números do modelo</span></header><dl class="spec">
    <div><dt>Sensor</dt><dd>36 × 24 mm · 6000 × 4000 px</dd></div><div><dt>Pixel</dt><dd>36 mm ÷ 6000 = 6 µm</dd></div>
    <div><dt>Lente</dt><dd>50 mm · f/1,8 · foco mín. 0,45 m</dd></div><div><dt>Baioneta → sensor</dt><dd>18 mm</dd></div>
    <div><dt>Obturador</dt><dd>2 cortinas · janela 36 × 24 mm</dd></div><div><dt>Bateria</dt><dd>7,2 V × 2,28 Ah = 16,4 Wh</dd></div></dl>
    <p class="note">Valores de uma câmera full frame típica; cada modelo tem os seus.</p></section>`,
  card({ id: "placa", cls: "t-wide", fig: "Fig 8", title: "Placa principal · processamento", hint: "Passe o mouse para processar uma foto", readout: "em espera", svg: Bo.svg, note: "Etapas típicas; a ordem exata e os formatos de arquivo variam conforme o fabricante." }),
,
  `<section class="tile t-wide t-text" id="caminho"><header><span class="fig">Fig 9</span><span class="title">Do fóton ao arquivo</span></header><ol class="path">
    ${[["lente", "A luz atravessa os elementos ópticos e converge."], ["diafragma", "O diafragma dosa quanto dela passa (f/N)."], ["obturador", "O obturador abre a janela pelo tempo escolhido."], ["sensor", "Cada pixel converte fótons em carga elétrica."], ["placa", "A carga vira número e o processador monta a imagem."], ["placa", "O arquivo é comprimido e gravado no cartão."]].map(([to, t], i) => `<li><button type="button" data-go="${to}"><span class="num">${String(i + 1).padStart(2, "0")}</span>${t}</button></li>`).join("")}
  </ol></section>`,
].join("");

const CSS = readFileSync(join(HERE, "bento.css"), "utf8") + readFileSync(join(HERE, "wire.css"), "utf8");
const LIVE = (readFileSync(join(HERE, "live.js"), "utf8") + readFileSync(join(HERE, "wire.js"), "utf8")).replace("__DATA__", JSON.stringify(DATA));
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Wireframes da Câmera</title>
<style>${k.ISO_CSS}${CSS}</style></head><body class="iso wf" data-theme="dark" data-mode="wire">
<main class="page">
  <header class="masthead"><p class="kicker"><b>WF</b> PRANCHA TÉCNICA · DESENHO ISOMÉTRICO</p><h1>Wireframes da câmera</h1><p class="lede">As mesmas peças, em linhas: cada desenho mostra a estrutura inteira, com cotas em milímetros. Tudo continua vivo: desmonte, foque, feche o diafragma e dispare.</p><div class="modes" role="group" aria-label="Modo de desenho"><button type="button" class="chip" data-mode="wire" data-on>Wireframe</button><button type="button" class="chip" data-mode="xray">Raio-X</button><button type="button" class="chip" data-mode="solid">Sólido</button><button type="button" class="chip" id="redraw">Desenhar de novo</button></div></header>
  <div class="bento">${tiles}</div>
  <footer class="colophon">Desenhado com a skill <b>anatomy</b> · projeção isométrica · cotas do modelo didático, não de uma câmera específica.</footer>
</main>
<script type="module">${(kitScript() + LIVE).replace(/<\/(script)/gi, "<\\/$1")}</script></body></html>`;
writeFileSync(join(HERE, "index.html"), html);
// versão para Artifact (o publicador envolve o esqueleto; aparência única, escura)
const art = html.replace(/^<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport"[^>]*>/, '<meta name="claude:viewport-fit-sides" content="cover">')
  .replace("<title>Wireframes da Câmera</title>", "<title>Wireframes da Câmera</title>")
  .replace('</style></head><body class="iso wf" data-theme="dark" data-mode="wire">', ':root{color-scheme:dark}body{background:#08090b}.page{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));width:min(1272px,100%)}</style><div class="iso" data-theme="dark" style="background:var(--anatomy-page);min-height:100%">')
;
const cut = art.lastIndexOf("</body></html>"); const artOut = art.slice(0, cut) + "</div>";
writeFileSync(join(HERE, "artifact.html"), artOut);
console.log("index.html", (html.length / 1024).toFixed(0) + " KB");
