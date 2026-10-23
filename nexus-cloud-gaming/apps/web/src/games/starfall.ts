import { clamp, drawBackdrop, glowCircle, NEON, type Game, type Input } from './types';

interface Enemy { x: number; y: number; r: number; vy: number; phase: number; amp: number; hp: number }
interface Shot { x: number; y: number }

/** Tiro em nave vertical: mova em 8 direções, segure A para atirar, 3 escudos. */
export function createStarfall(): Game {
  let W = 0, H = 0, u = 1;
  let ship = { x: 0, y: 0, r: 0 };
  let shots: Shot[] = [];
  let enemies: Enemy[] = [];
  let sparks: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  let score = 0, shields = 3, cooldown = 0, spawnIn = 1, time = 0, invulnerable = 0, over = false;
  const stars = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7 }));

  function explode(x: number, y: number, color = 12) {
    for (let i = 0; i < color; i++) {
      const a = Math.random() * Math.PI * 2, s = (10 + Math.random() * 30) * u;
      sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 });
    }
  }

  return {
    hint: 'Mova a nave e segure A para atirar',
    get score() { return score; },
    get over() { return over; },

    resize(w, h) {
      const first = W === 0;
      const sx = first ? 1 : w / W, sy = first ? 1 : h / H;
      W = w; H = h; u = Math.min(w, h) / 100;
      ship.r = 3.6 * u;
      if (first) { ship.x = W / 2; ship.y = H * 0.82; }
      else { ship.x *= sx; ship.y *= sy; enemies.forEach((e) => { e.x *= sx; e.y *= sy; }); }
    },

    update(dt, input: Input) {
      if (over) return;
      time += dt;
      const sp = 75 * u;
      ship.x = clamp(ship.x + input.x * sp * dt, ship.r, W - ship.r);
      ship.y = clamp(ship.y + input.y * sp * dt, H * 0.35, H - ship.r * 1.5);

      cooldown -= dt;
      if (input.held.has('confirmar') && cooldown <= 0) {
        shots.push({ x: ship.x, y: ship.y - ship.r });
        cooldown = 0.16;
      }
      for (const s of shots) s.y -= 130 * u * dt;
      shots = shots.filter((s) => s.y > -10);

      spawnIn -= dt;
      if (spawnIn <= 0) {
        const r = (2.8 + Math.random() * 2.2) * u;
        enemies.push({ x: r + Math.random() * (W - r * 2), y: -r, r, vy: (16 + Math.random() * 14 + time * 0.6) * u, phase: Math.random() * 6, amp: Math.random() * 14 * u, hp: r > 4 * u ? 2 : 1 });
        spawnIn = Math.max(0.25, 1.1 - time * 0.012) * (0.6 + Math.random() * 0.8);
      }
      for (const e of enemies) {
        e.y += e.vy * dt;
        e.x = clamp(e.x + Math.cos(time * 2 + e.phase) * e.amp * dt, e.r, W - e.r);
      }

      for (const e of enemies) {
        for (const s of shots) {
          if (e.hp > 0 && (s.x - e.x) ** 2 + (s.y - e.y) ** 2 < (e.r + u) ** 2) {
            e.hp -= 1;
            s.y = -100;
            if (e.hp <= 0) { score += e.r > 4 * u ? 25 : 10; explode(e.x, e.y); }
          }
        }
      }

      invulnerable -= dt;
      for (const e of enemies) {
        const hit = e.hp > 0 && (e.x - ship.x) ** 2 + (e.y - ship.y) ** 2 < (e.r + ship.r * 0.75) ** 2;
        if (hit && invulnerable <= 0) {
          e.hp = 0;
          shields -= 1;
          invulnerable = 1.5;
          explode(ship.x, ship.y, 20);
          if (shields <= 0) over = true;
        }
        // Inimigo que passa pelo setor também custa pontos, não escudos.
        if (e.y - e.r > H && e.hp > 0) { e.hp = 0; score = Math.max(0, score - 5); }
      }
      enemies = enemies.filter((e) => e.hp > 0);

      for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      sparks = sparks.filter((p) => p.life > 0);
    },

    draw(ctx) {
      drawBackdrop(ctx, W, H);
      for (const s of stars) {
        const y = (s.y * H + time * 30 * u * s.z) % H;
        ctx.fillStyle = `rgba(232,235,247,${0.2 + s.z * 0.6})`;
        ctx.fillRect(s.x * W, y, 1.5, 1.5 + s.z * 2);
      }
      for (const s of shots) glowCircle(ctx, s.x, s.y, Math.max(2, 0.8 * u), NEON.cyan, 10);
      for (const e of enemies) {
        glowCircle(ctx, e.x, e.y, e.r, e.hp > 1 ? NEON.amber : NEON.pink, 16);
        ctx.fillStyle = NEON.bg2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.45, 0, Math.PI * 2); ctx.fill();
      }
      for (const p of sparks) {
        ctx.fillStyle = `rgba(251,191,36,${p.life * 2})`;
        ctx.fillRect(p.x, p.y, 3, 3);
      }
      if (!(invulnerable > 0 && Math.floor(time * 12) % 2 === 0)) {
        ctx.shadowColor = NEON.blue; ctx.shadowBlur = 18; ctx.fillStyle = NEON.ink;
        ctx.beginPath();
        ctx.moveTo(ship.x, ship.y - ship.r * 1.3);
        ctx.lineTo(ship.x + ship.r, ship.y + ship.r);
        ctx.lineTo(ship.x, ship.y + ship.r * 0.5);
        ctx.lineTo(ship.x - ship.r, ship.y + ship.r);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = NEON.ink;
      ctx.font = `600 ${Math.max(12, 3 * u)}px "Chakra Petch", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`Escudos ${'◆'.repeat(Math.max(0, shields))}`, 4 * u, 7 * u);
    },
  };
}
