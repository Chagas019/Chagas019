// Saída do agente CENAS para o projeto "demo".
import type {PlanoCenas} from '../../cenas/tipos';

export const planoDemo: PlanoCenas = {
  projeto: 'demo',
  fps: 60,
  cenas: [
    {
      id: 'abertura',
      titulo: 'Dez agentes. Um estúdio.',
      frames: 200,
      storyboard: 'Fundo vivo escuro. Mascote cai e quica no chão. Título entra palavra a palavra no tempo da voz. Zoom lento 1→1.08.',
      transicaoSaida: {tipo: 'whip', frames: 18, direcao: 'esquerda'},
      responsaveis: ['texto', 'personagens', 'movimento', 'cor', 'som'],
    },
    {
      id: 'pecas',
      titulo: 'Notificações, interfaces e personagens vivos',
      frames: 220,
      storyboard: 'Celular central com parallax. Duas notificações saltam no tempo da voz. Mascote espia ao lado. Legenda sincronizada.',
      transicaoSaida: {tipo: 'whip', frames: 18, direcao: 'cima'},
      responsaveis: ['pecas', 'personagens', 'movimento', 'texto', 'som'],
    },
    {
      id: 'fechamento',
      titulo: 'Tudo sincronizado com a sua voz',
      frames: 220,
      storyboard: 'Três cards de métrica entram em cascata. Título sai e a assinatura "Estúdio Motion" entra no clímax "voz".',
      responsaveis: ['pecas', 'texto', 'cor', 'som'],
    },
  ],
};
