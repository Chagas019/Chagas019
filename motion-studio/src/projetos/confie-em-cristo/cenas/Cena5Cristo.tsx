// Cena 5 — Cristo: cruz em contraluz; em "Jesus" a luz acende e os raios se abrem por trás. Sem figura humana. Dono: agente CÓDIGO.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FundoProfundo, GradacaoCor, LuzVolumetrica, PoeiraDeLuz} from '../../../cor/Cinematico';
import {CameraCinema, PlanoDeFoco, rackFocus} from '../../../movimento/cinema';
import {curvas} from '../../../movimento/curvas';
import {Cruz2D} from '../../../personagens/Cruz2D';
import {Cruz3D} from '../../../personagens/Cruz3D';
import {TextoEditorial} from '../../../texto/TextoEditorial';
import {TextoImpacto} from '../../../texto/TextoImpacto';
import {escalaFe} from '../../../texto/fontesEditoriais';
import {gatilhosConfie as g} from '../cenas';
import {luz as luzFe, luzFundoPorCena, luzPrincipal, misturaPorCena} from '../estilo';
import {relativo, textoCena5Jesus, textoCena5a, textoCena5b, textoCena5c} from '../texto';
import {Ancora, janelaCena, local, rampa, useLayout} from './comum';

const {inicio: INICIO, frames: DURACAO} = janelaCena('cristo');
const L = (abs: number) => local(abs, INICIO);

/** true = Cruz3D (WebGL, exige gl 'swangle' no headless) com a Cruz2D só para halo/raios; false = só Cruz2D. */
export const CRUZ_3D = true;
/** Centro vertical da cruz (fração da altura). */
const Y_CRUZ = 0.56;
/** Escala da Cruz3D: com a câmera do componente (z 6, fov 38) a cruz ocupa ≈ 3·escala·0,9 / 4,13 da altura. */
const ESCALA_3D = 0.6;
const ALTURA_RELATIVA = (3 * ESCALA_3D * 0.9) / 4.13;

export const Cena5Cristo: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height, u, maxLargura} = useLayout();
  const jesus = L(g.jesus);
  const acende = rampa(frame, 0, 90, 0, 1, curvas.suave);
  const revelaJesus = rampa(frame, jesus - 8, jesus + 40, 0, 1, curvas.entrada);
  const alturaCruz = height * ALTURA_RELATIVA;
  const a = relativo(textoCena5a, INICIO);
  const j = relativo(textoCena5Jesus, INICIO);
  const b = relativo(textoCena5b, INICIO);
  const c = relativo(textoCena5c, INICIO);
  return (
    <CameraCinema
      chaves={[
        {frame: 0, zoom: 1, y: -40},
        {frame: jesus, y: 0},
        {frame: DURACAO, zoom: 1.08},
        ...rackFocus(0, 120, 2, 1),
      ]}
      abertura={6}
      mao={{amplitude: 1.2}}
    >
      <PlanoDeFoco profundidade={0}>
        <FundoProfundo luz={luzFundoPorCena.cena5} origem={{x: 0.5, y: Y_CRUZ - 0.12}} seed="c5-fundo" />
      </PlanoDeFoco>
      <PlanoDeFoco profundidade={0.4} semDesfoque>
        <LuzVolumetrica origem={{x: 0.5, y: Y_CRUZ - 0.2}} angulo={180} abertura={70 + 60 * revelaJesus} feixes={9} intensidade={0.2 + 0.6 * revelaJesus} alcance={1} poeira={20} seed="c5-raios" />
      </PlanoDeFoco>
      <PlanoDeFoco profundidade={1}>
        {/* halo e raios que se abrem em "Jesus" (Cruz2D por trás); a cruz em si é a 3D */}
        <Cruz2D
          altura={alturaCruz * (CRUZ_3D ? 0.92 : 1)}
          x={width / 2}
          y={height * Y_CRUZ}
          modo={CRUZ_3D ? 'silhueta' : 'luz'}
          corSilhueta={luzFe.sombraQuente}
          luz={0.55 * acende + 0.75 * revelaJesus}
          aberturaRaios={0.15 + 1.05 * revelaJesus}
          entradaEm={0}
          duracaoEntrada={75}
        />
        {CRUZ_3D ? (
          <div style={{position: 'absolute', left: 0, top: height * (Y_CRUZ - 0.5), width, height}}>
            <Cruz3D
              largura={width}
              altura={height}
              material="madeira"
              cor="#8A6A48"
              luz={acende * (0.55 + 0.45 * revelaJesus)}
              emissivo={0.06 * revelaJesus}
              preenchimento={0.02 + 0.04 * revelaJesus}
              escala={ESCALA_3D}
              oscilacao={4}
              entradaEm={0}
              duracaoEntrada={90}
            />
          </div>
        ) : null}
      </PlanoDeFoco>
      <PlanoDeFoco profundidade={2}>
        <PoeiraDeLuz quantidade={[24, 14, 6]} intensidade={0.55} foco={1} velocidade={0.2} seed="c5-poeira" />
      </PlanoDeFoco>
      <GradacaoCor mistura={misturaPorCena.cena5} origemLuz={{x: luzPrincipal.origem.x, y: Y_CRUZ - 0.2}} />
      <PlanoDeFoco profundidade={1} semDesfoque>
        <Ancora y={0.2}>
          <TextoEditorial palavras={a.palavras} entradas={a.entradas} tamanho={escalaFe.editorialHero * u} maxLargura={maxLargura} saidaEm={a.saidaEm} />
        </Ancora>
        <Ancora y={0.15}>
          <TextoImpacto palavras={j.palavras} entradas={j.entradas} destaques={j.destaques} tamanho={escalaFe.impactoHero * u} maxLargura={maxLargura} saidaEm={j.saidaEm} tipoSaida="desfoque" duracaoSaida={24} />
        </Ancora>
        <Ancora y={0.245}>
          <TextoEditorial palavras={b.palavras} entradas={b.entradas} tamanho={escalaFe.editorial * u} maxLargura={maxLargura} saidaEm={b.saidaEm} />
        </Ancora>
        <Ancora y={0.2}>
          <TextoImpacto palavras={c.palavras} entradas={c.entradas} quebras={c.quebras} destaques={c.destaques} tamanho={escalaFe.impactoMenor * u} maxLargura={maxLargura} />
        </Ancora>
      </PlanoDeFoco>
    </CameraCinema>
  );
};
