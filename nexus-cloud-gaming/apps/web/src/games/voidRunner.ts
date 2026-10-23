import { drawBackdrop, glowCircle, glowRect, NEON, overlaps, type Game, type Input } from './types';

interface Obstacle { x: number; y: number; w: number; h: number; kind: 'bloco' | 'orbe' }

/** Corrida infinita de um botão: A pula (com pulo duplo), a velocidade só cresce. */
export function createVoidRunner(): Game {
  let W = 0, H = 0, u = 1, ground = 0;
  let player = { x: 0, y: 0, size: 0, vy: 0, jumps: 0 };
  let obstacles: Obstacle[] = [];
  let distance = 0, speed = 0, spawnIn = 0, scroll = 0, over = false;
  const stars = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random() * 0.7, z: 0.2 + Math.random() * 0.8 }));

  const gravity = () => 260 * u;
  const jumpV = () => -95 * u;

  return {
    hint: 'Toque ou aperte A para pular. Dá para pular de novo no ar.',
    get score() { return Math.floor(distance); },
    get over() { return over; },

    resize(w, h) {
      const first = W === 0;
      W = w; H = h; u = Math.min(w, h) / 100;
      ground = H * 0.8;
      player.size = 7 * u;
      player.x = W * 0.18;
      if (first) { player.y = ground - player.size; speed = 55 * u; spawnIn = 1; }
      else { player.y = Math.min(player.y, ground - player.size); obstacles = []; spawnIn = 0.8; }
    },

    update(dt, input: Input) {
      if (over) return;
      if ((input.pressed.has('confirmar') || input.pressed.has('cima')) && player.jumps < 2) {
        player.vy = jumpV() * (player.jumps === 0 ? 1 : 0.85);
        player.jumps += 1;
      }
      player.vy += gravity() * dt;
      player.y += player.vy * dt;
      if (player.y >= ground - player.size) { player.y = ground - player.size; player.vy = 0; player.jumps = 0; }

      speed += 2.2 * u * dt;
      distance += (speed / u) * dt * 0.1;
      scroll += speed * dt;

      spawnIn -= dt;
      if (spawnIn <= 0) {
        if (Math.random() < 0.72) {
          const h = (5 + Math.random() * 9) * u;
          obstacles.push({ kind: 'bloco', x: W + 10, y: ground - h, w: (4 + Math.random() * 5) * u, h });
        } else {
          const r = 3 * u;
          obstacles.push({ kind: 'orbe', x: W + 10, y: ground - player.size - (14 + Math.random() * 14) * u, w: r * 2, h: r * 2 });
        }
        const minGap = 0.55 + 20 / (speed / u);
        spawnIn = minGap + Math.random() * 0.9;
      }
      for (const o of obstacles) o.x -= speed * dt;
      obstacles = obstacles.filter((o) => o.x + o.w > -20);

      // Hitbox um pouco menor que o desenho, para colisões parecerem justas.
      const pad = player.size * 0.15;
      const box = { x: player.x + pad, y: player.y + pad, w: player.size - pad * 2, h: player.size - pad * 2 };
      if (obstacles.some((o) => overlaps(box, o))) over = true;
    },

    draw(ctx) {
      drawBackdrop(ctx, W, H, scroll * 0.3);
      for (const s of stars) {
        const x = ((s.x * W - scroll * 0.1 * s.z) % W + W) % W;
        ctx.fillStyle = `rgba(232,235,247,${0.25 + s.z * 0.5})`;
        ctx.fillRect(x, s.y * H, 2, 2);
      }
      glowRect(ctx, 0, ground, W, 2, NEON.violet, 18);
      ctx.fillStyle = 'rgba(139,92,246,0.08)';
      ctx.fillRect(0, ground + 2, W, H - ground);
      for (const o of obstacles) {
        if (o.kind === 'bloco') glowRect(ctx, o.x, o.y, o.w, o.h, NEON.pink, 14);
        else glowCircle(ctx, o.x + o.w / 2, o.y + o.h / 2, o.w / 2, NEON.amber, 16);
      }
      const tilt = player.jumps ? Math.min(0.4, Math.abs(player.vy) / (120 * u)) : 0;
      ctx.save();
      ctx.translate(player.x + player.size / 2, player.y + player.size / 2);
      ctx.rotate(tilt);
      glowRect(ctx, -player.size / 2, -player.size / 2, player.size, player.size, NEON.cyan, 18);
      ctx.restore();
    },
  };
}
