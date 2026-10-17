#!/usr/bin/env node
/**
 * Confere quais arquivos existem de fato e gera src/data/assets.generated.json,
 * que a composição usa para decidir entre filmagem real e placa procedural,
 * e para tocar a narração gravada.
 *
 * Filmagem: itens de public/assets/metadata/media-manifest.json cujo arquivo existe.
 * Narração: public/assets/audio/narration/full.(wav|mp3|m4a) alinhada a 0 s,
 *           ou um arquivo por fala: n01.wav, n02.wav... (começa no start da fala).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const manifestPath = join(PUBLIC, "assets", "metadata", "media-manifest.json");
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { items: [] };

const footage = {};
const missing = [];
for (const item of manifest.items) {
  if (existsSync(join(PUBLIC, item.file))) {
    footage[item.slot] = { src: item.file, durationSec: item.durationSec, width: item.width, height: item.height, trimStartSec: item.trimStartSec ?? 0 };
  } else {
    missing.push(item.file);
  }
}

const narrDir = join(PUBLIC, "assets", "audio", "narration");
const files = existsSync(narrDir) ? readdirSync(narrDir) : [];
const full = files.find((f) => /^full\.(wav|mp3|m4a|aac)$/i.test(f));
const narration = {};
for (const f of files) {
  const m = f.match(/^(n\d{2})\.(wav|mp3|m4a|aac)$/i);
  if (m) narration[m[1]] = `assets/audio/narration/${f}`;
}

const out = {
  generatedAt: new Date().toISOString(),
  footage,
  narration,
  narrationFull: full ? `assets/audio/narration/${full}` : null,
};
writeFileSync(join(ROOT, "src", "data", "assets.generated.json"), JSON.stringify(out, null, 2) + "\n");

const timeline = JSON.parse(readFileSync(join(ROOT, "src", "data", "timeline.json"), "utf8"));
const slots = timeline.shots.filter((s) => s.slot);
console.log(`filmagens: ${Object.keys(footage).length}/${slots.length} planos com vídeo real (o restante usa placas procedurais)`);
console.log(`narração: ${full ? `arquivo único ${full}` : `${Object.keys(narration).length}/${timeline.narration.length} falas gravadas`}`);
if (missing.length) console.warn(`aviso: ${missing.length} arquivo(s) do manifesto não encontrados:\n  ${missing.join("\n  ")}`);
