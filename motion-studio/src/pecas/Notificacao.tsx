// Notificação estilo push (glassmorphism). Dono: agente PEÇAS.
// Legibilidade: app/mensagem >= 34 px e título >= 36 px reais (base 1080), mesmo quando a
// notificação é estreita (ex.: dentro do celular no horizontal). Título e mensagem quebram
// em até 2 linhas cada em vez de cortar: a LARGURA externa é a prop `largura`, a ALTURA cresce.
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
  /** Piso de legibilidade do corpo em px (base 1080). O título usa piso + 2. Padrão 34. */
  minFontePx?: number;
};

const linhas = (n: number): React.CSSProperties => ({
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: n,
  overflow: 'hidden',
  overflowWrap: 'anywhere',
});

export const Notificacao: React.FC<Props> = ({titulo, mensagem, app, corIcone, entradaEm, largura, minFontePx = 34}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const s = mola(frame, fps, entradaEm, springs.elastico);
  if (frame < entradaEm) return null;
  const u = largura / 600;
  const k = Math.min(width, height) / 1080;
  const piso = minFontePx * k;
  const fTitulo = Math.max(36 * u, piso + 2 * k);
  const fCorpo = Math.max(34 * u, piso);
  // Notificação estreita (texto preso no piso): o ícone sobe para a linha do app, como no
  // iOS compacto, e o texto ganha a largura toda — menos quebras, altura menor.
  const apertado = fCorpo > 34 * u * 1.15;
  const icone = apertado ? fCorpo * 1.05 : 72 * u;
  const caixaIcone = (
    <div
      style={{
        width: icone,
        height: icone,
        flexShrink: 0,
        marginTop: apertado ? 0 : 4 * u,
        borderRadius: icone * 0.28,
        background: corIcone,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
        display: 'grid',
        placeItems: 'center',
        fontSize: icone * 0.53,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {app.slice(0, 1)}
    </div>
  );
  return (
    <div
      style={{
        width: largura,
        boxSizing: 'border-box',
        display: 'flex',
        gap: 18 * u,
        alignItems: 'flex-start',
        padding: apertado ? `${16 * k}px ${16 * k}px ${18 * k}px` : `${22 * u}px ${22 * u}px`,
        borderRadius: 30 * u,
        background: 'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.10) 100%)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.22)',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 ${4 * u}px ${12 * u}px rgba(0,0,0,0.18), 0 ${18 * u}px ${50 * u}px rgba(0,0,0,0.35)`,
        transform: `translateY(${(1 - s) * -120 * u}px) scale(${0.85 + s * 0.15})`,
        opacity: Math.min(1, s * 1.6),
        fontFamily: fontes.texto,
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      {apertado ? null : caixaIcone}
      <div style={{minWidth: 0, flex: 1}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10 * k, fontSize: fCorpo, lineHeight: 1.15}}>
          {apertado ? caixaIcone : null}
          <span style={{minWidth: 0, flex: 1, opacity: 0.72, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{app}</span>
          <span style={{flexShrink: 0, opacity: 0.72}}>agora</span>
        </div>
        <div style={{fontSize: fTitulo, fontWeight: 600, lineHeight: 1.15, marginTop: (apertado ? 8 : 4) * k, ...linhas(2)}}>{titulo}</div>
        <div style={{fontSize: fCorpo, lineHeight: 1.18, opacity: 0.88, marginTop: 2 * k, ...linhas(2)}}>{mensagem}</div>
      </div>
    </div>
  );
};
