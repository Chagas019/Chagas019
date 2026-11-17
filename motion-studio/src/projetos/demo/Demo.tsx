// Composição do projeto "demo" — integra o trabalho de todos os agentes (agente CÓDIGO).
import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {TransitionSeries} from '@remotion/transitions';
import {FundoVivo, Grao, Vinheta} from '../../cor/Atmosfera';
import {whip, tempoWhip} from '../../movimento/transicoes';
import {LegendaSincronizada} from '../../texto/LegendaSincronizada';
import {CamadaSom} from '../../som/CamadaSom';
import {areaSegura, unidade} from '../../config/formatos';
import {escala} from '../../texto/fontes';
import {planoDemo} from './cenas';
import {vozDemo} from './voz';
import {cuesDemo} from './som';
import {paletaDemo, graoDemo} from './estilo';
import {Cena1Abertura} from './cenas/Cena1Abertura';
import {Cena2Pecas} from './cenas/Cena2Pecas';
import {Cena3Fechamento} from './cenas/Cena3Fechamento';

const componentes: Record<string, React.FC> = {abertura: Cena1Abertura, pecas: Cena2Pecas, fechamento: Cena3Fechamento};

export const Demo: React.FC = () => {
  const {width, height} = useVideoConfig();
  const u = unidade(width, height);
  const seg = areaSegura(width, height);
  // A cena 1 já mostra a narração como título: legenda começa na cena 2.
  // Na cena 3 o título cinético carrega o texto: legenda escondida a partir de "Tudo" (revisão 1, #10).
  const legendas = vozDemo.palavras.filter((p) => p.startMs >= 3000 && p.startMs < 6800);
  // Vertical: +1,5% de folga acima da faixa da interface das redes.
  const baseLegenda = seg.base + (height > width ? Math.round(height * 0.015) : 0);
  return (
    <AbsoluteFill style={{background: paletaDemo.fundo}}>
      <FundoVivo paleta={paletaDemo} />
      <TransitionSeries>
        {planoDemo.cenas.flatMap((c, i) => {
          const C = componentes[c.id];
          const itens = [
            <TransitionSeries.Sequence key={c.id} durationInFrames={c.frames} name={c.id}>
              <C />
            </TransitionSeries.Sequence>,
          ];
          if (c.transicaoSaida && i < planoDemo.cenas.length - 1) {
            itens.push(
              <TransitionSeries.Transition
                key={`${c.id}-tr`}
                presentation={whip({direcao: c.transicaoSaida.direcao ?? 'esquerda'})}
                timing={tempoWhip(c.transicaoSaida.frames)}
              />,
            );
          }
          return itens;
        })}
      </TransitionSeries>
      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: baseLegenda}}>
        <LegendaSincronizada
          captions={legendas}
          tamanho={escala.legenda * u}
          corTexto={paletaDemo.texto}
          corAtiva={paletaDemo.fundo}
          fundoAtivo={paletaDemo.secundaria}
          maxLargura={width - seg.x * 2}
        />
      </AbsoluteFill>
      <Vinheta forca={0.5} />
      <Grao intensidade={graoDemo} />
      <CamadaSom cues={cuesDemo} narracao={vozDemo.arquivo} palavras={vozDemo.palavras} />
    </AbsoluteFill>
  );
};
