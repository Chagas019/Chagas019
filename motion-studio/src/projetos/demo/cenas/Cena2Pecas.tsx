// Cena 2 — integração (agente CÓDIGO).
import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {Camera, Camada} from '../../../movimento/Camera';
import {Celular} from '../../../pecas/Celular';
import {Notificacao} from '../../../pecas/Notificacao';
import {Mascote} from '../../../personagens/Mascote';
import {fontes} from '../../../texto/fontes';
import {unidade} from '../../../config/formatos';
import {paletaDemo} from '../estilo';

export const Cena2Pecas: React.FC = () => {
  const {width, height} = useVideoConfig();
  const u = unidade(width, height);
  const vertical = height > width;
  // Horizontal: celular menor e subido para a base ficar acima da faixa da legenda (revisão 1, #1).
  const alturaCel = vertical ? 1120 : 740;
  const largCel = alturaCel * 0.49;
  const subida = (vertical ? -110 : -60) * u;
  // Mascote rosa: no horizontal fica alto, ao lado da tela, longe da faixa inferior.
  const mascoteX = largCel * (vertical ? 0.62 : 0.75);
  const mascoteY = vertical ? alturaCel * 0.2 : alturaCel * 0.05 + subida;
  return (
    <Camera chaves={[{frame: 0, x: -30, zoom: 1.04}, {frame: 220, x: 30, zoom: 1}]}>
      <Camada profundidade={1}>
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', transform: `translateY(${subida}px)`}}>
          <Celular altura={alturaCel} fundoTela="linear-gradient(180deg, #1B1640 0%, #0B0A1C 100%)">
            <div style={{position: 'absolute', top: alturaCel * 0.1, width: '100%', textAlign: 'center', fontFamily: fontes.display, color: paletaDemo.texto}}>
              <div style={{fontSize: alturaCel * 0.11, fontWeight: 500, letterSpacing: '-0.03em'}}>09:41</div>
              <div style={{fontSize: alturaCel * 0.022, opacity: 0.7, fontFamily: fontes.texto}}>terça-feira, 17 de novembro</div>
            </div>
            <div style={{position: 'absolute', top: alturaCel * 0.34, left: largCel * 0.05, display: 'flex', flexDirection: 'column', gap: alturaCel * 0.018}}>
              <Notificacao app="Studio" titulo="Render aprovado ✓" mensagem="Cena 2 passou na revisão" corIcone={paletaDemo.primaria} entradaEm={22} largura={largCel * 0.86} />
              <Notificacao app="Voz" titulo="Sincronia: 100%" mensagem="15 palavras alinhadas" corIcone={paletaDemo.destaque} entradaEm={76} largura={largCel * 0.86} />
            </div>
          </Celular>
        </AbsoluteFill>
      </Camada>
      <Camada profundidade={1.6}>
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          <div style={{transform: `translate(${mascoteX}px, ${mascoteY}px)`}}>
            <Mascote tamanho={190 * u} corCorpo={paletaDemo.destaque} corBrilho="#FFB3CE" entradaEm={127} olharX={-1} />
          </div>
        </AbsoluteFill>
      </Camada>
    </Camera>
  );
};
