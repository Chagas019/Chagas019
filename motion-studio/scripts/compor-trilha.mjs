#!/usr/bin/env node
// Trilha ORIGINAL "confie-em-cristo" — composta e sintetizada aqui (licença própria do estúdio).
// Node puro gera as stems em PCM float (piano aditivo, pads/cordas, drone, textura);
// ffmpeg aplica reverb por convolução (IR sintética determinística), EQ e master.
// Determinístico: nenhum Math.random(); ruídos via mulberry32 com seeds fixas.
// Uso: node scripts/compor-trilha.mjs   (saída: public/audio/trilha/confie-em-cristo.wav)
// Dono: agente SOM.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {SR, prng, midiHz, clamp, curva, estereo, criarSvf, criarRosa, tabelaSerra, lerTabela, escreverWavF32, gerarIR, medir, ffmpeg} from './lib/audio-dsp.mjs';

const raiz = path.resolve(import.meta.dirname, '..');
const SAIDA = path.join(raiz, 'public/audio/trilha/confie-em-cristo.wav');
const DUR = 52.5; // narração termina em 46,6 s; o resto é cauda
const N = Math.round(DUR * SR);
const LUFS_ALVO = -20;
const TP_MAX = -2;

// ---------------------------------------------------------------------------
// Partitura — tempos alinhados ao roteiro cronometrado (src/projetos/confie-em-cristo/voz.ts)
// Tom: Si menor -> Ré maior (relativo). Pulso ~ 62-80 BPM implícito nos arpejos.
// ---------------------------------------------------------------------------
const PC = {
  Bm: {raiz: 11, pcs: [11, 2, 6, 1]}, // add9 (C#)
  G: {raiz: 7, pcs: [7, 11, 2, 9]}, // add9 (A)
  D: {raiz: 2, pcs: [2, 6, 9, 4]}, // add9 (E)
  A: {raiz: 9, pcs: [9, 1, 4, 11]}, // add9 (B)
  Asus: {raiz: 9, pcs: [9, 2, 4]},
  Em: {raiz: 4, pcs: [4, 7, 11, 6]},
};

// [início s, acorde, seção, nota de topo (melodia) | null]
const ACORDES = [
  // A — escuro/esparso (0–10,6): "Talvez..." x3
  [0.0, 'Bm', 'A', null],
  [3.6, 'G', 'A', null],
  [6.6, 'D', 'A', null],
  [8.6, 'Asus', 'A', null],
  // respiro (10,6–11,8): silêncio antes de "Mas escute"
  [10.6, 'Asus', 'R', null],
  // B — a luz abre (11,8–26,6)
  [11.8, 'G', 'B', 83], // virada de luz: B5 em sino
  [14.85, 'D', 'B', 78],
  [16.4, 'A', 'B', 76],
  [19.9, 'Bm', 'B', 74],
  [21.85, 'G', 'B', 79],
  [23.8, 'D', 'B', 78],
  [25.25, 'Asus', 'B', 76],
  // C — crescendo de esperança (26,6–38,7): "confie" 26,6 e 29,5 · "Jesus" 33,8
  [26.6, 'D', 'C', 81],
  [27.95, 'A', 'C', 76],
  [29.46, 'G', 'C', 83],
  [30.9, 'Bm', 'C', 78],
  [32.9, 'Asus', 'C', 76],
  [33.77, 'D', 'C', 86], // "Jesus": luminoso
  [35.4, 'G', 'C', 83],
  [36.3, 'Bm', 'C', 78],
  [37.2, 'Asus', 'C', 76],
  [38.0, 'A', 'C', null], // respiração antes de "Confie em Cristo"
  // D — resolução luminosa (38,7–46,6) · clímax "Cristo" 39,5
  [38.73, 'D', 'D', 81],
  [40.76, 'G', 'D', 83],
  [42.28, 'A', 'D', 81],
  [43.18, 'D', 'F', 86], // "e a vida" — tônica final (arpejo se rarefaz)
  [DUR, null, 'fim', null],
];

const CLIMAX = 39.5;
const FIM_VOZ = 46.65;

// Energia global (0–1): dinâmica, brilho e densidade.
const energia = curva([
  [0, 0.18], [9, 0.3], [10.6, 0.3], [11.2, 0.12], [11.8, 0.38], [16, 0.44], [24, 0.52],
  [26.6, 0.62], [30, 0.7], [33.8, 0.82], [37.7, 0.7], [38.7, 0.85], [CLIMAX, 1.0], [42, 0.9],
  [44, 0.7], [FIM_VOZ, 0.5], [DUR, 0.3],
]);
const corteFiltro = curva([
  [0, 380], [10.6, 560], [11.2, 340], [11.8, 760], [20, 1100], [26.6, 1500], [33.8, 2300],
  [38.7, 2500], [CLIMAX, 3400], [FIM_VOZ, 2600], [DUR, 900],
]);

// ---------------------------------------------------------------------------
// Piano aditivo
// ---------------------------------------------------------------------------
const piano = estereo(N);
let nNotas = 0;

const pan = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];

/** Nota de piano: parciais inarmônicos, ataque de martelo, decaimento por parcial, abafador no fim do pedal. */
function nota(t0, midi, vel, tPedal) {
  nNotas++;
  const f = midiHz(midi);
  const n0 = Math.round(t0 * SR);
  const durS = Math.min(tPedal - t0 + 0.6, 14);
  const len = Math.min(Math.round(durS * SR), N - n0);
  if (len <= 0) return;
  const tRel = (tPedal - t0) * SR; // amostra em que o abafador desce
  const B = 0.00012 * Math.pow(2, (midi - 40) / 18); // inarmonicidade
  const t60 = clamp(14 * Math.pow(65 / f, 0.6), 1.6, 16);
  const brilho = 0.5 + 0.42 * vel;
  const ganho = Math.pow(vel, 1.5) * 0.16 * (f > 900 ? Math.pow(900 / f, 0.35) : 1);
  const [gL, gR] = pan(clamp((midi - 62) / 36, -0.5, 0.5));
  const tmp = new Float32Array(len);
  const nParc = Math.min(16, Math.floor(15000 / f));
  for (let n = 1; n <= nParc; n++) {
    const fn = n * f * Math.sqrt(1 + B * n * n);
    if (fn > 17000) break;
    const golpe = 0.15 + 0.85 * Math.abs(Math.sin((Math.PI * n) / 7.3)); // ponto de batida ~1/7
    const amp = Math.pow(n, -1.1) * Math.pow(brilho, n - 1) * golpe;
    if (amp < 0.002) continue;
    const t60n = t60 / (1 + 0.38 * (n - 1));
    const tauB = (t60n / 6.9) * SR;
    const tauA = tauB * 0.22;
    const kA = Math.exp(-1 / tauA);
    const kB = Math.exp(-1 / tauB);
    const kD = Math.exp(-1 / (0.085 * SR)); // abafador
    const cordas = n <= 6 ? [-0.7 * (1 + 0.1 * n), 0.7 * (1 + 0.1 * n)] : [0];
    for (const cents of cordas) {
      const w = (2 * Math.PI * fn * Math.pow(2, cents / 1200)) / SR;
      const cw = Math.cos(w);
      const sw = Math.sin(w);
      let c = 1, s = 0;
      let eA = 0.62, eB = 0.38, eD = 1;
      const a = amp / cordas.length;
      for (let i = 0; i < len; i++) {
        tmp[i] += a * (eA + eB) * eD * s;
        const c2 = c * cw - s * sw;
        s = s * cw + c * sw;
        c = c2;
        eA *= kA;
        eB *= kB;
        if (i > tRel) eD *= kD;
        if ((i & 1023) === 0) {
          const m = 1 / Math.sqrt(c * c + s * s);
          c *= m;
          s *= m;
          if ((eA + eB) * eD < 1e-5) break;
        }
      }
    }
  }
  // ruído de martelo
  const rnd = prng(1000 + nNotas * 31);
  const lp = criarSvf();
  lp.set(1200 + 3200 * vel, 0.7);
  const nh = Math.min(len, Math.round(0.04 * SR));
  for (let i = 0; i < nh; i++) tmp[i] += lp.run(rnd() * 2 - 1, 'lp') * 0.06 * vel * Math.exp(-i / (0.007 * SR));
  // ataque (evita clique) e escrita no bus
  for (let i = 0; i < len; i++) {
    const at = 1 - Math.exp(-i / (0.0011 * SR));
    const v = tmp[i] * at * ganho;
    piano[0][n0 + i] += v * gL;
    piano[1][n0 + i] += v * gR;
  }
}

const noRegistro = (pcs, lo, hi) => {
  const out = [];
  for (let m = lo; m <= hi; m++) if (pcs.includes(m % 12)) out.push(m);
  return out;
};
const baixoDe = (pc) => {
  let m = 24 + pc;
  while (m < 33) m += 12;
  return m;
};

const rndPart = prng(20251117);
const passo = {A: 1.15, R: 0, B: 0.55, C: 0.37, D: 0.37, F: 0.78};

for (let k = 0; k < ACORDES.length - 1; k++) {
  const [t, nome, sec, topo] = ACORDES[k];
  const tProx = ACORDES[k + 1][0];
  const ac = PC[nome];
  const ultimo = k === ACORDES.length - 2;
  const tPedal = ultimo ? DUR : tProx + (sec === 'A' ? 0.5 : 0.12); // pedal troca logo após o próximo acorde
  const e = energia(t + 0.05);

  if (sec === 'R') {
    // respiro: uma única nota aguda, quase sussurrada
    nota(t + 0.12, 81, 0.22, 11.95);
    continue;
  }
  // baixo (fundamental + oitava suave)
  const b = baixoDe(ac.raiz);
  if (sec !== 'A' || k === 0 || k === 2) nota(t + 0.02, b, clamp(0.3 + 0.4 * e, 0, 0.85), tPedal);
  if (sec === 'C' || sec === 'D' || sec === 'F') nota(t + 0.02, b + 12, 0.25 + 0.3 * e, tPedal);

  // nota de topo (melodia em sino)
  if (topo) nota(t + 0.01, topo, clamp(0.35 + 0.45 * e, 0, 0.9), tPedal);

  // arpejo
  const p = passo[sec];
  const pool = sec === 'A' ? noRegistro(ac.pcs.slice(0, 3), 59, 74) : noRegistro(ac.pcs, 62, sec === 'B' ? 79 : 81);
  if (!pool.length) continue;
  let idx = Math.floor(rndPart() * Math.min(2, pool.length));
  let dir = 1;
  const inicio = sec === 'A' ? 0.6 + rndPart() * 0.3 : p;
  const tLim = sec === 'F' ? FIM_VOZ - 0.5 : tProx - 0.12;
  for (let tt = t + inicio; tt < tLim; tt += p * (0.96 + 0.08 * rndPart())) {
    if (sec === 'A' && rndPart() < 0.25) continue; // silêncios no começo
    if (sec === 'B' && rndPart() < 0.12) continue;
    const m = pool[idx];
    const vel = clamp((0.2 + 0.42 * energia(tt)) * (0.82 + 0.3 * rndPart()), 0.12, 0.8);
    nota(tt, m, vel, tPedal);
    idx += dir;
    if (idx >= pool.length - 1 || idx <= 0) dir = -dir;
    idx = clamp(idx, 0, pool.length - 1);
  }
}
// clímax "Cristo" (39,5): acorde cheio em Ré + oitava grave
for (const [m, v] of [[26, 0.7], [38, 0.6], [62, 0.45], [69, 0.5], [74, 0.55], [78, 0.5], [86, 0.45]]) nota(CLIMAX + 0.005 * (m % 5), m, v, 40.85);
// final no fim da voz (46,6): sino Ré/Lá agudo deixado no pedal
for (const [m, v] of [[74, 0.32], [81, 0.3], [86, 0.28], [90, 0.2]]) nota(FIM_VOZ + 0.02 * (m % 3), m, v, DUR);
console.log(`piano: ${nNotas} notas`);

// ---------------------------------------------------------------------------
// Pads, cordas e drone
// ---------------------------------------------------------------------------
const pads = estereo(N);
const serraPad = tabelaSerra(14);
const serraCorda = tabelaSerra(20);

const nivelPad = curva([[0, 0.05], [10.6, 0.09], [11.2, 0.04], [11.8, 0.1], [26.6, 0.13], [CLIMAX, 0.17], [FIM_VOZ, 0.13], [DUR, 0.06]]);
const nivelCorda = curva([[0, 0], [11.8, 0], [14.5, 0.04], [26.6, 0.06], [33.8, 0.09], [38.0, 0.07], [CLIMAX, 0.12], [FIM_VOZ, 0.08], [DUR, 0]]);
const nivelDrone = curva([[0, 0], [2.5, 0.07], [10.6, 0.08], [11.2, 0.04], [13, 0.06], [CLIMAX, 0.08], [DUR - 2, 0.04], [DUR, 0]]);

function voz(buf, t0, t1, f, nivel, tabela, {ataque, soltura, detunes, vibrato = 0, fasesSeed}) {
  const rnd = prng(fasesSeed);
  const n0 = Math.max(0, Math.round(t0 * SR));
  const n1 = Math.min(N, Math.round((t1 + soltura) * SR));
  const osc = detunes.map((d, j) => ({inc: (f * Math.pow(2, d / 1200)) / SR, fase: rnd(), p: pan(detunes.length === 1 ? 0 : -0.6 + (1.2 * j) / (detunes.length - 1))}));
  const g = 1 / Math.sqrt(detunes.length);
  for (let i = n0; i < n1; i++) {
    const t = i / SR;
    const ta = t - t0;
    let env = Math.min(1, ta / ataque);
    env = env * env * (3 - 2 * env);
    if (t > t1) env *= Math.max(0, 1 - (t - t1) / soltura) ** 2;
    const lv = env * nivel(t) * g;
    const vib = vibrato ? 1 + vibrato * Math.min(1, ta / 1.5) * Math.sin(2 * Math.PI * 5.1 * ta) : 1;
    for (const o of osc) {
      o.fase += o.inc * vib;
      if (o.fase >= 1) o.fase -= 1;
      const v = lerTabela(tabela, o.fase) * lv;
      buf[0][i] += v * o.p[0];
      buf[1][i] += v * o.p[1];
    }
  }
}

const padBruto = estereo(N);
const cordaBruta = estereo(N);
for (let k = 0; k < ACORDES.length - 1; k++) {
  const [t, nome, sec] = ACORDES[k];
  const t1 = ACORDES[k + 1][0];
  const ac = PC[nome];
  const b = baixoDe(ac.raiz) + 12;
  const tons = [b, ...noRegistro(ac.pcs.slice(0, 3), 52, 66)];
  for (const [j, m] of tons.entries()) {
    voz(padBruto, t, t1, midiHz(m), nivelPad, serraPad, {ataque: sec === 'A' ? 2.4 : 1.4, soltura: 2.0, detunes: [-8, 0, 8], fasesSeed: 300 + k * 17 + j});
  }
  if (t >= 11.8) {
    for (const [j, m] of noRegistro(ac.pcs.slice(0, 3), 64, 78).entries()) {
      voz(cordaBruta, t, t1, midiHz(m), nivelCorda, serraCorda, {ataque: 2.0, soltura: 2.4, detunes: [-5, 6], vibrato: 0.0018, fasesSeed: 900 + k * 13 + j});
    }
  }
}
// filtros lentos (abrem com o arco de luz)
for (let c = 0; c < 2; c++) {
  const lp = criarSvf();
  const lpC = criarSvf();
  const hpC = criarSvf();
  hpC.set(260, 0.7);
  for (let i = 0; i < N; i++) {
    if ((i & 31) === 0) {
      const t = i / SR;
      lp.set(corteFiltro(t), 0.85);
      lpC.set(corteFiltro(t) * 1.7, 0.7);
    }
    pads[c][i] += lp.run(padBruto[c][i], 'lp') + hpC.run(lpC.run(cordaBruta[c][i], 'lp'), 'hp');
  }
}
// drone grave: Si1 (escuro) -> Ré2 (a partir da virada)
{
  const fB = midiHz(35);
  const fD = midiHz(38);
  let fa = 0, fb = 0, fc = 0, fd = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const x = clamp((t - 11.0) / 2.0, 0, 1);
    const xs = x * x * (3 - 2 * x);
    fa += fB / SR; fb += (fB + 0.13) / SR; fc += fD / SR; fd += (fD + 0.11) / SR;
    const s1 = Math.sin(2 * Math.PI * fa) + 0.6 * Math.sin(2 * Math.PI * fb) + 0.25 * Math.sin(4 * Math.PI * fa);
    const s2 = Math.sin(2 * Math.PI * fc) + 0.6 * Math.sin(2 * Math.PI * fd) + 0.25 * Math.sin(4 * Math.PI * fc);
    const v = ((1 - xs) * s1 + xs * s2) * nivelDrone(t) * 0.6;
    pads[0][i] += v;
    pads[1][i] += v;
  }
}
console.log('pads/cordas/drone: ok');

// ---------------------------------------------------------------------------
// Textura atmosférica (ruído com seed fixa)
// ---------------------------------------------------------------------------
const textura = estereo(N);
const nivelVento = curva([[0, 0.0], [1.5, 0.05], [10.6, 0.06], [11.8, 0.03], [30, 0.025], [DUR, 0.01]]);
const nivelAr = curva([[0, 0], [11.6, 0], [12.6, 0.01], [38.7, 0.012], [CLIMAX, 0.022], [FIM_VOZ, 0.012], [DUR, 0]]);
for (let c = 0; c < 2; c++) {
  const rosa = criarRosa(prng(77 + c));
  const branco = prng(4242 + c);
  const bp = criarSvf();
  const ar = criarSvf();
  ar.set(7500, 0.6);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    if ((i & 63) === 0) bp.set(560 + 300 * Math.sin(2 * Math.PI * 0.045 * t + c * 1.3), 1.1);
    textura[c][i] = bp.run(rosa(), 'bp') * nivelVento(t) * 2.2 + ar.run(branco() * 2 - 1, 'bp') * nivelAr(t);
  }
}
console.log('textura: ok');

// ---------------------------------------------------------------------------
// Render em ffmpeg: reverb por convolução, EQ, master
// ---------------------------------------------------------------------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'trilha-'));
const arq = (n) => path.join(tmp, n);
escreverWavF32(arq('piano.wav'), piano);
escreverWavF32(arq('pads.wav'), pads);
escreverWavF32(arq('textura.wav'), textura);
escreverWavF32(arq('ir_hall.wav'), gerarIR({seed: 2026, rt60: 3.8, dur: 4.5}));

const filtro = [
  '[0:a][3:a]afir=dry=0.8:wet=0.6:gtype=none[p]',
  '[1:a][4:a]afir=dry=0.85:wet=0.45:gtype=none[q]',
  '[p][q][2:a]amix=inputs=3:normalize=0[m]',
  `[m]highpass=f=30,equalizer=f=280:t=q:w=1:g=-1.5,equalizer=f=2900:t=q:w=1.1:g=-3,lowpass=f=15000,afade=t=in:d=0.35,afade=t=out:st=${DUR - 4}:d=4[out]`,
].join(';');
ffmpeg(['-i', arq('piano.wav'), '-i', arq('pads.wav'), '-i', arq('textura.wav'), '-i', arq('ir_hall.wav'), '-i', arq('ir_hall.wav'),
  '-filter_complex', filtro, '-map', '[out]', '-c:a', 'pcm_f32le', '-ar', String(SR), arq('pre.wav')]);

const pre = medir(arq('pre.wav'));
const ganhoDb = LUFS_ALVO - pre.I;
console.log(`pré-master: I=${pre.I} LUFS TP=${pre.TP} dBTP -> ganho ${ganhoDb.toFixed(2)} dB`);
// ganho linear + limitador de segurança em 4x oversampling (aproxima true peak)
const lim = Math.pow(10, (TP_MAX - 0.4) / 20).toFixed(4);
fs.mkdirSync(path.dirname(SAIDA), {recursive: true});
ffmpeg(['-i', arq('pre.wav'), '-af',
  `volume=${ganhoDb.toFixed(3)}dB,aresample=192000,alimiter=limit=${lim}:attack=4:release=120:level=disabled,aresample=48000:dither_method=triangular`,
  '-c:a', 'pcm_s16le', '-ac', '2', '-ar', String(SR), SAIDA]);
const fin = medir(SAIDA);
console.log(`master: I=${fin.I} LUFS TP=${fin.TP} dBTP LRA=${fin.LRA} LU -> ${path.relative(raiz, SAIDA)}`);
fs.rmSync(tmp, {recursive: true, force: true});
