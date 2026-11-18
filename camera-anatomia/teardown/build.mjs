// node build.mjs → index.html (local, three do node_modules) e artifact.html (three do jsDelivr)
import { readFileSync, writeFileSync } from "node:fs";
const r = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
const app = [r("_head.js"), r("_geo.js"), r("_model.js"), r("_tail.js")].join("\n");
const page = r("_page.html");
const map = (base) => `<script type="importmap">{"imports":{"three":"${base}/build/three.module.js","three/addons/":"${base}/examples/jsm/"}}</script>`;
const script = `<script type="module">${app.replace(/<\/(script)/gi, "<\\/$1")}</script>`;
writeFileSync(new URL("artifact.html", import.meta.url), page + map("https://cdn.jsdelivr.net/npm/three@0.170.0") + script);
writeFileSync(new URL("index.html", import.meta.url), `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` + page.replace("<div class=\"app\">", "</head><body><div class=\"app\">") + map("../node_modules/three") + script + "</body></html>");
console.log("ok", (app.length / 1024).toFixed(0) + " KB");
