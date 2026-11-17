#!/usr/bin/env node
// SFX cinematográficos discretos (gerados aqui → licença própria). Determinístico (seeds fixas).
// Node sintetiza; ffmpeg aplica reverb por convolução (IR sintética), filtro DC e normalização.
// Uso: node scripts/gerar-sfx-cinema.mjs  (ou bash scripts/gerar-sfx-cinema.sh) · Dono: agente SOM.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {SR, prng, midiHz, clamp, curva, estereo, criarSvf, criarRosa, escreverWavF32, gerarIR, medir, ffmpeg} from './lib/audio-dsp.mjs';

const raiz = path.resolve(import.meta.dirname, '..');
const DIR = path.join(raiz, 'public/audio/sfx');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sfx-cinema-'));
const LUFS = -20; // mesma referência da biblioteca base
const TP = -2;

const pan = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];
const suave = (x) => {
  const u = clamp(x, 0, 1);
  return u * u * (3 - 2 * u);
};

/** whoosh_suave (1,1 s): ar passando — ruído rosa em passa-banda que varre 280→2400→700 Hz, panorâmica E→D. */
function whoosh() {
  const dur = 1.1;
  const n = Math.round(dur * SR);
  const out = estereo(n);
  const rosa = criarRosa(prng(101));
  const bp = criarSvf();
  const bp2 = criarSvf();
  const fc = curva([[0, 280], [0.62, 2400], [dur, 700]]);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if ((i & 15) === 0) {
      bp.set(fc(t), 1.4);
      bp2.set(fc(t) * 0.5, 0.9);
    }
    const x = rosa();
    // envelope assimétrico: sobe 0,62 s, cai 0,48 s
    const env = t < 0.62 ? Math.pow(t / 0.62, 2.2) : Math.pow(1 - (t - 0.62) / (dur - 0.62), 1.6);
    const v = (bp.run(x, 'bp') * 0.8 + bp2.run(x, 'bp') * 0.5) * env;
    const [gl, gr] = pan(-0.5 + t / dur);
    out[0][i] = v * gl;
    out[1][i] = v * gr;
  }
  return {nome: 'whoosh_suave', buf: out, cauda: 0.6, wet: 0.25, rt60: 1.2};
}

/** impacto_suave (2 s): sub com queda de altura 58→40 Hz + corpo (ruído grave filtrado), ataque arredondado. */
function impacto() {
  const dur = 2.0;
  const n = Math.round(dur * SR);
  const out = estereo(n);
  const rnd = prng(202);
  const lp = criarSvf();
  lp.set(380, 0.8);
  let fase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 40 + 18 * Math.exp(-t / 0.18);
    fase += f / SR;
    const at = 1 - Math.exp(-t / 0.004);
    const sub = Math.sin(2 * Math.PI * fase) * Math.exp(-t / 0.55) * at;
    const corpo = lp.run(rnd() * 2 - 1, 'lp') * Math.exp(-t / 0.09) * at * 1.6;
    const v = sub * 0.9 + corpo;
    out[0][i] = v;
    out[1][i] = v;
  }
  return {nome: 'impacto_suave', buf: out, cauda: 1.2, wet: 0.3, rt60: 2.2};
}

/** riser_luz (2,6 s): faixa de ruído subindo 400→6500 Hz + acorde de Ré agudo com trêmolo acelerando; termina no pico. */
function riser() {
  const dur = 2.6;
  const n = Math.round(dur * SR);
  const out = estereo(n);
  const tons = [74, 81, 86, 90].map(midiHz);
  for (let c = 0; c < 2; c++) {
    const rosa = criarRosa(prng(303 + c));
    const bp = criarSvf();
    const fases = tons.map((_, j) => (j * 0.37 + c * 0.11) % 1);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const u = t / dur;
      if ((i & 15) === 0) bp.set(400 * Math.pow(6500 / 400, Math.pow(u, 1.4)), 2.2);
      const env = Math.pow(u, 2.4) * (1 - suave((t - (dur - 0.05)) / 0.05));
      const trem = 0.75 + 0.25 * Math.sin(2 * Math.PI * (3 + 9 * u) * t);
      let ton = 0;
      tons.forEach((f, j) => {
        fases[j] += (f * (1 + 0.003 * u)) / SR;
        ton += Math.sin(2 * Math.PI * fases[j]) / (j + 1.5);
      });
      out[c][i] = (bp.run(rosa(), 'bp') * 1.1 + ton * 0.22 * trem) * env;
    }
  }
  return {nome: 'riser_luz', buf: out, cauda: 1.4, wet: 0.35, rt60: 2.4};
}

/** brilho (2,4 s): shimmer agudo — parciais de Ré maior (1,2–5,9 kHz) com fases/trêmolos de seed fixa + ar. */
function brilho() {
  const dur = 2.4;
  const n = Math.round(dur * SR);
  const out = estereo(n);
  const notas = [86, 90, 93, 98, 102, 105];
  const rnd = prng(404);
  const parc = notas.map((m) => ({f: midiHz(m), fase: rnd(), trem: 4 + rnd() * 5, tf: rnd() * 6.28, p: pan(rnd() * 1.6 - 0.8), atraso: rnd() * 0.25}));
  const ar = [criarSvf(), criarSvf()];
  ar.forEach((a) => a.set(9000, 0.7));
  const br = [prng(405), prng(406)];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let l = 0, r = 0;
    for (const p of parc) {
      const tt = t - p.atraso;
      if (tt < 0) continue;
      p.fase += p.f / SR;
      const env = suave(tt / 0.18) * Math.exp(-tt / 0.7) * (0.6 + 0.4 * Math.sin(2 * Math.PI * p.trem * tt + p.tf));
      const v = (Math.sin(2 * Math.PI * p.fase) * env) / Math.sqrt(p.f / 1000);
      l += v * p.p[0];
      r += v * p.p[1];
    }
    const envAr = suave(t / 0.25) * Math.exp(-t / 0.5) * 0.25;
    out[0][i] = l * 0.3 + ar[0].run(br[0]() * 2 - 1, 'bp') * envAr;
    out[1][i] = r * 0.3 + ar[1].run(br[1]() * 2 - 1, 'bp') * envAr;
  }
  return {nome: 'brilho', buf: out, cauda: 1.6, wet: 0.5, rt60: 2.8};
}

/** respiro (1,6 s): inspiração suave — ruído rosa em passa-banda 500→1400 Hz, sem tom. */
function respiro() {
  const dur = 1.6;
  const n = Math.round(dur * SR);
  const out = estereo(n);
  for (let c = 0; c < 2; c++) {
    const rosa = criarRosa(prng(505 + c));
    const bp = criarSvf();
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      if ((i & 15) === 0) bp.set(500 + 900 * suave(t / 1.1), 0.9);
      const env = Math.sin(Math.PI * Math.min(1, t / dur)) ** 1.5;
      out[c][i] = bp.run(rosa(), 'bp') * env;
    }
  }
  return {nome: 'respiro', buf: out, cauda: 0.5, wet: 0.2, rt60: 1.0};
}

const relatorio = [];
for (const gerar of [whoosh, impacto, riser, brilho, respiro]) {
  const {nome, buf, cauda, wet, rt60} = gerar();
  const n = buf[0].length + Math.round(cauda * SR);
  const pad = estereo(n);
  pad[0].set(buf[0]);
  pad[1].set(buf[1]);
  const seco = path.join(tmp, `${nome}_seco.wav`);
  const ir = path.join(tmp, `${nome}_ir.wav`);
  const pre = path.join(tmp, `${nome}_pre.wav`);
  escreverWavF32(seco, pad);
  escreverWavF32(ir, gerarIR({seed: 77 + nome.length, rt60, dur: rt60 * 1.1, preDelay: 0.012, corteGrave: 90}));
  ffmpeg(['-i', seco, '-i', ir, '-filter_complex',
    `[0:a][1:a]afir=dry=1:wet=${wet}:gtype=none,highpass=f=22,afade=t=in:d=0.003,afade=t=out:st=${(n / SR - 0.08).toFixed(3)}:d=0.08`,
    '-c:a', 'pcm_f32le', '-ar', String(SR), pre]);
  const m = medir(pre);
  const ganho = Math.min(LUFS - m.I, TP - 0.3 - m.TP);
  const saida = path.join(DIR, `${nome}.wav`);
  ffmpeg(['-i', pre, '-af', `volume=${ganho.toFixed(3)}dB,aresample=48000:dither_method=triangular`, '-c:a', 'pcm_s16le', '-ac', '2', '-ar', String(SR), saida]);
  const f = medir(saida);
  relatorio.push({nome, duracaoS: +(n / SR).toFixed(2), I: f.I, TP: f.TP});
}
fs.rmSync(tmp, {recursive: true, force: true});
console.table(relatorio);
