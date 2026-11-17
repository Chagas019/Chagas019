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
};

export const CardMetrica: React.FC<Props> = ({rotulo, valor, sufixo = '', barras, cor, entradaEm, largura}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = mola(frame, fps, entradaEm, springs.natural);
  const n = Math.round(interpolate(frame, [entradaEm, entradaEm + 50], [0, valor], {easing: curvas.entrada, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const u = largura / 420;
  const max = Math.max(...barras);
  return (
    <div
      style={{
        width: largura,
        padding: 28 * u,
        borderRadius: 32 * u,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: `0 ${24 * u}px ${60 * u}px rgba(0,0,0,0.35)`,
        transform: `translateY(${(1 - s) * 80 * u}px)`,
        opacity: s,
        fontFamily: fontes.texto,
        color: '#fff',
      }}
    >
      <div style={{fontSize: 24 * u, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em'}}>{rotulo}</div>
      <div style={{fontFamily: fontes.display, fontSize: 92 * u, fontWeight: 700, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums'}}>
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
