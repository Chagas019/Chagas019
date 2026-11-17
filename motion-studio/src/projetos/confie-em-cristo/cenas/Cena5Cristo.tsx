// Cena 5 — Cristo: cruz recortada pela luz (contraluz); em "Jesus" a luz acende e os raios se abrem por trás.
// Sem figura humana. Dono: agente CÓDIGO.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FundoProfundo, GradacaoCor, Halacao, LuzVolumetrica, PoeiraDeLuz} from '../../../cor/Cinematico';
import {CameraCinema, PlanoDeFoco, rackFocus} from '../../../movimento/cinema';
import {curvas} from '../../../movimento/curvas';
import {Cruz2D} from '../../../personagens/Cruz2D';
import {Cruz3D} from '../../../personagens/Cruz3D';
import {TextoEditorial} from '../../../texto/TextoEditorial';
import {TextoImpacto} from '../../../texto/TextoImpacto';
import {escalaFe} from '../../../texto/fontesEditoriais';
import {gatilhosConfie as g} from '../cenas';
import {fundoCena5, luz as luzFe, misturaPorCena} from '../estilo';
import {relativo, textoCena5Jesus, textoCena5a, textoCena5b, textoCena5c} from '../texto';
import {Ancora, janelaCena, local, rampa, useLayout} from './comum';

const {inicio: INICIO, frames: DURACAO} = janelaCena('cristo');
const L = (abs: number) => local(abs, INICIO);

/**
 * Variante da cruz (A/B da revisão 1, item 5):
 * - 'pedra3d': Cruz3D de pedra escura quase em silhueta, recortada pela luz (exige gl 'swangle' no headless);
 * - 'silhueta2d': Cruz2D escura recortada contra o halo, com os raios da própria Cruz2D.
 * Uma cruz só por variante (sem silhueta 2D duplicada atrás da 3D).
 */
export type VarianteCruz = 'pedra3d' | 'silhueta2d';
// A/B (render/revisao/ConfieEmCristo-Vertical/r2-codigo-ab-*): a pedra 3D tem volume e perspectiva reais e é recortada pela luz; a silhueta 2D ganha um contorno de bloom que lê como neon/clip-art.
export const VARIANTE_CRUZ: VarianteCruz = 'pedra3d';

/** Centro vertical da cruz (fração da altura). */
const Y_CRUZ = 0.56;
/** Escala da Cruz3D: com a câmera do componente (z 6, fov 38) a cruz ocupa ≈ 3·escala·0,9 / 4,13 da altura. */
const ESCALA_3D = 0.6;
const ALTURA_RELATIVA = (3 * ESCALA_3D * 0.9) / 4.13;

const Cruz: React.FC<{variante: VarianteCruz; acende: number; revelaJesus: number}> = ({variante, acende, revelaJesus}) => {
  const {width, height} = useLayout();
  if (variante === 'pedra3d') {
    return (
      <div style={{position: 'absolute', left: 0, top: height * (Y_CRUZ - 0.5), width, height}}>
        <Cruz3D
          largura={width}
          altura={height}
          material="pedra"
          cor="#4A443D"
          luz={acende * (0.3 + 0.15 * revelaJesus)}
          emissivo={0}
          preenchimento={0}
          escala={ESCALA_3D}
          oscilacao={3}
          entradaEm={0}
          duracaoEntrada={90}
        />
      </div>
    );
  }
  return (
    <Cruz2D
      altura={height * ALTURA_RELATIVA}
      x={width / 2}
      y={height * Y_CRUZ}
      modo="silhueta"
      corSilhueta={luzFe.sombraQuente}
      luz={0.55 * acende + 0.75 * revelaJesus}
      espessura={0.085}
      aberturaRaios={0.15 + 1.05 * revelaJesus}
      entradaEm={0}
      duracaoEntrada={75}
    />
  );
};

export const Cena5Cristo: React.FC = () => {
  const frame = useCurrentFrame();
  const {u, maxLargura} = useLayout();
  const jesus = L(g.jesus);
  const acende = rampa(frame, 0, 90, 0, 1, curvas.suave);
  const revelaJesus = rampa(frame, jesus - 8, jesus + 40, 0, 1, curvas.entrada);
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
        <FundoProfundo {...fundoCena5} origem={{x: 0.5, y: Y_CRUZ - 0.12}} seed="c5-fundo" />
      </PlanoDeFoco>
      <PlanoDeFoco profundidade={0.4} semDesfoque>
        <LuzVolumetrica origem={{x: 0.5, y: Y_CRUZ - 0.2}} angulo={180} abertura={70 + 60 * revelaJesus} feixes={9} intensidade={0.2 + 0.6 * revelaJesus} alcance={1} poeira={20} seed="c5-raios" />
        {/* núcleo da luz atrás do cruzamento da cruz: a silhueta é recortada contra ele */}
        <Halacao x={0.5} y={Y_CRUZ - 0.08} raio={150 + 70 * revelaJesus} intensidade={(0.35 + 0.45 * revelaJesus) * acende} anamorfico={0.3} />
      </PlanoDeFoco>
      <PlanoDeFoco profundidade={1}>
        <Cruz variante={VARIANTE_CRUZ} acende={acende} revelaJesus={revelaJesus} />
      </PlanoDeFoco>
      <PlanoDeFoco profundidade={2}>
        <PoeiraDeLuz quantidade={[24, 14, 6]} intensidade={0.55} foco={1} velocidade={0.2} seed="c5-poeira" />
      </PlanoDeFoco>
      <GradacaoCor mistura={misturaPorCena.cena5} origemLuz={{x: 0.5, y: Y_CRUZ - 0.12}} />
      {/* tipografia toda acima de y 0.27 (abaixo disso começa o contraluz) */}
      <PlanoDeFoco profundidade={1} semDesfoque>
        <Ancora y={0.2}>
          <TextoEditorial palavras={a.palavras} entradas={a.entradas} tamanho={escalaFe.editorialHero * u} maxLargura={maxLargura} saidaEm={a.saidaEm} duracaoSaida={a.duracaoSaida} />
        </Ancora>
        <Ancora y={0.17}>
          <TextoImpacto palavras={j.palavras} entradas={j.entradas} destaques={j.destaques} tamanho={escalaFe.impactoHero * u} maxLargura={maxLargura} saidaEm={j.saidaEm} tipoSaida="desfoque" duracaoSaida={j.duracaoSaida} />
        </Ancora>
        <Ancora y={0.243}>
          <TextoEditorial palavras={b.palavras} entradas={b.entradas} tamanho={escalaFe.editorial * u} maxLargura={maxLargura} saidaEm={b.saidaEm} duracaoSaida={b.duracaoSaida} />
        </Ancora>
        <Ancora y={0.2}>
          <TextoImpacto palavras={c.palavras} entradas={c.entradas} quebras={c.quebras} destaques={c.destaques} tamanho={escalaFe.impactoMenor * u} maxLargura={maxLargura} />
        </Ancora>
      </PlanoDeFoco>
    </CameraCinema>
  );
};
