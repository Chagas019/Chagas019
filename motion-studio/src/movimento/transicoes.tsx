// Transições customizadas para @remotion/transitions. Dono: agente MOVIMENTO.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {linearTiming, type TransitionPresentation, type TransitionPresentationComponentProps} from '@remotion/transitions';
import {curvas} from './curvas';

type Direcao = 'esquerda' | 'direita' | 'cima' | 'baixo';
type WhipProps = {direcao?: Direcao; desfoque?: number};

/** Whip pan: as duas cenas atravessam a tela com motion blur direcional e leve stretch. */
const Whip: React.FC<TransitionPresentationComponentProps<WhipProps>> = ({children, presentationDirection, presentationProgress, passedProps}) => {
  const {direcao = 'esquerda', desfoque = 60} = passedProps;
  const horizontal = direcao === 'esquerda' || direcao === 'direita';
  const sinal = direcao === 'esquerda' || direcao === 'cima' ? -1 : 1;
  const p = presentationProgress;
  // entrando: vem de +100% para 0; saindo: vai de 0 para -100%
  const desloc = presentationDirection === 'entering' ? (1 - p) * -sinal * 100 : p * sinal * 100;
  const blur = Math.sin(p * Math.PI) * desfoque;
  const stretch = 1 + Math.sin(p * Math.PI) * 0.12;
  const t = horizontal ? `translateX(${desloc}%) scaleX(${stretch})` : `translateY(${desloc}%) scaleY(${stretch})`;
  return <AbsoluteFill style={{transform: t, filter: `blur(${blur.toFixed(2)}px)`}}>{children}</AbsoluteFill>;
};

export const whip = (props: WhipProps = {}): TransitionPresentation<WhipProps> => ({component: Whip, props});
export const tempoWhip = (frames = 18) => linearTiming({durationInFrames: frames, easing: curvas.whip});
