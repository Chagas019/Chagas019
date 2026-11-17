// Cena 3 — integração (agente CÓDIGO).
import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {TituloCinetico} from '../../../texto/TituloCinetico';
import {CardMetrica} from '../../../pecas/CardMetrica';
import {escala} from '../../../texto/fontes';
import {areaSegura, unidade} from '../../../config/formatos';
import {paletaDemo, gradDemo} from '../estilo';

export const Cena3Fechamento: React.FC = () => {
  const {width, height} = useVideoConfig();
  const u = unidade(width, height);
  const vertical = height > width;
  const seg = areaSegura(width, height);
  const gap = 24 * u;
  const largCard = vertical ? (width - seg.x * 2 - gap * 2) / 3 : 420 * u;
  return (
    <AbsoluteFill style={{padding: `${seg.topo}px ${seg.x}px ${seg.base + 200 * u}px`, alignItems: 'center', justifyContent: vertical ? 'center' : 'center', gap: 70 * u}}>
      <div style={{position: 'relative', height: escala.h1 * u * 2.3, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{position: 'absolute'}}>
          <TituloCinetico palavras={['Tudo', 'sincronizado']} entradas={[24, 42]} tamanho={escala.h1 * u} cor={paletaDemo.texto} destaques={[1]} gradiente={gradDemo.marca} saidaEm={112} maxLargura={width - seg.x * 2} />
        </div>
        <div style={{position: 'absolute'}}>
          <TituloCinetico palavras={['Estúdio', 'Motion']} entradas={[126, 132]} tamanho={escala.hero * u} cor={paletaDemo.texto} destaques={[1]} gradiente={gradDemo.quente} maxLargura={width - seg.x * 2} />
        </div>
      </div>
      <div style={{display: 'flex', gap, flexDirection: 'row'}}>
        <CardMetrica rotulo="Agentes" valor={10} barras={[3, 5, 4, 7, 10]} cor={paletaDemo.secundaria} entradaEm={20} largura={largCard} />
        <CardMetrica rotulo="Quadros/s" valor={60} barras={[24, 30, 30, 48, 60]} cor={paletaDemo.primaria} entradaEm={32} largura={largCard} />
        <CardMetrica rotulo="Sincronia" valor={100} sufixo="%" barras={[40, 62, 75, 88, 100]} cor={paletaDemo.sucesso} entradaEm={44} largura={largCard} />
      </div>
    </AbsoluteFill>
  );
};
