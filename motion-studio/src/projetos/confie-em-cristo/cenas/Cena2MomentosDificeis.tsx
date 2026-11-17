// Cena 2 — Os momentos difíceis: silhueta cansada caminhando sozinha na estrada noturna. Dono: agente CÓDIGO.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {GradacaoCor, PoeiraDeLuz} from '../../../cor/Cinematico';
import {CameraCinema, PlanoDeFoco, rackFocus} from '../../../movimento/cinema';
import {Estrada} from '../../../pecas/cenario/Estrada';
import {Horizonte} from '../../../pecas/cenario/Horizonte';
import {TextoImpacto} from '../../../texto/TextoImpacto';
import {escalaFe} from '../../../texto/fontesEditoriais';
import {misturaPorCena} from '../estilo';
import {relativo, textoCena2} from '../texto';
import {Ancora, Sangria, caminhada, janelaCena, useLayout} from './comum';
import {CaminhanteNaEstrada, HORIZONTE, FUGA_X} from './paisagem';

const {inicio: INICIO, frames: DURACAO} = janelaCena('momentos-dificeis');
/** Câmera ao fim da cena 2 (a cena 3 parte daqui para a T2 ficar contínua). */
export const CAMERA_FIM_CENA2 = {zoom: 1.07, x: 40} as const;

export const Cena2MomentosDificeis: React.FC = () => {
  const frame = useCurrentFrame();
  const {u, maxLargura} = useLayout();
  const texto = relativo(textoCena2, INICIO);
  const {avanco} = caminhada(INICIO + frame);
  const luz = 0.05;
  return (
    <CameraCinema
      chaves={[
        {frame: 0, zoom: 1.02, x: 0},
        {frame: DURACAO, zoom: CAMERA_FIM_CENA2.zoom, x: CAMERA_FIM_CENA2.x},
        ...rackFocus(0, 90, 0.3, 1),
      ]}
      abertura={8}
      mao={{amplitude: 2}}
    >
      <PlanoDeFoco profundidade={0.3}>
        <Sangria>
          <Horizonte luz={luz} nascer={0} horizonte={HORIZONTE} solX={FUGA_X} estrelas={90} seed="c2-ceu" />
        </Sangria>
      </PlanoDeFoco>
      <PlanoDeFoco profundidade={1}>
        <Sangria>
          <Estrada luz={luz} avanco={avanco} horizonte={HORIZONTE} fugaX={FUGA_X} seed="c2-estrada" />
          <CaminhanteNaEstrada inicioCena={INICIO} cansaco={0.75} luz={0.5} />
        </Sangria>
      </PlanoDeFoco>
      <PlanoDeFoco profundidade={1.6} semDesfoque>
        <PoeiraDeLuz quantidade={[18, 10, 4]} intensidade={0.3} foco={1} velocidade={0.18} cor="#B9C8E8" seed="c2-poeira" />
      </PlanoDeFoco>
      <GradacaoCor mistura={misturaPorCena.cena2} />
      <PlanoDeFoco profundidade={1} semDesfoque>
        <Ancora y={0.27}>
          <TextoImpacto
            palavras={texto.palavras}
            entradas={texto.entradas}
            quebras={texto.quebras}
            destaques={texto.destaques}
            tamanho={escalaFe.impacto * u}
            maxLargura={maxLargura}
            saidaEm={texto.saidaEm}
            tipoSaida="desfoque"
            duracaoSaida={24}
          />
        </Ancora>
      </PlanoDeFoco>
    </CameraCinema>
  );
};
