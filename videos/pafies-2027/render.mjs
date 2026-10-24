// Renderiza o vídeo quadro a quadro (Playwright) e junta com a narração e a trilha (ffmpeg).
// Uso: node render.mjs [--4k | --1080] [--fps 30] [--partes 4] [--saida arquivo.mp4]
// --partes divide o trabalho entre vários navegadores ao mesmo tempo (use o número de núcleos).
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const aqui = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (nome, padrao) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : padrao; };
const escala = args.includes("--1080") ? 1 : 2; // 2 = 3840 × 2160 (4K)
const fps = Number(opt("--fps", 30));
const partes = Number(opt("--partes", Math.max(1, os.cpus().length)));
const saida = path.resolve(aqui, opt("--saida", escala === 2 ? "pafies-2027-4k.mp4" : "pafies-2027-1080p.mp4"));

// Lê a configuração do mesmo arquivo usado pelo index.html
const config = (() => { const window = {}; new Function("window", fs.readFileSync(path.join(aqui, "config.js"), "utf8"))(window); return window.PAFIES; })();
const quadros = Math.round(config.duracao * fps);

const roda = (cmd, lista, stdin = "ignore") => {
  const p = spawn(cmd, lista, { stdio: [stdin, "inherit", "inherit"] });
  p.fim = new Promise((res, rej) => p.on("close", c => (c === 0 ? res() : rej(new Error(`${cmd} saiu com código ${c}`)))));
  return p;
};

// Uma parte: renderiza os quadros [de, ate) num vídeo sem som
async function parte(de, ate, arquivo) {
  const { chromium } = require("playwright");
  const ff = roda("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", escala === 2 ? "19" : "17", "-pix_fmt", "yuv420p", "-profile:v", "high",
    arquivo], "pipe");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: escala });
  page.on("pageerror", e => console.error("erro na página:", e.message));
  await page.goto(pathToFileURL(path.join(aqui, "index.html")).href + "?render=1");
  await page.evaluate(() => window.pronto);
  for (let f = de; f < ate; f++) {
    await page.evaluate(t => window.renderAt(t), f / fps);
    const jpg = await page.screenshot({ type: "jpeg", quality: 93 });
    if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once("drain", r));
    if ((f - de) % (fps * 5) === 0) console.log(`parte ${de}-${ate}: ${(f / fps).toFixed(1)} s`);
  }
  ff.stdin.end();
  await browser.close();
  await ff.fim;
}

const iParte = args.indexOf("--parte");
if (iParte >= 0) {
  const [de, ate, arquivo] = args.slice(iParte + 1, iParte + 4);
  await parte(Number(de), Number(ate), arquivo);
  process.exit(0);
}

// Formas de cromo: renderiza cada uma em 72 ângulos (uma vez só; refaz se mudar cromo.js ou os elementos)
async function assaFormas() {
  const { chromium } = require("playwright");
  const crypto = require("node:crypto");
  const pasta = path.join(aqui, ".cromo");
  const assinatura = crypto.createHash("sha1")
    .update(fs.readFileSync(path.join(aqui, "cromo.js"))).update(JSON.stringify(config.elementos || [])).update(String(escala))
    .digest("hex");
  const marca = path.join(pasta, "assinatura.txt");
  if (fs.existsSync(marca) && fs.readFileSync(marca, "utf8") === assinatura) return;
  fs.rmSync(pasta, { recursive: true, force: true });
  fs.mkdirSync(pasta);
  const browser = await chromium.launch();
  const url = pathToFileURL(path.join(aqui, "index.html")).href + "?render=1&sprites=0";
  const paginas = await Promise.all(Array.from({ length: partes }, async () => {
    const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await p.goto(url);
    await p.evaluate(() => window.pronto);
    return p;
  }));
  const info = await paginas[0].evaluate(() => window.elementosInfo());
  const fila = [];
  info.forEach((e, i) => { for (let k = 0; k < 72; k++) fila.push([i, k, Math.min(1600, Math.round(e.tam * escala))]); });
  let feitos = 0;
  await Promise.all(paginas.map(async p => {
    while (fila.length) {
      const [i, k, px] = fila.shift();
      const dado = await p.evaluate(([i, k, px]) => window.assar(i, k, px), [i, k, px]);
      fs.writeFileSync(path.join(pasta, `${i}-${k}.png`), Buffer.from(dado.split(",")[1], "base64"));
      if (++feitos % 72 === 0) console.log(`formas de cromo: ${feitos} / ${info.length * 72}`);
    }
  }));
  await browser.close();
  fs.writeFileSync(marca, assinatura);
}
await assaFormas();
if (args.includes("--so-formas")) process.exit(0);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pafies-"));
const inicio = Date.now();
const segs = [];
const tam = Math.ceil(quadros / partes);
for (let i = 0; i < partes; i++) {
  const de = i * tam, ate = Math.min(quadros, de + tam);
  if (de >= ate) break;
  const arq = path.join(tmp, `parte-${i}.mp4`);
  segs.push({ arq, p: roda(process.execPath, [fileURLToPath(import.meta.url), ...args, "--parte", String(de), String(ate), arq]) });
}
await Promise.all(segs.map(s => s.p.fim));
fs.writeFileSync(path.join(tmp, "lista.txt"), segs.map(s => `file '${s.arq}'`).join("\n"));
console.log(`quadros prontos em ${((Date.now() - inicio) / 1000).toFixed(0)} s; juntando com o áudio…`);

const atraso = Math.round(config.audio.narracaoInicio * 1000);
await roda("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "error",
  "-f", "concat", "-safe", "0", "-i", path.join(tmp, "lista.txt"),
  "-i", path.join(aqui, config.audio.narracao),
  "-i", path.join(aqui, config.audio.trilha),
  "-filter_complex",
  // voz: limpa graves e entra no tempo certo; trilha: abaixa sozinha quando a voz fala (sidechain)
  `[1:a]highpass=f=70,adelay=${atraso}|${atraso},aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[voz][chave];` +
  `[2:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.6[mus];` +
  `[mus][chave]sidechaincompress=threshold=0.025:ratio=7:attack=60:release=700:makeup=1[musd];` +
  `[voz][musd]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5:LRA=11,atrim=0:${config.duracao}[a]`,
  "-map", "0:v", "-map", "[a]", "-c:v", "copy",
  "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", "-shortest",
  saida,
]).fim;
fs.rmSync(tmp, { recursive: true, force: true });
console.log("vídeo salvo em", saida);
