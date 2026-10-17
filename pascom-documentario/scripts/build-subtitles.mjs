#!/usr/bin/env node
/** Gera public/subtitles/pascom-calling-pt-BR.srt a partir da narração da linha do tempo. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const tl = JSON.parse(readFileSync(join(ROOT, "src", "data", "timeline.json"), "utf8"));

const ts = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

/** Quebra em até duas linhas de ~38 caracteres (padrão de legibilidade em celular). */
const wrap = (text) => {
  if (text.length <= 38) return text;
  const words = text.split(" ");
  let best = text;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = `${a}\n${b}`;
    }
  }
  return best;
};

const srt = tl.narration.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end + 0.3)}\n${wrap(c.text)}\n`).join("\n");
const out = join(ROOT, "public", "subtitles", "pascom-calling-pt-BR.srt");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, srt);
console.log(`ok ${tl.narration.length} legendas → public/subtitles/pascom-calling-pt-BR.srt`);
