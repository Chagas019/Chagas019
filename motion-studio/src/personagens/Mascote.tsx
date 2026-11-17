// Personagem 2D vetorial (mascote "Pixo") com entrada, flutuação, rotação, piscar e sombra. Dono: agente PERSONAGENS.
import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {contatosQuique, flutuarAcima, piscando, quique} from './movimentos';

type Props = {
  tamanho: number;
  corCorpo: string;
  corBrilho: string;
  entradaEm?: number;
  /** Graus por segundo de rotação lenta. */
  rotacao?: number;
  olharX?: number;
  /**
   * Altura da queda em px (acima da posição de repouso). Padrão: horizontal = 2,2·tamanho
   * (queda longa, vem de cima); vertical = 0,3·tamanho (queda curta com fade + escala,
   * para não cruzar o título empilhado acima). Use 0 para entrar só por fade/escala no lugar.
   */
  alturaQueda?: number;
};

export const Mascote: React.FC<Props> = ({tamanho, corCorpo, corBrilho, entradaEm = 0, rotacao = 0, olharX = 0, alturaQueda}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const idGrad = 'corpo-' + React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const vertical = height > width;
  const H = Math.max(0, alturaQueda ?? tamanho * (vertical ? 0.3 : 2.2));
  const queda = H > 0;
  const q = quique(frame, fps, entradaEm, H);
  const t = frame - entradaEm;
  const [c1, , c3] = contatosQuique(fps);
  // flutuação só depois de assentar, entrando suave e sempre acima do chão
  const rampa = interpolate(t, [c3 + 4, c3 + 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const f = flutuarAcima(Math.max(0, t - c3 - 4), tamanho * 0.04, 110) * rampa;
  const y = (queda ? q.y : 0) + f;
  // squash só faz sentido quando há impacto; sem queda, o pouso é um leve "pop" de escala
  const squash = queda ? q.squash : 0;
  const altura = -y;
  const sombraEscala = Math.max(0.35, 1 - altura / (tamanho * 2.4));
  const sombraOpacidade = Math.max(0.4, 1 - altura / (tamanho * 3));
  // entrada: fade rápido sempre; escala (antecipando o tamanho final) quando a queda é curta
  const curta = H < tamanho;
  const opacidade = interpolate(t, [0, curta ? 8 : 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const escalaEntrada = curta
    ? interpolate(t, [0, c1], [queda ? 0.6 : 0.4, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(queda ? 1 : 2))})
    : 1;
  const rot = Math.sin(frame / 90) * 4 + (rotacao * frame) / fps;
  const olho = piscando(frame + entradaEm);
  if (!q.visivel) return null;
  return (
    <div style={{position: 'relative', width: tamanho, height: tamanho * 1.25}}>
      {/* sombra de contato */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 0,
          width: tamanho * 0.8,
          height: tamanho * 0.12,
          transform: `translateX(-50%) scale(${sombraEscala * escalaEntrada * (1 + squash * 0.6)}, ${sombraEscala * escalaEntrada})`,
          opacity: opacidade * sombraOpacidade,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, transparent 70%)',
          filter: 'blur(4px)',
        }}
      />
      <svg
        viewBox="0 0 200 200"
        width={tamanho}
        height={tamanho}
        style={{
          position: 'absolute',
          left: 0,
          bottom: tamanho * 0.08,
          transform: `translateY(${y}px) rotate(${rot}deg) scale(${escalaEntrada * (1 + squash)}, ${escalaEntrada * (1 - squash)})`,
          opacity: opacidade,
          transformOrigin: '50% 100%',
          overflow: 'visible',
        }}
      >
        <defs>
          <radialGradient id={idGrad} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={corBrilho} />
            <stop offset="100%" stopColor={corCorpo} />
          </radialGradient>
        </defs>
        <path d="M100 12 C155 12 188 55 188 108 C188 160 150 190 100 190 C50 190 12 160 12 108 C12 55 45 12 100 12 Z" fill={`url(#${idGrad})`} />
        {/* brilho especular para profundidade */}
        <ellipse cx="68" cy="52" rx="26" ry="14" fill="white" opacity="0.35" transform="rotate(-25 68 52)" />
        {/* olhos */}
        {[72, 128].map((cx) => (
          <g key={cx} transform={`translate(${cx + olharX * 6} 102) scale(1 ${olho})`}>
            <ellipse rx="15" ry="20" fill="white" />
            <circle cx={olharX * 4} cy="3" r="9" fill="#120F2A" />
            <circle cx={olharX * 4 + 3} cy="-2" r="3" fill="white" />
          </g>
        ))}
        <path d="M84 142 Q100 156 116 142" stroke="#120F2A" strokeWidth="6" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
};
