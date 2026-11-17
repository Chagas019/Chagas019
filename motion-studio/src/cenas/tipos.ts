// Contrato de saída do agente CENAS (storyboard executável).
export type Transicao = {tipo: 'whip' | 'fade' | 'slide' | 'corte'; frames: number; direcao?: 'esquerda' | 'direita' | 'cima' | 'baixo'};

export type Cena = {
  id: string;
  titulo: string;
  /** Duração própria da cena em frames (sem descontar transições). */
  frames: number;
  storyboard: string;
  /** Transição que leva para a PRÓXIMA cena. */
  transicaoSaida?: Transicao;
  responsaveis: string[];
};

export type PlanoCenas = {projeto: string; fps: number; cenas: Cena[]};

/** Frame absoluto em que cada cena começa, considerando sobreposição das transições. */
export const iniciosDasCenas = (plano: PlanoCenas) => {
  const inicios: number[] = [];
  let t = 0;
  plano.cenas.forEach((c, i) => {
    inicios.push(t);
    const tr = c.transicaoSaida && i < plano.cenas.length - 1 ? c.transicaoSaida : undefined;
    t += c.frames - (tr && tr.tipo !== 'corte' ? tr.frames : 0);
  });
  return inicios;
};

export const duracaoTotal = (plano: PlanoCenas) => {
  const ini = iniciosDasCenas(plano);
  const ultima = plano.cenas[plano.cenas.length - 1];
  return ini[ini.length - 1] + ultima.frames;
};
