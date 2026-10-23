import type { Action } from '@nexus/core';

/**
 * Contrato dos jogos que rodam no navegador.
 *
 * O player cuida de tudo que é comum (laço de quadros, entrada de controle,
 * toque e teclado, pausa, tela cheia, recorde). Cada jogo só implementa
 * regras e desenho, em pixels CSS do palco.
 */
export interface Input {
  /** Ações mantidas apertadas neste quadro. */
  held: ReadonlySet<Action>;
  /** Ações que acabaram de ser apertadas (borda de subida) neste quadro. */
  pressed: ReadonlySet<Action>;
  /** Eixo horizontal/vertical combinado (analógico, direcional ou teclado), de -1 a 1. */
  x: number;
  y: number;
}

export interface Game {
  /** Chamado ao criar e sempre que o palco muda de tamanho. */
  resize(width: number, height: number): void;
  /** Avança a simulação. `dt` em segundos, já limitado pelo player. */
  update(dt: number, input: Input): void;
  draw(ctx: CanvasRenderingContext2D): void;
  readonly score: number;
  readonly over: boolean;
  /** Texto curto de ajuda exibido antes de começar. */
  readonly hint: string;
}

export type GameFactory = () => Game;

export const NEON = {
  bg1: '#0b1230',
  bg2: '#05060f',
  grid: 'rgba(148,163,255,0.08)',
  cyan: '#38d6f5',
  blue: '#4f7dff',
  violet: '#8b5cf6',
  pink: '#f472b6',
  green: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
  ink: '#e8ebf7',
};

/** Fundo comum: gradiente escuro e grade sutil. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, offset = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, NEON.bg1);
  g.addColorStop(1, NEON.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = NEON.grid;
  ctx.lineWidth = 1;
  const step = Math.max(24, Math.min(w, h) / 12);
  ctx.beginPath();
  for (let x = -(offset % step); x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = 0; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
}

/** Retângulo com brilho neon. */
export function glowRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, blur = 12) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
}

export function glowCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, blur = 14) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
