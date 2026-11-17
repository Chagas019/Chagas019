// Utilitários DSP determinísticos (Node puro) para trilha e SFX. Dono: agente SOM.
// Sem Math.random(): todo ruído vem de mulberry32 com seed fixa.
import fs from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';

export const SR = 48000;

/** PRNG determinístico (mulberry32). Retorna função em [0,1). */
export const prng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const dbLin = (db) => Math.pow(10, db / 20);
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** Curva por pontos [[t, v], ...] com interpolação suave (cosseno). */
export const curva = (pts) => (t) => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      const [t0, v0] = pts[i - 1];
      const [t1, v1] = pts[i];
      const u = (t - t0) / (t1 - t0);
      const s = 0.5 - 0.5 * Math.cos(Math.PI * u);
      return v0 + (v1 - v0) * s;
    }
  }
  return pts[pts.length - 1][1];
};

export const estereo = (n) => [new Float32Array(n), new Float32Array(n)];

/** Filtro de estado variável (TPT/Zavalishin). modo: 'lp' | 'bp' | 'hp'. */
export const criarSvf = () => {
  let ic1 = 0;
  let ic2 = 0;
  let g = 0, k = 1, a1 = 0, a2 = 0, a3 = 0;
  return {
    set(fc, q = 0.707) {
      g = Math.tan((Math.PI * clamp(fc, 10, SR * 0.45)) / SR);
      k = 1 / q;
      a1 = 1 / (1 + g * (g + k));
      a2 = g * a1;
      a3 = g * a2;
    },
    run(x, modo) {
      const v3 = x - ic2;
      const v1 = a1 * ic1 + a2 * v3;
      const v2 = ic2 + a2 * ic1 + a3 * v3;
      ic1 = 2 * v1 - ic1;
      ic2 = 2 * v2 - ic2;
      if (modo === 'lp') return v2;
      if (modo === 'bp') return v1;
      return x - k * v1 - v2;
    },
  };
};

/** Ruído rosa (Paul Kellet, versão econômica) a partir de PRNG. */
export const criarRosa = (rnd) => {
  let b0 = 0, b1 = 0, b2 = 0;
  return () => {
    const w = rnd() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    return (b0 + b1 + b2 + w * 0.1848) * 0.2;
  };
};

/** Tabela de onda dente-de-serra limitada em banda (nh harmônicos). */
export const tabelaSerra = (nh, tam = 4096) => {
  const t = new Float32Array(tam + 1);
  for (let i = 0; i < tam; i++) {
    let s = 0;
    for (let h = 1; h <= nh; h++) s += Math.sin((2 * Math.PI * h * i) / tam) / h;
    t[i] = s * 0.55;
  }
  t[tam] = t[0];
  return t;
};

export const lerTabela = (tab, fase) => {
  const tam = tab.length - 1;
  const p = fase * tam;
  const i = p | 0;
  const f = p - i;
  return tab[i] + (tab[i + 1] - tab[i]) * f;
};

/** Escreve WAV float32 estéreo (formato 3). */
export const escreverWavF32 = (arq, [l, r]) => {
  const n = l.length;
  const buf = Buffer.alloc(44 + n * 8);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 8, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(3, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 8, 28);
  buf.writeUInt16LE(8, 32);
  buf.writeUInt16LE(32, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 8, 40);
  for (let i = 0; i < n; i++) {
    buf.writeFloatLE(l[i], 44 + i * 8);
    buf.writeFloatLE(r[i], 48 + i * 8);
  }
  fs.writeFileSync(arq, buf);
};

/** Lê qualquer áudio como float32 estéreo intercalado via ffmpeg. */
export const lerAudio = (arq) => {
  const out = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', arq, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], {maxBuffer: 1 << 30});
  const f = new Float32Array(out.buffer, out.byteOffset, out.byteLength / 4);
  const n = f.length / 2;
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    l[i] = f[2 * i];
    r[i] = f[2 * i + 1];
  }
  return [l, r];
};

/**
 * IR de sala/hall sintética e determinística: pré-delay, reflexões iniciais
 * e cauda de ruído com decaimento exponencial que escurece com o tempo.
 */
export const gerarIR = ({seed, rt60 = 3.6, dur = 4.2, preDelay = 0.022, brilho0 = 8000, brilho1 = 1300, corteGrave = 140}) => {
  const n = Math.round(dur * SR);
  const ir = estereo(n);
  for (let c = 0; c < 2; c++) {
    const rnd = prng(seed + c * 7919);
    const lp = criarSvf();
    const hp = criarSvf();
    hp.set(corteGrave, 0.6);
    const d0 = Math.round(preDelay * SR);
    for (let i = d0; i < n; i++) {
      const t = (i - d0) / SR;
      if ((i & 31) === 0) lp.set(brilho0 * Math.pow(brilho1 / brilho0, Math.min(1, t / rt60)), 0.6);
      const env = Math.exp((-6.9 * t) / rt60) * Math.min(1, t / 0.06);
      let x = (rnd() * 2 - 1) * env;
      x = lp.run(x, 'lp');
      x = hp.run(x, 'hp');
      ir[c][i] = x;
    }
    // reflexões iniciais
    for (let k = 0; k < 9; k++) {
      const tt = preDelay * 0.4 + rnd() * 0.075;
      const idx = Math.round(tt * SR);
      ir[c][idx] += (rnd() < 0.5 ? -1 : 1) * (0.5 - k * 0.04);
    }
    // fade final para evitar truncamento audível
    const nf = Math.round(0.3 * SR);
    for (let i = 0; i < nf; i++) ir[c][n - 1 - i] *= i / nf;
    // energia unitária
    let e = 0;
    for (let i = 0; i < n; i++) e += ir[c][i] * ir[c][i];
    const g = 1 / Math.sqrt(e);
    for (let i = 0; i < n; i++) ir[c][i] *= g;
  }
  return ir;
};

/** Mede loudness via ffmpeg loudnorm (JSON). */
export const medir = (arq) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', arq, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], {encoding: 'utf8'});
  const saida = r.stderr;
  const j = JSON.parse(saida.slice(saida.lastIndexOf('{'), saida.lastIndexOf('}') + 1));
  return {I: Number(j.input_i), TP: Number(j.input_tp), LRA: Number(j.input_lra)};
};

export const ffmpeg = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {stdio: 'inherit'});
