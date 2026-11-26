#!/usr/bin/env node
/**
 * Gera os assets de DEMONSTRAÇÃO do PRESET LAB, 100% próprios (sem imagens de terceiros):
 *  - public/demo/scenes/*.webp      → cenas fotográficas renderizadas a partir de SVG
 *  - public/demo/products/*-before|after.webp → antes/depois de cada preset (grade aplicada com sharp)
 *  - private-files/demo/<slug>/*.xmp|.zip → presets reais do Lightroom (formato XMP / Camera Raw)
 *
 * Uso: npm run assets:generate
 */
import sharp from "sharp";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { DEMO_PRODUCTS, DEMO_INSPIRATION } from "../src/content/demo-catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = 1200;
const H = 1500;

// ---------- utilidades SVG ----------
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const grain = (o = 0.18) => `
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
  <feColorMatrix type="saturate" values="0"/></filter>
  <rect width="100%" height="100%" filter="url(#grain)" opacity="${o}" style="mix-blend-mode:overlay"/>`;
const blur = (id, s) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${s}"/></filter>`;
const sky = (id, stops) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join("")}</linearGradient>`;
const ridge = (y, amp, step, color, op = 1) => {
  let d = `M0 ${H} L0 ${y}`;
  for (let x = 0; x <= W + step; x += step) d += ` L${x} ${y - rnd() * amp}`;
  return `<path d="${d} L${W} ${H} Z" fill="${color}" opacity="${op}"/>`;
};
const smoothRidge = (y, amp, waves, color, op = 1, phase = 0) => {
  let d = `M0 ${H} L0 ${y}`;
  for (let x = 0; x <= W; x += 20) d += ` L${x} ${(y - Math.sin((x / W) * Math.PI * waves + phase) * amp).toFixed(1)}`;
  return `<path d="${d} L${W} ${H} Z" fill="${color}" opacity="${op}"/>`;
};
const svg = (defs, body, g = 0.16) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`;

// ---------- cenas ----------
const SCENES = {
  dunes() {
    seed = 11;
    return svg(
      sky("s", [[0, "#f6b26b"], [0.45, "#f9d9a8"], [1, "#e08a4f"]]) + blur("b", 40),
      `<rect width="100%" height="100%" fill="url(#s)"/>
       <circle cx="820" cy="520" r="110" fill="#fff4dc" filter="url(#b)"/><circle cx="820" cy="520" r="70" fill="#fff8ea"/>
       ${smoothRidge(900, 60, 1.3, "#d9773d")}${smoothRidge(1020, 80, 2.1, "#c2622d", 1, 1.2)}
       ${smoothRidge(1180, 70, 1.6, "#9e4a20", 1, 2.4)}${smoothRidge(1340, 50, 2.8, "#6f3416", 1, 0.6)}`
    );
  },
  alpine() {
    seed = 23;
    return svg(
      sky("s", [[0, "#8fb3d9"], [0.5, "#d9e6f2"], [1, "#f2f2ee"]]) + blur("f", 30),
      `<rect width="100%" height="100%" fill="url(#s)"/>
       ${ridge(700, 260, 60, "#7d93ad", 0.6)}${ridge(820, 240, 50, "#5c7189", 0.8)}
       <rect y="760" width="100%" height="220" fill="#e8eef4" opacity="0.55" filter="url(#f)"/>
       ${ridge(1000, 200, 40, "#33465a")}${ridge(1180, 160, 30, "#1e2c3a")}${ridge(1350, 80, 25, "#0f1720")}`
    );
  },
  ocean() {
    seed = 5;
    let lines = "";
    for (let i = 0; i < 60; i++) {
      const y = 860 + i * 11 + rnd() * 6;
      const w = 40 + rnd() * 240 * (1 - i / 80);
      lines += `<rect x="${600 - w / 2 + (rnd() - 0.5) * 120}" y="${y}" width="${w}" height="3" fill="#ffe3b0" opacity="${0.7 - i / 100}"/>`;
    }
    return svg(
      sky("s", [[0, "#2b3a67"], [0.35, "#c86b5a"], [0.58, "#f4b27a"], [0.58, "#3d4f73"], [1, "#101b33"]]) + blur("b", 50),
      `<rect width="100%" height="100%" fill="url(#s)"/>
       <circle cx="600" cy="840" r="160" fill="#ffd9a0" filter="url(#b)" opacity="0.9"/><circle cx="600" cy="850" r="62" fill="#fff1d6"/>
       <rect y="870" width="100%" height="630" fill="#1c2a4a" opacity="0.55"/>${lines}`
    );
  },
  neon() {
    seed = 41;
    let b = "";
    for (let i = 0; i < 9; i++) {
      const x = i * 140 - 30;
      const h = 600 + rnd() * 600;
      b += `<rect x="${x}" y="${1000 - h}" width="${130 + rnd() * 40}" height="${h}" fill="#0c0f1a"/>`;
      for (let j = 0; j < 22; j++) if (rnd() > 0.55) b += `<rect x="${x + 12 + (j % 4) * 28}" y="${1000 - h + 30 + Math.floor(j / 4) * 60}" width="14" height="26" fill="#ffcf7a" opacity="${0.3 + rnd() * 0.6}"/>`;
    }
    const neon = [["#ff3d7f", 180, 520], ["#2de2e6", 760, 460], ["#ff7a18", 470, 640], ["#a855f7", 980, 600]];
    const signs = neon.map(([c, x, y]) => `<rect x="${x}" y="${y}" width="150" height="46" rx="10" fill="${c}" filter="url(#g)"/><rect x="${x}" y="${y}" width="150" height="46" rx="10" fill="none" stroke="#fff" stroke-width="3" opacity="0.8"/>`).join("");
    const refl = neon.map(([c, x]) => `<rect x="${x + 30}" y="1040" width="90" height="420" fill="${c}" opacity="0.35" filter="url(#g)"/>`).join("");
    return svg(
      sky("s", [[0, "#05060c"], [0.6, "#1a1330"], [1, "#0b0b14"]]) + blur("g", 18),
      `<rect width="100%" height="100%" fill="url(#s)"/>${b}${signs}
       <rect y="1000" width="100%" height="500" fill="#07080f"/>${refl}
       <path d="M600 1000 L-200 1500 L1400 1500 Z" fill="#141826" opacity="0.6"/>`,
      0.22
    );
  },
  forest() {
    seed = 3;
    let t = "";
    for (let layer = 0; layer < 4; layer++) {
      for (let i = 0; i < 9; i++) {
        const x = rnd() * W;
        const w = 18 + layer * 16 + rnd() * 14;
        const shade = ["#9fb5a6", "#6f8a78", "#3f5a49", "#1d2d23"][layer];
        t += `<rect x="${x}" y="0" width="${w}" height="${H}" fill="${shade}" opacity="${0.5 + layer * 0.15}"/>`;
      }
      t += `<rect width="100%" height="100%" fill="#dfe8e1" opacity="0.18"/>`;
    }
    return svg(
      sky("s", [[0, "#e9efe9"], [1, "#a8bba9"]]) + blur("f", 60),
      `<rect width="100%" height="100%" fill="url(#s)"/>${t}
       <ellipse cx="600" cy="1250" rx="900" ry="220" fill="#eef3ee" opacity="0.5" filter="url(#f)"/>
       <rect y="1380" width="100%" height="120" fill="#16231a"/>`
    );
  },
  portrait() {
    return svg(
      `<radialGradient id="l" cx="0.25" cy="0.3" r="0.9"><stop offset="0" stop-color="#f1d2b0"/><stop offset="0.45" stop-color="#6a4a3a"/><stop offset="1" stop-color="#140d0b"/></radialGradient>
       <linearGradient id="skin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f3c9a2"/><stop offset="0.55" stop-color="#a9694a"/><stop offset="1" stop-color="#2a1610"/></linearGradient>` +
        blur("b", 25),
      `<rect width="100%" height="100%" fill="url(#l)"/>
       <rect x="40" y="120" width="300" height="720" fill="#fff1dc" opacity="0.18" filter="url(#b)"/>
       <path d="M300 1500 C320 1180 420 1080 600 1060 C780 1080 880 1180 900 1500 Z" fill="#1d1512"/>
       <rect x="545" y="900" width="110" height="200" fill="url(#skin)"/>
       <ellipse cx="600" cy="720" rx="190" ry="245" fill="url(#skin)"/>
       <path d="M400 700 C390 440 520 380 610 385 C740 380 830 470 805 700 C790 560 720 520 600 520 C500 520 430 560 400 700 Z" fill="#1a100c"/>
       <path d="M410 690 C380 860 420 980 470 1000 C430 900 430 800 440 700 Z" fill="#1a100c"/>`,
      0.2
    );
  },
  wedding() {
    seed = 77;
    let bokeh = "";
    for (let i = 0; i < 34; i++) bokeh += `<circle cx="${rnd() * W}" cy="${rnd() * 900}" r="${20 + rnd() * 70}" fill="${rnd() > 0.5 ? "#ffe4b5" : "#fff6e6"}" opacity="${0.15 + rnd() * 0.35}" filter="url(#b)"/>`;
    return svg(
      sky("s", [[0, "#f7d7a8"], [0.6, "#e9b984"], [1, "#7b5a3c"]]) + blur("b", 10) + blur("bb", 50),
      `<rect width="100%" height="100%" fill="url(#s)"/>${bokeh}
       <ellipse cx="600" cy="600" rx="420" ry="300" fill="#fff3dc" opacity="0.5" filter="url(#bb)"/>
       <path d="M470 1500 L500 980 C505 900 560 880 585 900 L600 1500 Z" fill="#2a2420"/>
       <circle cx="545" cy="850" r="62" fill="#2a2420"/>
       <path d="M590 1500 C620 1200 640 1040 660 980 C680 920 760 920 770 990 C800 1120 860 1300 900 1500 Z" fill="#fbf6ee"/>
       <circle cx="700" cy="880" r="58" fill="#3b2a20"/>
       <path d="M640 860 C650 780 760 780 765 870 C780 950 690 1000 640 860 Z" fill="#fbf6ee" opacity="0.7"/>`,
      0.14
    );
  },
  skyline() {
    seed = 19;
    let b = "";
    for (let x = 0; x < W; x += 70 + Math.floor(rnd() * 50)) {
      const h = 200 + rnd() * 520;
      const w = 60 + rnd() * 60;
      b += `<rect x="${x}" y="${1150 - h}" width="${w}" height="${h + 400}" fill="#141a2b"/>`;
      for (let y = 1150 - h + 20; y < 1130; y += 34) for (let wx = x + 8; wx < x + w - 10; wx += 18) if (rnd() > 0.62) b += `<rect x="${wx}" y="${y}" width="8" height="14" fill="#ffd38a" opacity="0.8"/>`;
    }
    return svg(
      sky("s", [[0, "#1b2340"], [0.45, "#6b4d7a"], [0.72, "#f08a5d"], [1, "#ffc387"]]),
      `<rect width="100%" height="100%" fill="url(#s)"/>${b}<rect y="1150" width="100%" height="350" fill="#0d1120"/>`
    );
  },
  lake() {
    seed = 31;
    const top = `${ridge(760, 280, 55, "#4f6e6a", 0.85)}${ridge(820, 180, 40, "#2c4541")}`;
    return svg(
      sky("s", [[0, "#cfe2e6"], [0.5, "#f4e9d8"], [0.5, "#bcd2d2"], [1, "#6e8f8f"]]) + blur("r", 6),
      `<rect width="100%" height="100%" fill="url(#s)"/>
       <g>${top}</g>
       <g transform="translate(0 1640) scale(1 -1)" opacity="0.55" filter="url(#r)">${top}</g>
       <rect y="820" width="100%" height="680" fill="#7fa2a2" opacity="0.35"/>
       <rect y="818" width="100%" height="4" fill="#f6efe3" opacity="0.7"/>`
    );
  },
  road() {
    return svg(
      sky("s", [[0, "#5e88b8"], [0.55, "#f2d1a6"], [0.56, "#c98a55"], [1, "#6d4426"]]),
      `<rect width="100%" height="100%" fill="url(#s)"/>
       ${smoothRidge(830, 60, 1.2, "#8a5f4a", 0.8)}
       <path d="M560 840 L640 840 L1150 1500 L50 1500 Z" fill="#2b2b2e"/>
       <path d="M596 850 L604 850 L615 940 L585 940 Z M582 990 L618 990 L640 1150 L560 1150 Z M552 1220 L648 1220 L690 1500 L510 1500 Z" fill="#f5d36a"/>`
    );
  },
  bloom() {
    seed = 59;
    let c = "";
    for (let i = 0; i < 46; i++) c += `<circle cx="${rnd() * W}" cy="${500 + rnd() * 1000}" r="${30 + rnd() * 110}" fill="${["#f28db2", "#ffd166", "#ef476f", "#fbe3ee", "#b5e48c"][i % 5]}" opacity="${0.25 + rnd() * 0.5}" filter="url(#b)"/>`;
    return svg(
      sky("s", [[0, "#fdf0e6"], [0.5, "#c9e4b4"], [1, "#4f7a3a"]]) + blur("b", 26),
      `<rect width="100%" height="100%" fill="url(#s)"/>${c}
       <path d="M600 1500 C590 1200 610 1050 600 880" stroke="#3d5a2a" stroke-width="10" fill="none"/>
       ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="600" cy="800" rx="46" ry="110" fill="#ef6f9a" transform="rotate(${a} 600 880) translate(0 -20)"/>`).join("")}
       <circle cx="600" cy="880" r="38" fill="#ffd166"/>`
    );
  },
  concrete() {
    return svg(
      sky("s", [[0, "#9ec5e8"], [1, "#e6eef5"]]),
      `<rect width="100%" height="100%" fill="url(#s)"/>
       <path d="M0 520 L760 300 L1200 420 L1200 1500 L0 1500 Z" fill="#d8d3cb"/>
       <path d="M760 300 L1200 420 L1200 1500 L760 1500 Z" fill="#a9a398"/>
       <path d="M0 900 L760 700 L760 1500 L0 1500 Z" fill="#8d877d"/>
       ${Array.from({ length: 8 }, (_, i) => `<rect x="${90 + i * 80}" y="${560 - i * 26}" width="34" height="200" fill="#5d5850" transform="skewY(-15)"/>`).join("")}
       <path d="M760 700 L1200 820 L1200 1500 L760 1500 Z" fill="#3e3a35"/>`
    );
  },
  tropic() {
    const palm = (x, s, r) => `<g transform="translate(${x} 0) rotate(${r} 0 1500) scale(${s})">
       <path d="M0 1500 C10 1100 30 800 80 560" stroke="#1d2a1f" stroke-width="18" fill="none"/>
       ${[-60, -25, 10, 45, 80, 120].map((a) => `<path d="M80 560 q ${Math.cos((a * Math.PI) / 180) * 160} ${-Math.sin((a * Math.PI) / 180) * 120} ${Math.cos((a * Math.PI) / 180) * 300} ${Math.sin((-a * Math.PI) / 180) * 40 + 160}" stroke="#1d2a1f" stroke-width="22" fill="none" stroke-linecap="round"/>`).join("")}</g>`;
    return svg(
      sky("s", [[0, "#ff9a62"], [0.4, "#ffd1a1"], [0.62, "#7fc7c6"], [1, "#e9d6b0"]]) + blur("b", 40),
      `<rect width="100%" height="100%" fill="url(#s)"/><circle cx="420" cy="760" r="90" fill="#fff2d8" filter="url(#b)"/>
       <rect y="930" width="100%" height="260" fill="#3f9aa3" opacity="0.65"/><path d="M0 1180 C300 1150 800 1220 1200 1160 L1200 1500 L0 1500 Z" fill="#e8d1a5"/>
       ${palm(820, 1, -6)}${palm(1000, 0.8, 4)}`
    );
  },
  still() {
    return svg(
      `<radialGradient id="bg" cx="0.7" cy="0.25" r="1"><stop offset="0" stop-color="#5a4a3e"/><stop offset="1" stop-color="#0f0c0a"/></radialGradient>
       <radialGradient id="sp" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffd9a8"/><stop offset="0.5" stop-color="#d0622b"/><stop offset="1" stop-color="#3a160a"/></radialGradient>
       <linearGradient id="cy" x1="0" x2="1"><stop offset="0" stop-color="#e9e2d6"/><stop offset="0.6" stop-color="#9c9488"/><stop offset="1" stop-color="#2d2a26"/></linearGradient>` +
        blur("b", 30),
      `<rect width="100%" height="100%" fill="url(#bg)"/>
       <rect y="1050" width="100%" height="450" fill="#2a211b"/>
       <ellipse cx="520" cy="1080" rx="260" ry="40" fill="#000" opacity="0.6" filter="url(#b)"/>
       <circle cx="470" cy="900" r="190" fill="url(#sp)"/>
       <rect x="720" y="600" width="210" height="480" fill="url(#cy)"/><ellipse cx="825" cy="600" rx="105" ry="26" fill="#f4eee4"/>
       <ellipse cx="825" cy="1080" rx="105" ry="26" fill="#2d2a26"/>`,
      0.2
    );
  },
};

// ---------- grades (antes = câmera "flat"; depois = preset aplicado) ----------
const flat = (img) => img.modulate({ saturation: 0.62, brightness: 1.04 }).linear(0.72, 34);
const GRADES = {
  cinematic: (i) => i.recomb([[1.12, 0.02, -0.08], [-0.03, 1.02, 0.03], [-0.1, 0.06, 1.12]]).modulate({ saturation: 1.12 }).linear(1.12, -14),
  vintage: (i) => i.recomb([[0.95, 0.12, 0.05], [0.06, 0.88, 0.08], [0.06, 0.12, 0.7]]).linear(0.86, 28).modulate({ saturation: 0.82 }),
  editorial: (i) => i.linear(1.22, -24).modulate({ saturation: 0.9, brightness: 1.02 }),
  clean: (i) => i.modulate({ brightness: 1.08, saturation: 0.95 }).linear(1.05, 6).tint({ r: 246, g: 250, b: 255 }),
  moody: (i) => i.modulate({ brightness: 0.82, saturation: 0.7 }).recomb([[0.92, 0.05, 0.03], [0.02, 0.98, 0.04], [0.02, 0.1, 1.02]]).linear(1.18, -20),
  mono: (i) => i.grayscale().linear(1.3, -30),
  warm: (i) => i.recomb([[1.1, 0.04, 0], [0.02, 1.02, 0], [-0.04, 0, 0.88]]).modulate({ saturation: 1.08 }).linear(1.06, -4),
};

// ---------- presets XMP reais (Adobe Camera Raw / Lightroom) ----------
const XMP_SETTINGS = {
  cinematic: { Exposure2012: "+0.10", Contrast2012: "+18", Highlights2012: "-42", Shadows2012: "+30", Whites2012: "+8", Blacks2012: "-12", Clarity2012: "+6", Vibrance: "+8", Saturation: "-6", SplitToningShadowHue: "200", SplitToningShadowSaturation: "22", SplitToningHighlightHue: "38", SplitToningHighlightSaturation: "26", ColorGradeBlending: "60" },
  vintage: { Exposure2012: "+0.05", Contrast2012: "-12", Highlights2012: "-30", Shadows2012: "+22", Blacks2012: "+24", Vibrance: "-10", Saturation: "-14", Temperature: "+6", GrainAmount: "28", GrainSize: "30", GrainFrequency: "50", SplitToningHighlightHue: "45", SplitToningHighlightSaturation: "20" },
  editorial: { Contrast2012: "+28", Highlights2012: "-20", Shadows2012: "+10", Whites2012: "+14", Blacks2012: "-18", Clarity2012: "+12", Texture: "+10", Saturation: "-8" },
  clean: { Exposure2012: "+0.25", Contrast2012: "+6", Highlights2012: "-24", Shadows2012: "+26", Whites2012: "+10", Vibrance: "+6", Saturation: "-2", Clarity2012: "+4" },
  moody: { Exposure2012: "-0.20", Contrast2012: "+14", Highlights2012: "-50", Shadows2012: "-6", Blacks2012: "+12", Vibrance: "-12", Saturation: "-20", Dehaze: "+8", SplitToningShadowHue: "190", SplitToningShadowSaturation: "18" },
  mono: { ConvertToGrayscale: "True", Contrast2012: "+32", Highlights2012: "-18", Shadows2012: "+14", Blacks2012: "-20", Clarity2012: "+14", GrainAmount: "20" },
  warm: { Temperature: "+12", Tint: "+4", Contrast2012: "+10", Highlights2012: "-28", Shadows2012: "+18", Vibrance: "+12", SplitToningHighlightHue: "35", SplitToningHighlightSaturation: "18" },
};
const xmp = (name, grade) => {
  const s = XMP_SETTINGS[grade];
  const uuid = crypto.createHash("md5").update(name).digest("hex").toUpperCase();
  const attrs = Object.entries(s)
    .map(([k, v]) => `   crs:${k}="${v}"`)
    .join("\n");
  return `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/"
   crs:PresetType="Normal"
   crs:UUID="${uuid}"
   crs:SupportsAmount="True"
   crs:SupportsColor="True"
   crs:SupportsMonochrome="True"
   crs:SupportsHighDynamicRange="True"
   crs:SupportsNormalDynamicRange="True"
   crs:SupportsSceneReferred="True"
   crs:SupportsOutputReferred="True"
   crs:Copyright="PRESET LAB — demonstração"
   crs:Version="15.0"
   crs:ProcessVersion="11.0"
${attrs}
   crs:HasSettings="True">
   <crs:Name><rdf:Alt><rdf:li xml:lang="x-default">${name}</rdf:li></rdf:Alt></crs:Name>
   <crs:Group><rdf:Alt><rdf:li xml:lang="x-default">PRESET LAB</rdf:li></rdf:Alt></crs:Group>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
`;
};

async function renderScene(name, width = W, height = H) {
  const base = await sharp(Buffer.from(SCENES[name]()), { density: 72 }).resize(width, height, { fit: "cover" }).png().toBuffer();
  // grão de filme (ruído gaussiano em soft-light) para dar textura fotográfica
  const noise = await sharp({ create: { width, height, channels: 3, background: "#808080", noise: { type: "gaussian", mean: 128, sigma: 10 } } }).grayscale().png().toBuffer();
  const vignette = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><radialGradient id="v" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#v)"/></svg>`);
  return sharp(base).composite([{ input: noise, blend: "soft-light" }, { input: vignette }]).png().toBuffer();
}

async function main() {
  const demo = path.join(root, "public/demo");
  const priv = path.join(root, "private-files/demo");
  await rm(demo, { recursive: true, force: true });
  await rm(priv, { recursive: true, force: true });
  await mkdir(path.join(demo, "scenes"), { recursive: true });
  await mkdir(path.join(demo, "products"), { recursive: true });
  await mkdir(path.join(demo, "inspiration"), { recursive: true });

  const raw = {};
  for (const name of Object.keys(SCENES)) {
    raw[name] = await renderScene(name);
    await sharp(raw[name]).webp({ quality: 72 }).toFile(path.join(demo, "scenes", `${name}.webp`));
  }
  // versões panorâmicas para o hero
  for (const name of ["neon", "ocean", "dunes"]) {
    const wide = await sharp(raw[name]).resize(1920, 1200, { fit: "cover", position: "centre" }).png().toBuffer();
    await sharp(wide).webp({ quality: 72 }).toFile(path.join(demo, "scenes", `${name}-wide.webp`));
  }

  for (const p of DEMO_PRODUCTS) {
    const base = raw[p.scene];
    await flat(sharp(base)).webp({ quality: 72 }).toFile(path.join(demo, "products", `${p.slug}-before.webp`));
    await GRADES[p.grade](sharp(base)).webp({ quality: 74 }).toFile(path.join(demo, "products", `${p.slug}-after.webp`));
    for (const [i, g] of (p.gallery || []).entries()) {
      await GRADES[p.grade](sharp(raw[g])).webp({ quality: 70 }).toFile(path.join(demo, "products", `${p.slug}-g${i + 1}.webp`));
    }
    const dir = path.join(priv, p.slug);
    await mkdir(dir, { recursive: true });
    const xmpName = `${p.slug}.xmp`;
    await writeFile(path.join(dir, xmpName), xmp(p.name, p.grade));
    await writeFile(
      path.join(dir, "LEIA-ME.txt"),
      `${p.name} — PRESET LAB (produto de demonstração)\n\nLightroom Desktop: Arquivo > Importar perfis e predefinições > selecione o .xmp.\nLightroom Mobile: abra uma foto > Predefinições > ⋯ > Importar predefinições > selecione o .xmp ou o .zip.\n`
    );
    execFileSync("zip", ["-q", "-j", path.join(dir, `${p.slug}.zip`), path.join(dir, xmpName), path.join(dir, "LEIA-ME.txt")]);
    await rm(path.join(dir, "LEIA-ME.txt"));
  }

  for (const post of DEMO_INSPIRATION) {
    await GRADES[post.grade](sharp(raw[post.scene])).webp({ quality: 72 }).toFile(path.join(demo, "inspiration", `${post.slug}.webp`));
  }
  console.log(`OK: ${Object.keys(SCENES).length} cenas, ${DEMO_PRODUCTS.length} produtos, ${DEMO_INSPIRATION.length} inspirações.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
