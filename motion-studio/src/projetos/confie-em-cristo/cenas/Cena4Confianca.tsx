// Cena 4 — A confiança: composição luminosa, "CONFIE." gigante batendo em cada "confie" da voz. Dono: agente CÓDIGO.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FundoProfundo, GradacaoCor, Halacao, LuzVolumetrica, PoeiraDeLuz} from '../../../cor/Cinematico';
import {CameraCinema, PlanoDeFoco, dolly, trepidacao} from '../../../movimento/cinema';
import {Fio} from '../../../pecas/Ornamentos';
import {PalavraGigante} from '../../../texto/PalavraGigante';
import {TextoEditorial} from '../../../texto/TextoEditorial';
import {escalaFe} from '../../../texto/fontesEditoriais';
import {luzFundoPorCena, luzPrincipal, misturaPorCena, paletaFe} from '../estilo';
import {confieCena4, relativo, textoCena4a, textoCena4b} from '../texto';
import {Ancora, flash, janelaCena, rampa, useLayout} from './comum';

const {inicio: INICIO, frames: DURACAO} = janelaCena('confianca');
const Y_CONFIE = 0.5;

export const Cena4Confianca: React.FC = () => {
  const frame = useCurrentFrame();
  const {u, maxLargura} = useLayout();
  const confie = relativo(confieCena4, INICIO);
  const a = relativo(textoCena4a, INICIO);
  const b = relativo(textoCena4b, INICIO);
  // Cada "confie" acende o halo (+exposição) e decai em ~20 f.
  const f = flash(frame, confie.batidas, 3, 20);
  // Micro-shake de câmera (2–3 px, ~6–12 f) em cada batida.
  const tremor = trepidacao(frame, confie.batidas, {amplitude: 3, rotacao: 0.15, duracao: 12, seed: 'c4-shake'});
  const entradaLinhas = confie.batidas[0];
  return (
    <CameraCinema chaves={dolly(0, DURACAO, 1, 1.04)} mao={{amplitude: 1.5}}>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${(tremor.x * u).toFixed(2)}px, ${(tremor.y * u).toFixed(2)}px) rotate(${tremor.rot.toFixed(3)}deg)`}}>
        <PlanoDeFoco profundidade={0}>
          <FundoProfundo luz={luzFundoPorCena.cena4} origem={{x: 0.5, y: Y_CONFIE - 0.04}} seed="c4-fundo" />
        </PlanoDeFoco>
        <LuzVolumetrica origem={luzPrincipal.origem} angulo={luzPrincipal.angulo} abertura={54} feixes={6} intensidade={0.35 + 0.25 * f} alcance={1.2} poeira={0} seed="c4-raios" />
        <PlanoDeFoco profundidade={1.4} semDesfoque>
          <PoeiraDeLuz quantidade={[30, 16, 5]} intensidade={0.55} foco={1} velocidade={0.25} seed="c4-poeira" />
        </PlanoDeFoco>
        <Halacao x={0.5} y={Y_CONFIE - 0.01} raio={300 + 40 * f} intensidade={0.32 + 0.15 * f} anamorfico={0.5} />
        <GradacaoCor mistura={misturaPorCena.cena4} origemLuz={{x: 0.5, y: Y_CONFIE}} />
        <PlanoDeFoco profundidade={1} semDesfoque>
          <Ancora y={0.33}>
            <TextoEditorial palavras={a.palavras} entradas={a.entradas} destaques={a.destaques} tamanho={escalaFe.editorialHero * u} maxLargura={maxLargura} saidaEm={a.saidaEm} />
          </Ancora>
          <Ancora y={0.33}>
            <TextoEditorial palavras={b.palavras} entradas={b.entradas} destaques={b.destaques} tamanho={escalaFe.editorialHero * u} maxLargura={maxLargura} />
          </Ancora>
          <Ancora y={Y_CONFIE}>
            <PalavraGigante
              texto={confie.texto}
              batidas={confie.batidas}
              escalasBatidas={confie.escalasBatidas}
              douradoNaBatida={confie.douradoNaBatida}
              escalaEntrada={1.1}
              maxLargura={maxLargura}
              tamanhoMax={escalaFe.gigante * u}
            />
          </Ancora>
          {/* linhas gráficas finas acima/abaixo do CONFIE. */}
          <Ancora y={Y_CONFIE - 0.1}>
            <Fio comprimento={rampa(frame, entradaLinhas, entradaLinhas + 40, 120, 220) * u} cor={paletaFe.primaria} entradaEm={entradaLinhas + 6} duracao={44} />
          </Ancora>
          <Ancora y={Y_CONFIE + 0.1}>
            <Fio comprimento={rampa(frame, entradaLinhas, entradaLinhas + 40, 120, 220) * u} cor={paletaFe.primaria} entradaEm={entradaLinhas + 10} duracao={44} />
          </Ancora>
        </PlanoDeFoco>
      </div>
    </CameraCinema>
  );
};
