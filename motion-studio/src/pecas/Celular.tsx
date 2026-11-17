// Mockup de celular. Dono: agente PEÇAS.
// Opcional: `hora`/`data` desenham o cabeçalho da tela de bloqueio com a data legível
// (>= 34 px reais, base 1080), quebrando em até 2 linhas em vez de cortar.
import React from 'react';
import {useVideoConfig} from 'remotion';
import {fontes} from '../texto/fontes';

type Props = {
  altura: number;
  children?: React.ReactNode;
  fundoTela?: string;
  /** Hora da tela de bloqueio (ex.: "09:41"). Sem `hora` e `data`, nenhum cabeçalho é desenhado. */
  hora?: string;
  /** Data da tela de bloqueio (ex.: "terça-feira, 17 de novembro"). */
  data?: string;
  /** Cor do texto do cabeçalho (da paleta do COR). Padrão branco. */
  corTexto?: string;
  /** Piso de legibilidade da data em px (base 1080). Padrão 34. */
  minFontePx?: number;
};

/** Topo (px, relativo à tela) onde o conteúdo pode começar abaixo do cabeçalho de bloqueio. */
export const topoConteudoCelular = (altura: number) => altura * 0.34;

export const Celular: React.FC<Props> = ({altura, children, fundoTela = '#0E0C22', hora, data, corTexto = '#fff', minFontePx = 34}) => {
  const {width, height} = useVideoConfig();
  const largura = altura * 0.49;
  const borda = altura * 0.018;
  const raio = altura * 0.075;
  const fData = Math.max(altura * 0.03, minFontePx * (Math.min(width, height) / 1080));
  return (
    <div
      style={{
        width: largura,
        height: altura,
        borderRadius: raio,
        padding: borda,
        background: 'linear-gradient(145deg, #3A3A4A 0%, #121218 60%, #2A2A36 100%)',
        boxShadow: `0 ${altura * 0.012}px ${altura * 0.025}px rgba(0,0,0,0.35), 0 ${altura * 0.05}px ${altura * 0.12}px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.08)`,
      }}
    >
      <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: raio - borda, background: fundoTela, overflow: 'hidden'}}>
        <div
          style={{
            position: 'absolute',
            top: altura * 0.016,
            left: '50%',
            transform: 'translateX(-50%)',
            width: largura * 0.3,
            height: altura * 0.032,
            borderRadius: 999,
            background: '#000',
            zIndex: 10,
          }}
        />
        {hora || data ? (
          <div
            style={{
              position: 'absolute',
              top: altura * 0.085,
              left: largura * 0.06,
              right: largura * 0.06,
              textAlign: 'center',
              color: corTexto,
            }}
          >
            {hora ? (
              <div style={{fontFamily: fontes.display, fontSize: altura * 0.11, fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>
                {hora}
              </div>
            ) : null}
            {data ? (
              <div
                style={{
                  fontFamily: fontes.texto,
                  fontSize: fData,
                  lineHeight: 1.15,
                  opacity: 0.78,
                  marginTop: altura * 0.004,
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                  overflow: 'hidden',
                }}
              >
                {data}
              </div>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
};
