// Movimentos de personagem. Dono: agente PERSONAGENS. Sem Math.random: tudo função do frame.
import {spring} from 'remotion';

/** Flutuação senoidal. */
export const flutuar = (frame: number, amplitude = 14, periodo = 120, fase = 0) => Math.sin(((frame + fase) / periodo) * Math.PI * 2) * amplitude;

/** Quique de entrada: retorna {y, squash} — y em px negativo = acima do chão. */
export const quique = (frame: number, fps: number, inicio: number, altura = 600) => {
  const s = spring({frame: frame - inicio, fps, config: {damping: 9, stiffness: 120, mass: 0.9}});
  const y = (1 - s) * -altura;
  // squash & stretch proporcional à velocidade aproximada
  const s2 = spring({frame: frame - inicio + 1, fps, config: {damping: 9, stiffness: 120, mass: 0.9}});
  const vel = Math.abs(s2 - s) * 18;
  return {y, squash: Math.min(vel, 0.25), visivel: frame >= inicio};
};

/** Piscar em frames determinísticos (a cada ~2,3s com variação fixa). */
export const piscando = (frame: number, ciclo = 140) => {
  const f = frame % ciclo;
  return f > ciclo - 7 ? 0.1 : 1;
};
