import { clamp, drawBackdrop, glowCircle, glowRect, NEON, type Game, type Input } from './types';

const COLS = 8;
const ROWS = 5;
const ROW_COLORS = [NEON.pink, NEON.violet, NEON.blue, NEON.cyan, NEON.green];

interface Brick { x: number; y: number; w: number; h: number; alive: boolean; color: string }

/** Quebra-blocos: rebatida pelo ponto de contato, fases mais rápidas, 3 vidas. */
export function createNeonBreaker(): Game {
  let W = 0, H = 0, u = 1;
  let paddle = { x: 0, y: 0, w: 0, h: 0 };
  let ball = { x: 0, y: 0, vx: 0, vy: 0, r: 0, stuck: true };
  let bricks: Brick[] = [];
  let score = 0, lives = 3, level = 1, over = false;

  function buildWall() {
    const margin = 4 * u, gap = 1.2 * u;
    const top = 12 * u;
    const bw = (W - margin * 2 - gap * (COLS - 1)) / COLS;
    const bh = Math.max(10, 3.4 * u);
    bricks = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        bricks.push({ x: margin + c * (bw + gap), y: top + r * (bh + gap), w: bw, h: bh, alive: true, color: ROW_COLORS[r] });
      }
    }
  }

  const speed = () => (55 + level * 8) * u;

  function stick() {
    ball.stuck = true;
    ball.vx = 0;
    ball.vy = 0;
  }

  return {
    hint: 'Mova com ◀ ▶ e lance a bola com A',
    get score() { return score; },
    get over() { return over; },

    resize(w, h) {
      const first = W === 0;
      const sx = first ? 1 : w / W, sy = first ? 1 : h / H;
      W = w; H = h; u = Math.min(w, h) / 100;
      paddle = { w: Math.min(W * 0.32, 22 * u), h: Math.max(8, 2.2 * u), x: first ? W / 2 : paddle.x * sx, y: H - 10 * u };
      ball.r = Math.max(5, 1.5 * u);
      if (first) { buildWall(); stick(); }
      else {
        // Reposiciona proporcionalmente ao girar a tela, mantendo os blocos já quebrados.
        const alive = bricks.map((b) => b.alive);
        buildWall();
        bricks.forEach((b, i) => (b.alive = alive[i] ?? true));
        ball.x *= sx; ball.y *= sy;
      }
    },

    update(dt, input: Input) {
      if (over) return;
      paddle.x = clamp(paddle.x + input.x * W * 1.3 * dt, paddle.w / 2, W - paddle.w / 2);

      if (ball.stuck) {
        ball.x = paddle.x;
        ball.y = paddle.y - ball.r - 1;
        if (input.pressed.has('confirmar') || input.pressed.has('cima')) {
          const a = (-Math.PI / 2) + (Math.random() - 0.5) * 0.6;
          ball.vx = Math.cos(a) * speed();
          ball.vy = Math.sin(a) * speed();
          ball.stuck = false;
        }
        return;
      }

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

      // Barra: o ângulo de saída depende de onde a bola bateu.
      if (ball.vy > 0 && ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h &&
          Math.abs(ball.x - paddle.x) <= paddle.w / 2 + ball.r) {
        const hit = clamp((ball.x - paddle.x) / (paddle.w / 2), -1, 1);
        const a = -Math.PI / 2 + hit * 1.05;
        const s = speed();
        ball.vx = Math.cos(a) * s;
        ball.vy = Math.sin(a) * s;
        ball.y = paddle.y - ball.r - 1;
      }

      for (const b of bricks) {
        if (!b.alive) continue;
        const nx = clamp(ball.x, b.x, b.x + b.w), ny = clamp(ball.y, b.y, b.y + b.h);
        const dx = ball.x - nx, dy = ball.y - ny;
        if (dx * dx + dy * dy > ball.r * ball.r) continue;
        b.alive = false;
        score += 10 * level;
        if (Math.abs(dx) > Math.abs(dy)) ball.vx = -ball.vx; else ball.vy = -ball.vy;
        break;
      }

      if (bricks.every((b) => !b.alive)) {
        level += 1;
        buildWall();
        stick();
      }

      if (ball.y - ball.r > H) {
        lives -= 1;
        if (lives <= 0) over = true; else stick();
      }
    },

    draw(ctx) {
      drawBackdrop(ctx, W, H);
      for (const b of bricks) if (b.alive) glowRect(ctx, b.x, b.y, b.w, b.h, b.color, 10);
      glowRect(ctx, paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h, NEON.cyan, 16);
      glowCircle(ctx, ball.x, ball.y, ball.r, '#ffffff', 16);
      ctx.fillStyle = NEON.ink;
      ctx.font = `600 ${Math.max(12, 3 * u)}px "Chakra Petch", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`Fase ${level}   ${'●'.repeat(Math.max(0, lives))}`, 4 * u, 7 * u);
    },
  };
}
