// Notificação estilo push (glassmorphism). Dono: agente PEÇAS.
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {mola, springs} from '../movimento/curvas';
import {fontes} from '../texto/fontes';

type Props = {
  titulo: string;
  mensagem: string;
  app: string;
  corIcone: string;
  entradaEm: number;
  largura: number;
};

export const Notificacao: React.FC<Props> = ({titulo, mensagem, app, corIcone, entradaEm, largura}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = mola(frame, fps, entradaEm, springs.elastico);
  if (frame < entradaEm) return null;
  const u = largura / 600;
  return (
    <div
      style={{
        width: largura,
        display: 'flex',
        gap: 18 * u,
        alignItems: 'center',
        padding: `${20 * u}px ${22 * u}px`,
        borderRadius: 30 * u,
        background: 'rgba(255,255,255,0.14)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.22)',
        boxShadow: `0 ${18 * u}px ${50 * u}px rgba(0,0,0,0.35)`,
        transform: `translateY(${(1 - s) * -120 * u}px) scale(${0.85 + s * 0.15})`,
        opacity: Math.min(1, s * 1.6),
        fontFamily: fontes.texto,
        color: '#fff',
      }}
    >
      <div style={{width: 72 * u, height: 72 * u, flexShrink: 0, borderRadius: 20 * u, background: corIcone, display: 'grid', placeItems: 'center', fontSize: 38 * u, fontWeight: 800}}>
        {app.slice(0, 1)}
      </div>
      <div style={{minWidth: 0, flex: 1}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 22 * u, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.04em'}}>
          <span>{app}</span>
          <span>agora</span>
        </div>
        <div style={{fontSize: 30 * u, fontWeight: 600, marginTop: 4 * u, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{titulo}</div>
        <div style={{fontSize: 26 * u, opacity: 0.85, marginTop: 2 * u}}>{mensagem}</div>
      </div>
    </div>
  );
};
