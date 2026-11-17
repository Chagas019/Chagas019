// Tipografia cinética: palavras sobem de uma máscara, sincronizadas com frames ou com a voz. Dono: agente TEXTO.
import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {mola, springs} from '../movimento/curvas';
import {fontes} from './fontes';

type Props = {
  palavras: string[];
  /** Frame de entrada de cada palavra (ex.: vindo do agente VOZ). */
  entradas: number[];
  tamanho: number;
  cor: string;
  /** Índices das palavras com destaque em gradiente. */
  destaques?: number[];
  gradiente?: string;
  alinhamento?: 'center' | 'left';
  saidaEm?: number;
  maxLargura?: number;
};

export const TituloCinetico: React.FC<Props> = ({palavras, entradas, tamanho, cor, destaques = [], gradiente, alinhamento = 'center', saidaEm, maxLargura}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const saida = saidaEm === undefined ? 0 : interpolate(frame, [saidaEm, saidaEm + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: alinhamento === 'center' ? 'center' : 'flex-start',
        columnGap: tamanho * 0.26,
        rowGap: tamanho * 0.05,
        maxWidth: maxLargura,
        fontFamily: fontes.display,
        fontWeight: 700,
        fontSize: tamanho,
        lineHeight: 1.04,
        letterSpacing: '-0.03em',
        color: cor,
        textAlign: alinhamento,
      }}
    >
      {palavras.map((p, i) => {
        const s = mola(frame, fps, entradas[i] ?? 0, springs.rapido);
        const y = (1 - s) * 105 + saida * -105;
        const rot = (1 - s) * 6;
        const destaque = destaques.includes(i) && gradiente;
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', paddingBottom: tamanho * 0.08, marginBottom: -tamanho * 0.08}}>
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${y}%) rotate(${rot}deg)`,
                transformOrigin: '0% 100%',
                ...(destaque ? {backgroundImage: gradiente, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'} : {}),
              }}
            >
              {p}
            </span>
          </span>
        );
      })}
    </div>
  );
};
