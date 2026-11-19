// Vista explodida isométrica de um smartphone, feita com a skill "anatomy".
// node diagramas/celular-explodido/build.mjs [--light]
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../.claude/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../../.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 620;
const HEIGHT = 980;

// Mundo: x = largura (72 mm), y = altura (148 mm), z = espessura. 1 unidade ≈ 1 mm.
const BODY = { x: -36, y: -74, w: 72, d: 148, r: 10 };
const OFF = [0, 38, 78, 120, 192, 234, 306]; // altura de cada camada com a vista totalmente explodida

// Câmeras no canto (x−, y−)
const LENS = [
  [-24, -60],
  [-24, -40],
  [-8, -50],
];
const FLASH = [-6, -66];
const LIDAR = [-6, -36];
const MIC = [2, -60];

const LAYERS = [
  { id: "display", name: "Tela (display assembly)", short: "Tela OLED + vidro" },
  { id: "modules", name: "Alto-falante, Taptic Engine e USB-C", short: "Módulos inferiores" },
  { id: "battery", name: "Bateria de íon-lítio", short: "Bateria" },
  { id: "board", name: "Placa lógica (SoC série A)", short: "Placa lógica" },
  { id: "chassis", name: "Chassi de alumínio", short: "Chassi" },
  { id: "cameras", name: "Câmera tripla, flash, mic e LiDAR", short: "Câmeras" },
  { id: "glass", name: "Painel traseiro de vidro", short: "Vidro traseiro" },
];

const P = k.fitProjection(
  [...k.boxCorners(BODY, 0, 9), ...k.boxCorners(BODY, 0, 9 + OFF[OFF.length - 1])],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 38, elevation: 24 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const box = (x0, y0, x1, y1, r = 1) => ({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r });
const deep = (p) => k.depthOf([p[0], p[1], 0], P);
const byDepth = (list, key = (i) => i.c) => [...list].sort((a, b) => deep(key(a)) - deep(key(b)));
const screws = (pts, z, size = 0.45) => {
  const out = [L(pts.map(([x, y]) => k.ring(x, y, 1.2, z, P, 14)).join(""), { tone: "lo" })];
  out.push(D(pts.map(([x, y]) => at([x, y, z])), { size }));
  return out.join("");
};
const text = (x, y, z, s, size = 2.6, tone = "lo", anchor = "middle") =>
  k.faceTextSvg(k.topMatrix([x, y], z, P, "y"), s, { size, tone, anchor });

// ---------- 0. Tela ----------
function display() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(BODY, 4), 0, 0.1, P)}"/>`];
  out.push(S(k.slabOf(BODY, 0, 1.2, P, 10, 0.6), { tone: "mid" }));
  const panel = k.insetPlan(BODY, 1.6);
  out.push(S(k.slabOf(panel, 1.2, 0.9, P, 10, 0.4), { tone: "mid", crease: "lo" }));
  const active = k.insetPlan(BODY, 4);
  out.push(L(k.planOutline(active, 2.1, P, 10), { tone: "lo" }));
  // grade fina do painel OLED (linhas de borda a borda)
  const rows = [];
  for (let y = active.y + 12; y < active.y + active.d - 6; y += 12) rows.push(k.lineOnTop([active.x + 1.5, y], [active.x + active.w - 1.5, y], 2.1, P));
  out.push(L(rows.join(""), { tone: "faint" }));
  // Dynamic Island (recorte da câmera frontal + Face ID)
  const island = box(-9, -68, 9, -63.4, 2.3);
  out.push(S(k.slabOf(island, 2.1, 0.3, P, 6), { tone: "lo", crease: "none" }));
  out.push(D([at([5.6, -65.7, 2.4])], { size: 0.9, tone: "hi" }));
  // cauda flexível da tela que sobe até a placa
  const tail = box(14, -20, 24, -4, 1);
  out.push(S(k.slabOf(tail, 2.1, 0.4, P, 4), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf(box(15, -8, 23, -3, 0.6), 2.5, 1.0, P, 3), { tone: "hi" }));
  out.push(L(k.lineOnTop([16, -6.8], [22, -6.8], 3.5, P) + k.lineOnTop([16, -5.6], [22, -5.6], 3.5, P), { tone: "lo" }));
  out.push(text(0, 30, 2.1, "OLED · 2556 × 1179", 2.4, "faint"));
  return out.join("");
}

// ---------- 1. Módulos inferiores ----------
function modules() {
  const out = [`<path class="iso-halo" d="${k.haloOf(box(-32, 46, 32, 72, 3), 0, 0.1, P)}" style="filter:blur(5px)"/>`];
  const parts = [];
  // alto-falante
  parts.push({
    c: [-17, 60],
    svg: () => {
      const o = [];
      const sp = box(-31, 50, -4, 70, 2);
      o.push(S(k.slabOf(sp, 0, 4, P, 5, 0.5), { tone: "mid" }));
      const grill = box(-27, 53, -15, 67, 1.5);
      o.push(L(k.planOutline(grill, 4, P, 4), { tone: "lo" }));
      o.push(D(k.dotGrid(-25.5, 55, 6, 7, 2, 4, P), { size: 0.35, tone: "mid" }));
      o.push(S(k.slabOf(box(-11, 52, -6, 57, 0.8), 4, 0.8, P, 3), { tone: "hi" }));
      o.push(screws([[-29, 52], [-6, 68]], 4));
      return o.join("");
    },
  });
  // Taptic Engine (motor de vibração linear)
  parts.push({
    c: [17, 58],
    svg: () => {
      const o = [];
      const tp = box(3, 48, 31, 66, 2.4);
      o.push(S(k.slabOf(tp, 0, 4.6, P, 6, 0.6), { tone: "mid" }));
      o.push(L(k.planOutline(k.insetPlan(tp, 2.6), 4.6, P, 6), { tone: "faint" }));
      o.push(L(k.sideSeam(tp, 2.2, P, 6), { tone: "lo" }));
      o.push(text(17, 56, 4.6, "TAPTIC", 2.4, "lo"));
      o.push(L(k.lineOnTop([10, 60.5], [24, 60.5], 4.6, P) + k.lineOnTop([10, 62], [21, 62], 4.6, P), { tone: "faint", free: true }));
      o.push(S(k.slabOf(box(26, 44, 30, 49, 0.6), 2.4, 1.2, P, 3), { tone: "hi" }));
      o.push(screws([[5.5, 50.5], [28.5, 63.5]], 4.6));
      return o.join("");
    },
  });
  // porta USB-C
  parts.push({
    c: [0, 70],
    svg: () => {
      const o = [];
      const port = box(-7, 66, 7, 73.5, 1.6);
      o.push(S(k.slabOf(port, 0, 3.6, P, 5, 0.4), { tone: "hi", lit: true }));
      const mouth = box(-4.4, 68.6, 4.4, 72.4, 1.8);
      o.push(L(k.planOutline(mouth, 3.6, P, 6), { tone: "mid" }));
      o.push(L(k.lineOnTop([-2.6, 70.5], [2.6, 70.5], 3.6, P), { tone: "lit" }));
      o.push(S(k.slabOf(box(-3, 58, 3, 66, 0.6), 0.8, 0.4, P, 3), { tone: "mid", crease: "none" }));
      return o.join("");
    },
  });
  for (const p of byDepth(parts)) out.push(p.svg());
  return out.join("");
}

// ---------- 2. Bateria ----------
function battery() {
  const out = [];
  const cell = box(-31, -30, 27, 44, 3);
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(cell, 3), 0, 0.1, P)}" style="filter:blur(5px)"/>`);
  out.push(S(k.slabOf(cell, 0, 4.4, P, 6, 0.8), { tone: "mid" }));
  out.push(L(k.sideSeam(cell, 2.6, P, 6), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(cell, 3.5), 4.4, P, 6), { tone: "faint" }));
  out.push(text(-2, 2, 4.4, "Li-ion  3274 mAh", 3.4, "mid"));
  out.push(text(-2, 9, 4.4, "3,87 V · 12,7 Wh", 2.6, "lo"));
  // etiqueta com três linhas de regra
  const tag = box(-24, 22, 6, 36, 1);
  out.push(L(k.planOutline(tag, 4.4, P, 3), { tone: "lo" }));
  out.push(L([26, 29, 32].map((y) => k.lineOnTop([-21, y], [3, y], 4.4, P)).join(""), { tone: "faint" }));
  // abas de remoção (pull tabs)
  out.push(S(k.slabOf(box(-26, 44, -18, 50, 0.8), 1.6, 0.3, P, 3), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf(box(10, 44, 18, 50, 0.8), 1.6, 0.3, P, 3), { tone: "lo", crease: "none" }));
  // flex + conector da bateria indo para a placa
  out.push(S(k.slabOf(box(16, -40, 24, -30, 0.8), 3.4, 0.4, P, 3), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf(box(15, -44, 25, -38, 0.6), 3.8, 1.2, P, 3), { tone: "hi" }));
  out.push(D([at([17, -41, 5]), at([23, -41, 5])], { size: 0.45 }));
  return out.join("");
}

// ---------- 3. Placa lógica ----------
function board() {
  const out = [];
  const main = box(-33, -71, 33, -42, 3);
  const arm = box(10, -44, 33, -6, 3);
  out.push(`<path class="iso-halo" d="${k.haloOf(main, 0, 0.1, P)}" style="filter:blur(5px)"/>`);
  out.push(S(k.slabOf(arm, 0, 1.2, P, 6, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf(main, 0, 1.2, P, 6, 0.3), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(arm, 1.4), 1.2, P, 6), { tone: "faint" }));
  out.push(L(k.lineOnTop([-31.6, -69.4], [31.6, -69.4], 1.2, P), { tone: "faint" }));
  const Z = 1.2;
  const chips = [
    // SoC: a peça que o leitor deve ver
    { c: [-14, -56], svg: () => S(k.slabOf(box(-24, -65, -4, -47, 1.2), Z, 2, P, 4, 0.4), { tone: "hi", lit: true }) + text(-14, -56, Z + 2, "SoC · 3 nm", 2.6, "mid") + L(k.planOutline(box(-22, -63, -6, -49, 0.8), Z + 2, P, 3), { tone: "lo" }) },
    { c: [4, -62], svg: () => S(k.slabOf(box(-1, -67, 9, -58, 0.8), Z, 1.4, P, 3, 0.3), { tone: "mid" }) + text(4, -62.5, Z + 1.4, "8 GB", 2, "lo") },
    { c: [4, -50], svg: () => S(k.slabOf(box(-1, -55, 9, -46, 0.8), Z, 1.4, P, 3, 0.3), { tone: "mid" }) + text(4, -50.5, Z + 1.4, "NAND", 2, "lo") },
    { c: [20, -60], svg: () => S(k.slabOf(box(13, -67, 29, -53, 1), Z, 1.8, P, 4, 0.4), { tone: "mid" }) + L(k.planOutline(box(15, -65, 27, -55, 0.6), Z + 1.8, P, 3), { tone: "faint" }) + text(21, -60, Z + 1.8, "5G", 2.4, "lo") },
    { c: [21, -34], svg: () => S(k.slabOf(box(14, -39, 28, -29, 0.8), Z, 1.4, P, 3, 0.3), { tone: "mid" }) + text(21, -34, Z + 1.4, "PMIC", 2, "lo") },
    { c: [21, -19], svg: () => S(k.slabOf(box(15, -24, 27, -14, 0.8), Z, 1.2, P, 3, 0.3), { tone: "mid" }) + text(21, -19, Z + 1.2, "UWB", 2, "lo") },
    { c: [-28, -50], svg: () => S(k.slabOf(box(-31, -55, -26, -45, 0.6), Z, 1.6, P, 3), { tone: "hi" }) },
    { c: [21, -9], svg: () => S(k.slabOf(box(16, -11, 26, -7.5, 0.6), Z, 1.2, P, 3), { tone: "hi" }) },
  ];
  // componentes passivos minúsculos
  const caps = [];
  for (let i = 0; i < 9; i++) caps.push([-30 + i * 3.1, -68]);
  for (let i = 0; i < 6; i++) caps.push([12 + i * 3, -51]);
  for (let i = 0; i < 5; i++) caps.push([12 + (i % 2) * 2.4, -46 + i * 3.4 + 18]);
  for (const c of caps) chips.push({ c, svg: () => S(k.slabOf(box(c[0] - 0.7, c[1] - 0.45, c[0] + 0.7, c[1] + 0.45, 0.1), Z, 0.7, P, 1), { tone: "lo", crease: "none" }) });
  for (const chip of byDepth(chips)) out.push(chip.svg());
  out.push(screws([[-30.5, -44.5], [30.5, -68.5], [30.5, -8.5], [12.5, -8.5]], Z));
  return out.join("");
}

// ---------- 4. Chassi ----------
function chassis() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(BODY, 4), 0, 0.1, P)}"/>`];
  const btn = [];
  // botões laterais: ação + volume (x−) e energia (x+)
  btn.push({ c: [-37, -50], svg: () => S(k.slabOf(box(-37.4, -54, -35.4, -46, 0.9), 3, 2.4, P, 3), { tone: "mid" }, ) });
  btn.push({ c: [-37, -36], svg: () => S(k.slabOf(box(-37.4, -40, -35.4, -30, 0.9), 3, 2.4, P, 3), { tone: "mid" }) });
  btn.push({ c: [-37, -24], svg: () => S(k.slabOf(box(-37.4, -28, -35.4, -18, 0.9), 3, 2.4, P, 3), { tone: "mid" }) });
  const back = byDepth(btn);
  // os botões do lado x− ficam atrás do chassi nesta câmera
  for (const b of back) out.push(b.svg());
  out.push(S(k.slabOf(BODY, 0, 7.8, P, 10, 0.8), { tone: "mid", className: "anod" }));
  out.push(L(k.sideSeam(BODY, 1.4, P, 10), { tone: "lo" }));
  out.push(L(k.sideSeam(BODY, 6.4, P, 10), { tone: "lo" }));
  out.push(S(k.slabOf(box(35.4, -42, 37.4, -26, 0.9), 3, 2.4, P, 3), { tone: "mid", className: "anod" }));
  const Z = 7.8;
  out.push(L(k.planOutline(k.insetPlan(BODY, 2.2), Z, P, 10), { tone: "lo" }));
  // anel MagSafe no centro
  for (const [r, tone] of [[23, "lo"], [21.5, "mid"], [18, "lo"]]) out.push(L(k.ring(0, 6, r, Z, P, 72), { tone }));
  out.push(L(k.lineOnTop([0, 27.5], [0, 40], Z, P), { tone: "lo" }));
  out.push(D([at([0, 6, Z])], { size: 0.8, tone: "hi" }));
  // janela para o módulo de câmera e para a bobina de recarga
  out.push(L(k.planOutline(box(-32, -70, 4, -30, 5), Z, P, 6), { tone: "mid" }));
  out.push(L(k.planOutline(box(8, -70, 31, -48, 3), Z, P, 4), { tone: "faint" }));
  out.push(L(k.planOutline(box(-30, 46, 30, 70, 3), Z, P, 4), { tone: "faint" }));
  // antenas: linhas de separação no aro
  out.push(L(k.lineOnTop([-36, 40], [-33.8, 40], Z, P) + k.lineOnTop([33.8, 40], [36, 40], Z, P), { tone: "hi" }));
  out.push(screws([[-31, -26], [31, -26], [-31, 42], [31, 42], [-26, 72], [26, 72]], Z));
  // régua de referência gravada no aro inferior
  const ticks = k.topTicks(-28, 28, 2, 5, 72.8, Z, [0.6, 1.2], P);
  out.push(L(ticks.minor, { tone: "faint" }), L(ticks.major, { tone: "lo" }));
  return out.join("");
}

// ---------- 5. Câmeras ----------
function cameras() {
  const out = [];
  const bracket = box(-33, -70, 1, -30, 5);
  out.push(`<path class="iso-halo" d="${k.haloOf(bracket, 0, 0.1, P)}" style="filter:blur(5px)"/>`);
  out.push(S(k.slabOf(bracket, 0, 1.4, P, 6, 0.4), { tone: "mid" }));
  out.push(screws([[-30, -33], [-2, -67]], 1.4));
  const parts = [];
  LENS.forEach(([x, y], i) => {
    parts.push({
      c: [x, y],
      svg: () => {
        const o = [];
        o.push(S(k.slabOf(box(x - 8.4, y - 8.4, x + 8.4, y + 8.4, 2.4), 1.4, 4, P, 4, 0.5), { tone: "mid" }));
        o.push(S(k.cylinder(x, y, 6.6, 5.4, 2.6, P, 40, 0.4), { tone: "mid" }));
        o.push(L(k.knurl(x, y, 6.6, 5.6, 7.6, 40, P), { tone: "faint" }));
        o.push(S(k.cylinder(x, y, 4.8, 8, 0.8, P, 40), { tone: "hi", lit: i === 0 }));
        o.push(L(k.ring(x, y, 3.4, 8.8, P, 32), { tone: "mid" }));
        o.push(L(k.ring(x, y, 1.6, 8.8, P, 24), { tone: "lo" }));
        o.push(D([at([x - 1.2, y - 1.2, 8.8])], { size: 0.5, tone: "hi" }));
        return o.join("");
      },
    });
  });
  parts.push({ c: FLASH, svg: () => S(k.cylinder(...FLASH, 3, 1.4, 1.8, P, 28, 0.3), { tone: "mid" }) + L(k.ring(...FLASH, 2, 3.2, P, 24), { tone: "hi" }) + D([at([FLASH[0], FLASH[1], 3.2])], { size: 0.7, tone: "hi" }) });
  parts.push({ c: LIDAR, svg: () => S(k.cylinder(...LIDAR, 3.2, 1.4, 2.4, P, 28, 0.3), { tone: "mid" }) + S(k.cylinder(...LIDAR, 2.2, 3.8, 0.4, P, 24), { tone: "lo" }) + D([at([LIDAR[0] - 0.8, LIDAR[1], 4.2]), at([LIDAR[0] + 0.8, LIDAR[1], 4.2])], { size: 0.45, tone: "hi" }) });
  parts.push({ c: MIC, svg: () => S(k.cylinder(...MIC, 1.6, 1.4, 1.2, P, 20), { tone: "mid" }) + D([at([MIC[0], MIC[1], 2.6])], { size: 0.5, tone: "hi" }) });
  for (const p of byDepth(parts)) out.push(p.svg());
  // flex das câmeras, deitado na base do suporte
  out.push(S(k.slabOf(box(-16, -31, -4, -24, 0.8), 0.6, 0.4, P, 3), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf(box(-15, -26, -5, -21, 0.6), 1, 1.2, P, 3), { tone: "hi" }));
  return out.join("");
}

// ---------- 6. Vidro traseiro ----------
function glass() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(BODY, 4), 0, 0.1, P)}"/>`];
  out.push(S(k.slabOf(BODY, 0, 1.2, P, 10, 0.6), { tone: "mid", className: "anod glass" }));
  const plateau = box(-34, -72, 2, -28, 7);
  out.push(S(k.slabOf(plateau, 1.2, 1.4, P, 8, 0.5), { tone: "mid", className: "anod glass" }));
  const Z = 2.6;
  for (const [x, y] of LENS) {
    out.push(S(k.cylinder(x, y, 7.4, Z, 1.2, P, 40, 0.4), { tone: "hi" }));
    out.push(L(k.ring(x, y, 5.6, Z + 1.2, P, 40), { tone: "mid" }));
  }
  out.push(L(k.ring(...FLASH, 3.2, Z, P, 28), { tone: "lo" }));
  out.push(L(k.ring(...LIDAR, 3.4, Z, P, 28), { tone: "lo" }));
  out.push(D([at([MIC[0], MIC[1], Z])], { size: 0.6, tone: "mid" }));
  // reflexo no vidro (fosco): duas faixas que terminam nas bordas
  out.push(L(k.lineOnTop([20, -74], [36, -46], 1.2, P) + k.lineOnTop([28, -74], [36, -60], 1.2, P), { tone: "faint" }));
  out.push(L(k.ring(0, 6, 21.5, 1.2, P, 72), { tone: "faint" }));
  return out.join("");
}

const builders = { display, modules, battery, board, chassis, cameras, glass };

const START = 0.9;
const layerSvg = LAYERS.map(
  (layer, i) =>
    `<g class="layer" data-layer="${layer.id}" data-index="${i}" transform="${k.translateAlong(P, [0, 0, OFF[i] * START])}">${builders[layer.id]()}</g>`,
);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Vista explodida de um smartphone em sete camadas, de baixo para cima: tela OLED com vidro, módulos inferiores (alto-falante, Taptic Engine e porta USB-C), bateria de íon-lítio, placa lógica com o SoC, chassi de alumínio com o anel MagSafe, câmera tripla com flash, microfone e LiDAR, e o painel traseiro de vidro.",
  body: layerSvg,
});

const legend = `<ol class="cel-legend">${[...LAYERS]
  .map((l, i) => ({ ...l, i }))
  .reverse()
  .map((l) => `<li><button type="button" data-pick="${l.id}"><span class="n">${l.i + 1}</span>${l.name}</button></li>`)
  .join("")}</ol>`;

const live = `
const P = ${JSON.stringify(P)};
const OFF = ${JSON.stringify(OFF)};
const LAYERS = ${JSON.stringify(LAYERS)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const groups = [...svg.querySelectorAll(".layer")];
const readout = document.querySelector("[data-readout]");
const buttons = [...document.querySelectorAll("[data-pick]")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let e = ${START}, target = e, focus = null, touring = !still.matches, clock = 0, last = 0, frame = 0, visible = false, idle = 0;
function setFocus(id) {
  if (focus === id) return;
  focus = id;
  svg.classList.toggle("focusing", !!id);
  groups.forEach((g) => g.classList.toggle("on", g.dataset.layer === id));
  buttons.forEach((b) => b.classList.toggle("on", b.dataset.pick === id));
}
function draw() {
  groups.forEach((g, i) => g.setAttribute("transform", translateAlong(P, [0, 0, OFF[i] * e])));
  const layer = LAYERS.find((l) => l.id === focus);
  const t = (layer ? layer.short + " · " : "") + "explosão " + Math.round(e * 100) + "%";
  if (readout.textContent !== t) readout.textContent = t;
  stage.setAttribute("aria-valuenow", String(Math.round(e * 100)));
  stage.setAttribute("aria-valuetext", t);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) {
    clock += dt;
    target = 0.5 - 0.5 * Math.cos(clock * 0.55);
    const step = Math.floor(clock / 1.6) % (LAYERS.length + 2);
    setFocus(step < LAYERS.length ? LAYERS[LAYERS.length - 1 - step].id : null);
  }
  e = still.matches ? target : e + (target - e) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(target - e) < 0.0005) e = target;
  draw();
  frame = visible && (touring || e !== target) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; clock = Math.acos(clamp(1 - 2 * e, -1, 1)) / 0.55; run(); }, 4200); run(); };
new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (ev) => {
  const r = svg.getBoundingClientRect();
  target = clamp(1 - ((ev.clientY - r.top) / r.height - 0.15) / 0.7, 0, 1);
  const hit = ev.target.closest && ev.target.closest(".layer");
  setFocus(hit ? hit.dataset.layer : null);
  hold();
});
stage.addEventListener("pointerleave", () => { setFocus(null); hold(); });
buttons.forEach((b) => {
  const pick = () => { setFocus(b.dataset.pick); target = Math.max(target, 0.85); hold(); draw(); };
  b.addEventListener("mouseenter", pick);
  b.addEventListener("focus", pick);
  b.addEventListener("click", pick);
});
stage.addEventListener("keydown", (ev) => {
  let to = null;
  if (ev.key === "ArrowUp" || ev.key === "ArrowRight") to = target + 0.1;
  if (ev.key === "ArrowDown" || ev.key === "ArrowLeft") to = target - 0.1;
  if (ev.key === "Home") to = 0;
  if (ev.key === "End") to = 1;
  if (to === null) return;
  ev.preventDefault();
  target = clamp(to, 0, 1);
  hold();
});
if (still.matches) { e = target = 0.85; }
draw();
`;

const CSS = `
<style>
.iso{--cel-or-top:#f08a4b;--cel-or-0:#9a4a1e;--cel-or-1:#b4572a;--cel-or-2:#cc6733;--cel-or-3:#de7840;--cel-or-edge:#ffb37f}
.iso[data-theme="light"]{--cel-or-top:#f6a46f;--cel-or-0:#c8622b;--cel-or-1:#d8723a;--cel-or-2:#e5844c;--cel-or-3:#ef9660;--cel-or-edge:#8a3a12}
.anod>.iso-fill{fill:var(--cel-or-1)}
.anod>.iso-top{fill:var(--cel-or-top)}
.anod>.iso-shade[data-shade="0"]{fill:var(--cel-or-0)}
.anod>.iso-shade[data-shade="1"]{fill:var(--cel-or-1)}
.anod>.iso-shade[data-shade="2"]{fill:var(--cel-or-2)}
.anod>.iso-shade[data-shade="3"]{fill:var(--cel-or-3)}
.anod>.iso-edge{stroke:var(--cel-or-edge)}
.glass>.iso-top{fill:var(--cel-or-top);fill-opacity:.94}
.layer{transition:opacity .35s var(--anatomy-ease)}
.focusing .layer:not(.on){opacity:.22}
.cel-legend{list-style:none;margin:14px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px}
.cel-legend button{all:unset;box-sizing:border-box;width:100%;display:flex;gap:10px;align-items:center;padding:7px 10px;border-radius:8px;cursor:pointer;color:var(--anatomy-text);font:13px/1.35 inherit;box-shadow:var(--anatomy-lift);background:var(--anatomy-card)}
.cel-legend button:hover,.cel-legend button.on,.cel-legend button:focus-visible{color:var(--anatomy-strong);outline:1px solid var(--anatomy-mid)}
.cel-legend .n{font:11px/1 var(--anatomy-mono);color:var(--anatomy-muted);min-width:14px}
.cel-legend button.on .n{color:#f08a4b}
</style>`;

const body =
  CSS +
  k.plateHtml({
    fig: "Fig 1",
    title: "Smartphone, vista explodida",
    hint: "Mova o cursor para cima e para baixo",
    readout: `explosão ${Math.round(START * 100)}%`,
    keys: [
      { mark: "lit", label: "SoC, lente principal e USB-C: as peças em destaque" },
      { mark: "raised", label: "Sete camadas, da tela ao vidro traseiro" },
    ],
    caption:
      "Sete camadas empilhadas em cerca de 8 mm de espessura. Mova o cursor para cima para separar as camadas e passe sobre uma delas (ou sobre a lista abaixo) para destacá-la. Bateria de 3274 mAh, tela OLED de 2556 × 1179 e anel MagSafe no centro do chassi.",
    body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Vista explodida do celular: setas abrem e fecham as camadas" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(START * 100)}">${svg}</div>`,
  }) +
  legend;

const out = theme === "light" ? "celular-explodido-light.html" : "celular-explodido.html";
writeFileSync(join(HERE, out), k.pageHtml({ title: "Celular explodido", theme, body, script: kitScript() + live, width: 680 }).replace('<html lang="en">', '<html lang="pt-BR">'));
console.log("wrote", out);
