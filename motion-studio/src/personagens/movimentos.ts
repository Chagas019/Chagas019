// Movimentos de personagem. Dono: agente PERSONAGENS. Sem Math.random: tudo função do frame.

/** Flutuação senoidal (±amplitude). Uso genérico; para personagem apoiado no chão use `flutuarAcima`. */
export const flutuar = (frame: number, amplitude = 14, periodo = 120, fase = 0) => Math.sin(((frame + fase) / periodo) * Math.PI * 2) * amplitude;

/** Flutuação que nunca desce abaixo da linha de repouso: retorna px ≤ 0 (0 = no chão, −amplitude = topo). */
export const flutuarAcima = (frame: number, amplitude = 14, periodo = 120) =>
  -amplitude * (1 - Math.cos((frame / periodo) * Math.PI * 2)) * 0.5;

/**
 * Linha do tempo do quique, em frames a 60 fps (escalada por fps/60):
 * queda livre de 12f até o 1º contato, 1º rebote de 8f, 2º rebote de 4f.
 * Alturas fisicamente coerentes com a duração (h ∝ duração²): 1 → 1/9 → 1/36.
 */
const QUEDA = 12;
const REBOTES = [8, 4];
/** Squash no contato (positivo = achatado), decrescente com a velocidade do impacto. */
const SQUASH_CONTATO = [0.22, 0.1, 0.05];
const STRETCH_MAX = 0.1;

const escalar = (f: number, fps: number) => Math.round((f * fps) / 60);

/** Frames LOCAIS (relativos a `inicio`) dos contatos com o chão. A 60 fps: [12, 20, 24]. */
export const contatosQuique = (fps = 60): number[] => {
  const out = [escalar(QUEDA, fps)];
  for (const d of REBOTES) out.push(out[out.length - 1] + escalar(d, fps));
  return out;
};

/** Frame local a partir do qual o quique está assentado (squash residual < 0,5%). A 60 fps: 34. */
export const assentadoQuique = (fps = 60) => contatosQuique(fps)[2] + escalar(10, fps);

/** Pulso de squash no contato com follow-through (vira leve stretch e volta). d = frames desde o contato. */
const pulso = (d: number, amp: number, fps: number) => {
  if (d < 0) return 0;
  const k = d * (60 / fps);
  return amp * Math.exp(-k / 2.5) * Math.cos((k * Math.PI) / 5);
};

/**
 * Quique de entrada: retorna {y, squash, visivel, noAr, contatos}.
 * - `y` em px, SEMPRE ≤ 0 (0 = chão, negativo = acima). Nunca atravessa o chão.
 * - `squash` com sinal: > 0 achatado no contato, < 0 esticado no ar (aplicar `scale(1+s, 1-s)`).
 * - `contatos`: frames ABSOLUTOS (mesma base de `frame`) dos contatos com o chão — para SFX.
 */
export const quique = (frame: number, fps: number, inicio: number, altura = 600) => {
  const t = frame - inicio;
  const c = contatosQuique(fps);
  const contatos = c.map((x) => x + inicio);
  const T0 = c[0];
  let y = 0;
  let stretch = 0;
  if (t < 0) {
    y = -altura;
  } else if (t < T0) {
    // queda livre: y = −H(1 − p²), velocidade ∝ p
    const p = t / T0;
    y = -altura * (1 - p * p);
    stretch = -STRETCH_MAX * p;
  } else {
    for (let k = 0; k < REBOTES.length; k++) {
      const ini = c[k];
      const fim = c[k + 1];
      if (t >= ini && t < fim) {
        const D = fim - ini;
        const p = (t - ini) / D;
        const r = D / (2 * T0); // razão de velocidade (restituição)
        y = -altura * r * r * 4 * p * (1 - p); // parábola, 0 nos dois contatos
        stretch = -STRETCH_MAX * r * Math.abs(1 - 2 * p);
      }
    }
  }
  let squash = stretch;
  for (let k = 0; k < c.length; k++) squash += pulso(t - c[k], SQUASH_CONTATO[k], fps);
  squash = Math.max(-0.15, Math.min(0.25, squash));
  return {y: Math.min(0, y), squash, visivel: t >= 0, noAr: t < c[c.length - 1], contatos};
};

/** Piscar em frames determinísticos (a cada ~2,3s com variação fixa). */
export const piscando = (frame: number, ciclo = 140) => {
  const f = ((frame % ciclo) + ciclo) % ciclo;
  return f > ciclo - 7 ? 0.1 : 1;
};
