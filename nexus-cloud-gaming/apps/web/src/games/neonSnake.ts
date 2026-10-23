import { drawBackdrop, glowCircle, glowRect, NEON, type Game, type Input } from './types';

type Dir = { x: number; y: number };
const CELLS_SHORT_SIDE = 18;

/** Cobrinha em grade: não pode bater na parede nem em si mesma; acelera a cada orbe. */
export function createNeonSnake(): Game {
  let W = 0, H = 0, cell = 1, cols = 1, rows = 1, ox = 0, oy = 0;
  let body: { x: number; y: number }[] = [];
  let dir: Dir = { x: 1, y: 0 };
  let queued: Dir[] = [];
  let food = { x: 0, y: 0 };
  let step = 0.14, acc = 0, score = 0, over = false, started = false;

  function placeFood() {
    const free: { x: number; y: number }[] = [];
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) if (!body.some((b) => b.x === x && b.y === y)) free.push({ x, y });
    food = free[Math.floor(Math.random() * free.length)] ?? { x: 0, y: 0 };
  }

  function reset() {
    const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
    body = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
    dir = { x: 1, y: 0 };
    queued = [];
    placeFood();
  }

  function wanted(input: Input): Dir | null {
    if (input.pressed.has('cima')) return { x: 0, y: -1 };
    if (input.pressed.has('baixo')) return { x: 0, y: 1 };
    if (input.pressed.has('esquerda')) return { x: -1, y: 0 };
    if (input.pressed.has('direita')) return { x: 1, y: 0 };
    // Analógico: só vale com inclinação clara, para não virar sozinho com "drift".
    if (Math.abs(input.x) > 0.6 && Math.abs(input.x) > Math.abs(input.y)) return { x: Math.sign(input.x), y: 0 };
    if (Math.abs(input.y) > 0.6) return { x: 0, y: Math.sign(input.y) };
    return null;
  }

  return {
    hint: 'Mude a direção com o direcional ou analógico',
    get score() { return score; },
    get over() { return over; },

    resize(w, h) {
      W = w; H = h;
      cell = Math.floor(Math.min(w, h) / CELLS_SHORT_SIDE);
      const nc = Math.floor(w / cell), nr = Math.floor(h / cell);
      ox = Math.floor((w - nc * cell) / 2); oy = Math.floor((h - nr * cell) / 2);
      // Mudou a grade (girou a tela): recomeça a cobra no centro para não ficar fora da área.
      if (nc !== cols || nr !== rows) { cols = nc; rows = nr; reset(); }
    },

    update(dt, input: Input) {
      if (over) return;
      const w = wanted(input);
      if (w) {
        const last = queued[queued.length - 1] ?? dir;
        if (w.x !== -last.x || w.y !== -last.y) {
          if (w.x !== last.x || w.y !== last.y) queued.push(w);
          started = true;
        }
      }
      if (!started) return;
      acc += dt;
      while (acc >= step && !over) {
        acc -= step;
        if (queued.length) dir = queued.shift()!;
        const head = { x: body[0].x + dir.x, y: body[0].y + dir.y };
        const ate = head.x === food.x && head.y === food.y;
        const tail = ate ? body : body.slice(0, -1);
        if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows || tail.some((b) => b.x === head.x && b.y === head.y)) {
          over = true;
          return;
        }
        body = [head, ...tail];
        if (ate) { score += 10; step = Math.max(0.06, step * 0.97); placeFood(); }
      }
    },

    draw(ctx) {
      drawBackdrop(ctx, W, H);
      ctx.strokeStyle = 'rgba(139,92,246,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(ox + 1, oy + 1, cols * cell - 2, rows * cell - 2);
      glowCircle(ctx, ox + food.x * cell + cell / 2, oy + food.y * cell + cell / 2, cell * 0.32, NEON.amber, 16);
      body.forEach((b, i) => {
        const g = 0.15 * cell;
        glowRect(ctx, ox + b.x * cell + g, oy + b.y * cell + g, cell - g * 2, cell - g * 2, i === 0 ? NEON.ink : NEON.green, i === 0 ? 16 : 8);
      });
    },
  };
}
