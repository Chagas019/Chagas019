// Cena 3 — A mensagem: uma fenda de luz se abre na estrada noturna e revela o amanhecer;
// "DEUS NÃO PERDEU O CONTROLE / da sua história." e a silhueta que para em "escute" e retoma em "caminhando". Dono: agente CÓDIGO.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {GradacaoCor, Halacao, LuzVolumetrica, PoeiraDeLuz} from '../../../cor/Cinematico';
import {CameraCinema, PlanoDeFoco} from '../../../movimento/cinema';
import {curvas} from '../../../movimento/curvas';
import {Estrada} from '../../../pecas/cenario/Estrada';
import {Horizonte} from '../../../pecas/cenario/Horizonte';
import {Revelacao} from '../../../pecas/cenario/Revelacao';
import {TextoEditorial} from '../../../texto/TextoEditorial';
import {TextoImpacto} from '../../../texto/TextoImpacto';
import {escalaFe} from '../../../texto/fontesEditoriais';
import {gatilhosConfie as g} from '../cenas';
import {luzPrincipal, misturaPorCena} from '../estilo';
import {relativo, textoCena3Apoio, textoCena3Editorial, textoCena3Impacto} from '../texto';
import {Ancora, Sangria, caminhada, janelaCena, local, rampa, useLayout} from './comum';
import {CAMERA_FIM_CENA2} from './Cena2MomentosDificeis';
import {CaminhanteNaEstrada, FUGA_X, HORIZONTE} from './paisagem';

const {inicio: INICIO, frames: DURACAO} = janelaCena('mensagem');
const L = (abs: number) => local(abs, INICIO);

/** Progresso da Revelacao dirigido pela voz: fio cresce no silêncio → completo em "Mas" → rompe de "escute" a "Deus". */
const progressoRevelacao = (frame: number) =>
  frame < L(g.escute) ? rampa(frame, 0, L(g.mas), 0, 0.3, curvas.suave) : rampa(frame, L(g.escute), L(g.deus), 0.3, 1, curvas.suave);

const Paisagem: React.FC<{luz: number; nascer: number; avanco: number; nevoa: number}> = ({luz, nascer, avanco, nevoa}) => (
  <>
    <Horizonte luz={luz} nascer={nascer} horizonte={HORIZONTE} solX={FUGA_X} estrelas={90} seed="c2-ceu" />
    <Estrada luz={luz} avanco={avanco} horizonte={HORIZONTE} fugaX={FUGA_X} nevoa={nevoa} seed="c2-estrada" />
  </>
);

export const Cena3Mensagem: React.FC = () => {
  const frame = useCurrentFrame();
  const {u, maxLargura} = useLayout();
  const {avanco} = caminhada(INICIO + frame);
  const p = progressoRevelacao(frame);
  // Amanhecer revelado: continua clareando pela cena toda.
  const luzDia = rampa(frame, L(g.escute), DURACAO, 0.45, 1, curvas.suave);
  const nascer = rampa(frame, L(g.escute), DURACAO, 0.25, 1, curvas.suave);
  // Em "enxergar" a névoa à frente adensa; a luz ao fundo segue visível.
  const nevoa = 1 + rampa(frame, L(g.enxergar), L(g.enxergar) + 60, 0, 0.45);
  const raios = rampa(frame, L(g.escute), L(g.deus), 0, 0.8) * rampa(frame, L(g.historiaFim), L(g.historiaFim) + 120, 1, 0.75);
  // Bloom em "escute": a luz respira uma vez.
  const bloom = rampa(frame, L(g.escute) - 6, L(g.escute) + 8, 0, 1) * rampa(frame, L(g.escute) + 8, L(g.escute) + 70, 1, 0);
  const impacto = relativo(textoCena3Impacto, INICIO);
  const editorial = relativo(textoCena3Editorial, INICIO);
  const apoio = relativo(textoCena3Apoio, INICIO);
  return (
    <CameraCinema
      chaves={[
        {frame: 0, zoom: CAMERA_FIM_CENA2.zoom, x: CAMERA_FIM_CENA2.x, y: 0, rot: 0},
        {frame: L(g.deus), zoom: 1.04, x: 10, y: -24, rot: 0.3},
        {frame: L(g.historiaFim), zoom: 1.04, x: 10, y: -24, rot: 0.3},
        {frame: DURACAO, zoom: 1.08, x: 0, y: -10, rot: 0},
      ]}
      mao={{amplitude: 1.8}}
    >
      <PlanoDeFoco profundidade={1}>
        <Sangria>
          {/* estrada noturna da cena 2 por trás da escuridão parcial da Revelacao (continuidade na T2) */}
          {p < 1 ? <Paisagem luz={0.05} nascer={0} avanco={avanco} nevoa={1} /> : null}
          <Revelacao progresso={p} centroX={FUGA_X} centroY={0.5} opacidadeEscuridao={0.72} poeira={36} seed="c3-revelacao">
            <Paisagem luz={luzDia} nascer={nascer} avanco={avanco} nevoa={nevoa} />
          </Revelacao>
          <CaminhanteNaEstrada inicioCena={INICIO} cansaco={rampa(frame, L(g.caminhando), L(g.caminhando) + 60, 0.75, 0.3)} luz={rampa(frame, L(g.escute), L(g.deus), 0.5, 1.2)} comParada jaVisivel />
        </Sangria>
      </PlanoDeFoco>
      <LuzVolumetrica origem={luzPrincipal.origem} angulo={luzPrincipal.angulo} abertura={46} feixes={7} intensidade={raios} alcance={1.2} poeira={0} seed="c3-raios" />
      <PlanoDeFoco profundidade={1.5} semDesfoque>
        <PoeiraDeLuz quantidade={[24, 14, 4]} intensidade={0.15 + 0.45 * Math.min(1, p)} foco={1} velocidade={0.22} seed="c3-poeira" />
      </PlanoDeFoco>
      <Halacao x={FUGA_X} y={0.5} raio={160} intensidade={bloom * 0.7} anamorfico={0.6} />
      <GradacaoCor mistura={rampa(frame, 0, L(g.historiaFim), misturaPorCena.cena3[0], misturaPorCena.cena3[1])} origemLuz={luzPrincipal.origem} />
      <PlanoDeFoco profundidade={1} semDesfoque>
        <Ancora y={0.25}>
          <TextoImpacto
            palavras={impacto.palavras}
            entradas={impacto.entradas}
            quebras={impacto.quebras}
            destaques={impacto.destaques}
            tamanho={escalaFe.impactoHero * u}
            maxLargura={maxLargura}
            saidaEm={impacto.saidaEm}
            tipoSaida="desfoque"
            duracaoSaida={30}
          />
        </Ancora>
        <Ancora y={0.43}>
          <TextoEditorial palavras={editorial.palavras} entradas={editorial.entradas} tamanho={escalaFe.editorialHero * u} maxLargura={maxLargura} saidaEm={editorial.saidaEm} />
        </Ancora>
        <Ancora y={0.3}>
          <TextoEditorial
            palavras={apoio.palavras}
            entradas={apoio.entradas}
            destaques={apoio.destaques}
            tamanho={escalaFe.editorialHero * u}
            maxLargura={maxLargura}
            saidaEm={apoio.saidaEm}
          />
        </Ancora>
      </PlanoDeFoco>
    </CameraCinema>
  );
};
