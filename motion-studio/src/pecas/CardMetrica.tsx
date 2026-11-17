// Card de dashboard com número contando e mini-gráfico. Dono: agente PEÇAS.
import React from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {curvas, mola, springs} from '../movimento/curvas';
import {fontes} from '../texto/fontes';

type Props = {
  rotulo: string;
  valor: number;
  sufixo?: string;
  barras: number[];
  cor: string;
  entradaEm: number;
  largura: number;
  /** Piso de legibilidade do rótulo em px (base 1080). Padrão 34. */
  minFontePx?: number;
};

export const CardMetrica: React.FC<Props> = ({rotulo, valor, sufixo = '', barras, cor, entradaEm, largura, minFontePx = 34}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const s = mola(frame, fps, entradaEm, springs.natural);
  const n = Math.round(interpolate(frame, [entradaEm, entradaEm + 50], [0, valor], {easing: curvas.entrada, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const u = largura / 420;
  // Piso em px reais do quadro: o card pode ficar estreito (3 lado a lado no vertical).
  const piso = minFontePx * (Math.min(width, height) / 1080);
  const fRotulo = Math.max(34 * u, piso);
  const max = Math.max(...barras);
  return (
    <div
      style={{
        width: largura,
        boxSizing: 'border-box',
        padding: `${26 * u}px ${24 * u}px`,
        borderRadius: 32 * u,
        background: 'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.05) 100%)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 ${6 * u}px ${14 * u}px rgba(0,0,0,0.20), 0 ${24 * u}px ${60 * u}px rgba(0,0,0,0.35)`,
        transform: `translateY(${(1 - s) * 80 * u}px)`,
        opacity: Math.min(1, s),
        fontFamily: fontes.texto,
        color: '#fff',
        overflow: 'hidden',
        // Antes da entrada o card ocupa o espaço (fileira em flex não pula), mas não pinta nada.
        visibility: frame < entradaEm ? 'hidden' : 'visible',
      }}
    >
      <div
        style={{
          fontSize: fRotulo,
          fontWeight: 600,
          lineHeight: 1.15,
          opacity: 0.78,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {rotulo}
      </div>
      <div style={{fontFamily: fontes.display, fontSize: 92 * u, fontWeight: 700, lineHeight: 1.05, marginTop: 6 * u, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>
        {n}
        <span style={{color: cor}}>{sufixo}</span>
      </div>
      <div style={{display: 'flex', alignItems: 'flex-end', gap: 10 * u, height: 90 * u, marginTop: 18 * u}}>
        {barras.map((b, i) => {
          const g = mola(frame, fps, entradaEm + 10 + i * 4, springs.natural);
          return <div key={i} style={{flex: 1, height: `${(b / max) * 100 * g}%`, borderRadius: 8 * u, background: i === barras.length - 1 ? cor : 'rgba(255,255,255,0.25)'}} />;
        })}
      </div>
    </div>
  );
};
