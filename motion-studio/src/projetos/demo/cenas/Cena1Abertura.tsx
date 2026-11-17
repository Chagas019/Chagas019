// Cena 1 — integração (agente CÓDIGO).
import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {Camera, Camada} from '../../../movimento/Camera';
import {TituloCinetico} from '../../../texto/TituloCinetico';
import {Mascote} from '../../../personagens/Mascote';
import {escala} from '../../../texto/fontes';
import {areaSegura, msParaFrame, unidade} from '../../../config/formatos';
import {paletaDemo, gradDemo} from '../estilo';
import {vozDemo} from '../voz';

export const Cena1Abertura: React.FC = () => {
  const {width, height} = useVideoConfig();
  const u = unidade(width, height);
  const vertical = height > width;
  const seg = areaSegura(width, height);
  const palavras = vozDemo.palavras.slice(0, 4);
  return (
    <Camera chaves={[{frame: 0, zoom: 1}, {frame: 200, zoom: 1.08}]}>
      <Camada profundidade={1}>
        <AbsoluteFill
          style={{
            flexDirection: vertical ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 80 * u,
            padding: `${seg.topo}px ${seg.x}px ${seg.base}px`,
          }}
        >
          <TituloCinetico
            palavras={palavras.map((w) => w.text.trim())}
            entradas={palavras.map((w) => msParaFrame(w.startMs))}
            tamanho={escala.hero * u}
            cor={paletaDemo.texto}
            destaques={[3]}
            gradiente={gradDemo.marca}
            alinhamento={vertical ? 'center' : 'left'}
            maxLargura={vertical ? width - seg.x * 2 : width * 0.5}
          />
          <Mascote tamanho={340 * u} corCorpo={paletaDemo.primaria} corBrilho={paletaDemo.secundaria} entradaEm={20} />
        </AbsoluteFill>
      </Camada>
    </Camera>
  );
};
