// Identidade PAFIES 2027 — fonte única de verdade para cores, tipografia e tempo.
export const C = {
  royal: '#1E40C8',
  royalLight: '#3A63F0',
  royalDeep: '#0A1A5C',
  yellow: '#FFD000',
  black: '#0A0A0F',
  white: '#F5F5F2',
};
export const FONT = 'Anton, Impact, sans-serif';
export const FONT_UI = 'Inter, sans-serif';
export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const BEAT = 15; // 120 BPM @30fps

// Mapa de cenas (frames) — sincronizado com 08_AUDIO/scripts/sound_design.py
export const SCENES = {
  s1: { from: 0, dur: 180 },   // 00–06s ABERTURA
  s2: { from: 180, dur: 240 }, // 06–14s REVELAÇÃO
  s3: { from: 420, dur: 300 }, // 14–24s SOLIDARIEDADE
  s4: { from: 720, dur: 240 }, // 24–32s EXPECTATIVA
  s5: { from: 960, dur: 240 }, // 32–40s FINALIZAÇÃO
};
export const TOTAL = 1200;

// batimentos cardíacos (mesma fórmula do áudio)
export const HEARTBEATS: number[] = (() => {
  const out: number[] = [];
  let t = 0.4, gap = 1.05;
  while (t < 5.4) { out.push(Math.round(t * FPS)); t += gap; gap = Math.max(0.55, gap * 0.9); }
  return out;
})();
