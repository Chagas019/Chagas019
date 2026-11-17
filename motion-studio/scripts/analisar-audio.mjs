#!/usr/bin/env node
// Análise técnica de áudio: pico, DC offset, clipping, cliques (descontinuidades), silêncio inicial/final.
// Uso: node scripts/analisar-audio.mjs arquivo.wav [...]  · Dono: agente SOM.
import {lerAudio, medir, SR} from './lib/audio-dsp.mjs';

const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
let falhou = false;

for (const arq of process.argv.slice(2)) {
  const [l, r] = lerAudio(arq);
  const n = l.length;
  const res = {arquivo: arq, duracaoS: +(n / SR).toFixed(3)};
  let pico = 0, clip = 0, cliques = 0, piorClique = 0, tPiorClique = 0;
  const dc = [0, 0];
  for (const [c, x] of [l, r].entries()) {
    let s = 0;
    // energia da 2ª diferença numa janela móvel de 10 ms — clique = salto isolado muito acima do contexto
    const W = Math.round(0.01 * SR);
    const d2 = new Float32Array(n);
    for (let i = 2; i < n; i++) d2[i] = Math.abs(x[i] - 2 * x[i - 1] + x[i - 2]);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const a = Math.abs(x[i]);
      s += x[i];
      if (a > pico) pico = a;
      if (a >= 0.999) clip++;
      acc += d2[i] * d2[i];
      if (i >= W) acc -= d2[i - W] * d2[i - W];
      if (i > W) {
        const ctx = Math.sqrt(Math.max(acc, 0) / W);
        const razao = d2[i] / (ctx + 1e-6);
        if (d2[i] > 0.02 && razao > 6) {
          cliques++;
          if (d2[i] > piorClique) {
            piorClique = d2[i];
            tPiorClique = i / SR;
          }
        }
      }
    }
    dc[c] = s / n;
  }
  const m = medir(arq);
  Object.assign(res, {
    LUFS: m.I, truePeak_dBTP: m.TP, LRA: m.LRA,
    pico_dBFS: +db(pico).toFixed(2),
    dc_L: +dc[0].toExponential(2), dc_R: +dc[1].toExponential(2),
    amostrasClip: clip,
    cliques,
    ...(cliques ? {piorClique: +piorClique.toFixed(4), tPiorClique: +tPiorClique.toFixed(3)} : {}),
    inicio_abs: +Math.max(Math.abs(l[0]), Math.abs(r[0])).toExponential(2),
    fim_abs: +Math.max(Math.abs(l[n - 1]), Math.abs(r[n - 1])).toExponential(2),
  });
  const ok = clip === 0 && cliques === 0 && Math.abs(dc[0]) < 1e-3 && Math.abs(dc[1]) < 1e-3 && m.TP <= -1;
  if (!ok) falhou = true;
  console.log(`${ok ? 'OK ' : 'ERRO'} ${JSON.stringify(res)}`);
}
if (falhou) process.exit(1);
