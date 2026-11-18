// Vitrine em bento grid com os exemplos da skill anatomy, cada um vivo dentro do seu bloco.
// node build.mjs → index.html (mesmo arquivo publicado como Artifact)
import { readFileSync, writeFileSync } from "node:fs";
const E = new URL("paginas/", import.meta.url);
const EMBED = readFileSync(new URL("embed.css", import.meta.url), "utf8");
const sizes = JSON.parse(readFileSync(new URL("sizes.json", import.meta.url), "utf8"));
const TILES = [
  { id: "camera", f: "camera.html", cls: "big", name: "Câmera, vista explodida", hint: "passe o mouse para desmontar · toque numa peça", zoom: 0.97 },
  { id: "lente", f: "lente.html", cls: "", name: "Lente, foco", hint: "mova o ponteiro para focar", zoom: 1.12 },
  { id: "diafragma", f: "diafragma.html", cls: "", name: "Diafragma", hint: "mova o ponteiro para fechar", zoom: 1.12 },
  { id: "obturador", f: "obturador.html", cls: "", name: "Obturador", hint: "escolha a velocidade e veja em câmera lenta", zoom: 1.08 },
  { id: "visor", f: "visor.html", cls: "", name: "Visor eletrônico", hint: "passe o mouse para ligar o HUD", zoom: 1.12 },
  { id: "sensor", f: "sensor.html", cls: "", name: "Sensor, matriz Bayer", hint: "o ponteiro é um feixe de luz", zoom: 1.04 },
  { id: "bateria", f: "bateria.html", cls: "", name: "Bateria", hint: "passe o mouse para fotografar", zoom: 1.12 },
  { id: "placa", f: "placa.html", cls: "wide", name: "Placa principal", hint: "passe o mouse para processar uma foto", zoom: 1.02 },
];
const json = (s) => JSON.stringify(s).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
const data = TILES.map((t) => {
  const html = readFileSync(new URL(t.f, E), "utf8").replace("</head>", `<style>${EMBED}</style></head>`);
  const [w, h] = sizes[t.f];
  return `<script type="application/json" id="src-${t.id}">${json(html)}</script>`;
}).join("\n");
const tiles = TILES.map((t) => { const [w, h] = sizes[t.f]; return `<section class="tile ${t.cls}" data-id="${t.id}" data-w="${w}" data-h="${h}" data-zoom="${t.zoom}">
  <div class="frame"><iframe title="${t.name}" loading="lazy" tabindex="0"></iframe></div>
  <div class="cap"><span class="name">${t.name}</span><span class="hint">${t.hint}</span></div>
  <button type="button" class="grow" aria-label="Ampliar ${t.name}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></button>
</section>`; }).join("\n");

const page = `<title>Câmera em Bento</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* vitrine: fundo cinza, blocos pretos arredondados, desenhos vivos sem moldura */
:root { --page: #5d5e60; --tile: #0b0b0b; --ink: #f2f2f2; --muted: rgba(242,242,242,.6); --chip: rgba(255,255,255,.92); --accent: #f0551e; color-scheme: dark; }
body { background: var(--page); color: var(--ink); font: 14px/1.4 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
.wrap { max-width: 1120px; margin: 0 auto; padding-block: 28px 56px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.badge { display: inline-flex; align-items: center; gap: 12px; background: var(--chip); color: #111; border-radius: 12px; padding: 8px 18px 8px 8px; font-weight: 700; font-size: clamp(22px, 3.2vw, 34px); letter-spacing: -.03em; box-shadow: 0 8px 24px -10px rgba(0,0,0,.45); }
.badge b { display: grid; place-items: center; width: 1.45em; height: 1.45em; border-radius: 50%; background: var(--accent); color: #fff; font-size: .72em; letter-spacing: 0; }
.sub { margin: 12px 0 22px; color: rgba(255,255,255,.75); font-size: 14px; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 330px; gap: 12px; grid-auto-flow: dense; }
.tile { position: relative; border-radius: 18px; background: var(--tile); overflow: hidden; box-shadow: 0 1px 0 rgba(255,255,255,.06) inset, 0 18px 40px -24px rgba(0,0,0,.7); isolation: isolate; }
.tile.tall { grid-row: span 2; }
.tile.wide { grid-column: span 2; }
.tile.big { grid-column: span 2; grid-row: span 2; }
.frame { position: absolute; inset: 0; overflow: hidden; }
.frame iframe { position: absolute; left: 50%; top: 50%; border: 0; background: var(--tile); transform-origin: 0 0; }
.cap { position: absolute; left: 14px; bottom: 12px; right: 56px; display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; pointer-events: none; opacity: 0; transform: translateY(4px); transition: opacity 220ms ease, transform 260ms cubic-bezier(.32,.72,0,1); }
.tile:hover .cap, .tile:focus-within .cap { opacity: 1; transform: none; }
.cap .name { font-weight: 600; font-size: 13px; }
.cap .hint { font: 11px ui-monospace, Menlo, monospace; color: var(--muted); }
.grow { position: absolute; right: 10px; bottom: 10px; width: 34px; height: 34px; border: 0; border-radius: 10px; background: rgba(255,255,255,.08); color: var(--ink); display: grid; place-items: center; cursor: pointer; opacity: 0; transition: opacity 200ms, background 150ms; }
.grow svg { width: 15px; height: 15px; }
.tile:hover .grow, .grow:focus-visible { opacity: 1; }
.grow:hover, .grow:focus-visible { background: rgba(255,255,255,.18); outline: none; }
.grow:active { transform: scale(.94); }
/* bloco ampliado */
.tile.open { position: fixed; inset: max(12px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) max(12px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px)); z-index: 20; grid-row: auto; grid-column: auto; }
.tile.open .grow, .tile.open .cap { opacity: 1; transform: none; }
.scrim { position: fixed; inset: 0; background: rgba(20,20,22,.7); backdrop-filter: blur(6px); z-index: 19; opacity: 0; pointer-events: none; transition: opacity 220ms; }
.scrim.on { opacity: 1; pointer-events: auto; }
.foot { margin-top: 18px; color: rgba(255,255,255,.7); font: 12px ui-monospace, Menlo, monospace; }
@media (max-width: 720px) {
  .grid { grid-template-columns: 1fr; grid-auto-rows: 300px; }
  .tile.wide, .tile.big { grid-column: auto; }
  .tile.big { grid-row: span 2; }
  .tile.tall { grid-row: span 2; }
  .cap, .grow { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) { .cap, .scrim { transition: none; } }
</style>
<div class="wrap">
  <span class="badge"><b>${TILES.length}</b>bento grids</span>
  <p class="sub">A câmera, peça por peça, desenhada com a skill <b>anatomy</b>: passe o mouse, clique e arraste em cada bloco.</p>
  <div class="grid">${tiles}</div>
  <p class="foot">Câmera genérica e didática · posição de placas e bateria varia conforme o modelo · feito com a skill anatomy.</p>
</div>
<div class="scrim" id="scrim"></div>
${data}
<script>
(() => {
  const tiles = [...document.querySelectorAll('.tile')];
  function fit(t) {
    const f = t.querySelector('iframe'), w = +t.dataset.w, h = +t.dataset.h, z = +t.dataset.zoom;
    const r = t.getBoundingClientRect(); const open = t.classList.contains('open');
    const s = Math.min(r.width / w, r.height / h) * (open ? 1 : z);
    f.style.width = w + 'px'; f.style.height = h + 'px';
    f.style.transform = 'scale(' + s.toFixed(4) + ') translate(-50%, -50%)';
  }
  function load(t) { const f = t.querySelector('iframe'); if (f.dataset.loaded) return; f.dataset.loaded = '1'; f.srcdoc = JSON.parse(document.getElementById('src-' + t.dataset.id).textContent); }
  const ro = new ResizeObserver((es) => es.forEach((e) => fit(e.target)));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) load(e.target); }), { rootMargin: '200px 0px' });
  tiles.forEach((t) => { ro.observe(t); io.observe(t); fit(t); });
  const scrim = document.getElementById('scrim');
  let opened = null;
  function toggle(t) {
    if (opened && opened !== t) toggle(opened);
    const on = !t.classList.contains('open'); t.classList.toggle('open', on); scrim.classList.toggle('on', on); opened = on ? t : null;
    t.querySelector('.grow').setAttribute('aria-label', (on ? 'Fechar ' : 'Ampliar ') + t.querySelector('.name').textContent);
    requestAnimationFrame(() => fit(t)); if (on) t.querySelector('iframe').focus();
  }
  tiles.forEach((t) => t.querySelector('.grow').addEventListener('click', () => toggle(t)));
  scrim.addEventListener('click', () => opened && toggle(opened));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && opened) toggle(opened); });
})();
</script>`;
writeFileSync(new URL("index.html", import.meta.url), page);
console.log("index.html", (page.length / 1048576).toFixed(2) + " MB");
