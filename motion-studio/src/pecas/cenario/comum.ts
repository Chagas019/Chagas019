// Utilitários compartilhados dos cenários. Dono: agente PEÇAS. Tudo determinístico.
import {interpolateColors} from 'remotion';
import {luzFe} from '../../cor/tema';

/** Cores consumidas pelos cenários. O COR fornece os valores (padrão = luzFe do projeto). */
export type CoresCenario = {
  /** Preto profundo (sombras, primeiro plano). */
  preto: string;
  /** Azul escuro do céu noturno. */
  azulNoite: string;
  /** Azul médio (névoa fria, perspectiva aérea à noite). */
  azulMedio: string;
  /** Sombra do grading frio (silhuetas distantes à noite). */
  azulSombra: string;
  /** Luz âmbar cinematográfica (fonte de luz / amanhecer). */
  ambar: string;
  /** Dourado suave (fios, contornos de luz). */
  dourado: string;
  /** Núcleo das fontes de luz (quase branco quente). */
  nucleo: string;
  /** Branco quente (faixas da estrada, detalhes). */
  brancoQuente: string;
  /** Sombra no grading quente (chão ao amanhecer). */
  sombraQuente: string;
};

export const coresCenarioPadrao: CoresCenario = {
  preto: luzFe.preto,
  azulNoite: luzFe.azulNoite,
  azulMedio: luzFe.azulMedio,
  azulSombra: luzFe.azulSombra,
  ambar: luzFe.ambar,
  dourado: luzFe.dourado,
  nucleo: luzFe.nucleo,
  brancoQuente: luzFe.brancoQuente,
  sombraQuente: luzFe.sombraQuente,
};

/** Mistura duas cores (t 0..1, com clamp). */
export const mix = (a: string, b: string, t: number) => interpolateColors(Math.max(0, Math.min(1, t)), [0, 1], [a, b]);

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** Módulo sempre positivo. */
export const modp = (a: number, n: number) => ((a % n) + n) % n;
/** Formata número para atributos SVG (evita strings longas). */
export const f = (n: number) => (Math.round(n * 10) / 10).toString();
