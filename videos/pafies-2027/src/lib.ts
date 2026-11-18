// Utilidades compartilhadas — tempo, easing e sincronia com a trilha
import sync from './sync.json';
export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const DUR = 40;
export const S = sync.scenes;          // s1, s2, s3, s5, end (segundos)
export const HIT = sync.hits as Record<string, number>;
export const HEART = sync.heartbeats as number[];
export const BEAT = sync.beat;

// paleta PAFIES
export const AZUL = '#0B3196';
export const AZUL_CLARO = '#1E52D9';
export const AZUL_ESCURO = '#04113A';
export const AMARELO = '#FFD42E';
export const PRETO = '#070709';
export const BRANCO = '#FFFFFF';
export const CREME = '#FFF6EE';

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const eOut = (p: number) => 1 - Math.pow(1 - p, 3);
export const eOutExpo = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
export const eInExpo = (p: number) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10));
export const eIO = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const eBack = (p: number) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
// mola amortecida (overshoot natural) — 0 -> 1
export const springy = (t: number, freq = 9, damp = 6) => (t <= 0 ? 0 : 1 - Math.exp(-damp * t) * Math.cos(freq * t));
// envelope de impacto (pico em t0, decai)
export const hitEnv = (t: number, t0: number, k = 7) => (t < t0 ? 0 : Math.exp(-(t - t0) * k));
export const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// tremor de câmera somando todos os impactos fortes
const STRONG = ['drop_logo', 'cena3', 'cena5', 'historia', 'galera', 'estao'];
const SOFT = ['decima', 'ano', 'competicao', 'solidariedade', 'preparados', 'pafies2027', 'megafone', 'final'];
export function shake(t: number) {
  let a = 0;
  for (const k of STRONG) a += hitEnv(t, HIT[k], 8) * 26;
  for (const k of SOFT) a += hitEnv(t, HIT[k], 10) * 12;
  for (const hb of HEART) if (hb < 6) a += hitEnv(t, hb, 14) * 7;
  const f = Math.floor(t * 30);
  return { x: (hash(f) - 0.5) * 2 * a, y: (hash(f + 91) - 0.5) * 2 * a, r: (hash(f + 7) - 0.5) * a * 0.04 };
}
