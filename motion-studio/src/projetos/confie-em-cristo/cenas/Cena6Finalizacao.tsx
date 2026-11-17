// Cena 6 — Finalização: "CONFIE EM CRISTO." (clímax), "Ele é o caminho, a verdade e a vida." e a assinatura "JOÃO 14,6". Dono: agente CÓDIGO.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FundoProfundo, GradacaoCor, Halacao, PoeiraDeLuz} from '../../../cor/Cinematico';
import {CameraCinema, PlanoDeFoco, dolly, impactoEscala} from '../../../movimento/cinema';
import {AssinaturaVersiculo, Divisor} from '../../../pecas/Ornamentos';
import {TextoEditorial} from '../../../texto/TextoEditorial';
import {TextoImpacto} from '../../../texto/TextoImpacto';
import {escalaFe, fontesFe} from '../../../texto/fontesEditoriais';
import {gatilhosConfie as g} from '../cenas';
import {luz as luzFe, luzFundoPorCena, misturaPorCena, paletaFe} from '../estilo';
import {relativo, textoCena6Referencia, textoCena6Titulo, textoCena6Versiculo} from '../texto';
import {Ancora, flash, janelaCena, local, useLayout} from './comum';

const {inicio: INICIO, frames: DURACAO} = janelaCena('finalizacao');
const L = (abs: number) => local(abs, INICIO);
const Y_TITULO = 0.36;

export const Cena6Finalizacao: React.FC = () => {
  const frame = useCurrentFrame();
  const {u, maxLargura} = useLayout();
  const titulo = relativo(textoCena6Titulo, INICIO);
  const versiculo = relativo(textoCena6Versiculo, INICIO);
  const referencia = relativo(textoCena6Referencia, INICIO);
  const climax = L(g.cristoFinal);
  // "Confie" final: impacto discreto; clímax em "Cristo": o halo pulsa uma vez.
  const escalaTitulo = impactoEscala(frame, [L(g.confieFinal), climax], {pico: 0.04, decaimento: 30});
  const pulso = flash(frame, [climax], 4, 50);
  return (
    <CameraCinema chaves={dolly(0, DURACAO, 1.04, 1)} mao={false}>
      <PlanoDeFoco profundidade={0}>
        <FundoProfundo luz={luzFundoPorCena.cena6 * 0.6} origem={{x: 0.5, y: Y_TITULO}} seed="c6-fundo" />
      </PlanoDeFoco>
      <PlanoDeFoco profundidade={1.3} semDesfoque>
        <PoeiraDeLuz quantidade={[20, 10, 3]} intensidade={0.4} foco={1} velocidade={0.14} seed="c6-poeira" />
      </PlanoDeFoco>
      <Halacao x={0.5} y={Y_TITULO} raio={340 + 60 * pulso} intensidade={0.22 + 0.2 * pulso} cor={luzFe.ambar} anamorfico={0.25} />
      <GradacaoCor mistura={misturaPorCena.cena6} origemLuz={{x: 0.5, y: Y_TITULO}} />
      <PlanoDeFoco profundidade={1} semDesfoque>
        <Ancora y={Y_TITULO} style={{transform: `translateY(-50%) scale(${escalaTitulo.toFixed(4)})`}}>
          <TextoImpacto
            palavras={titulo.palavras}
            entradas={titulo.entradas}
            quebras={titulo.quebras}
            destaques={titulo.destaques}
            tamanho={escalaFe.impactoHero * u}
            maxLargura={maxLargura}
          />
        </Ancora>
        <Ancora y={0.5}>
          <Divisor largura={300 * u} cor={paletaFe.primaria} corCentro={luzFe.douradoClaro} entradaEm={climax + 20} />
        </Ancora>
        <Ancora y={0.575}>
          <TextoEditorial
            palavras={versiculo.palavras}
            entradas={versiculo.entradas}
            quebras={versiculo.quebras}
            destaques={versiculo.destaques}
            tamanho={escalaFe.editorial * u}
            maxLargura={maxLargura}
          />
        </Ancora>
        <Ancora y={0.68}>
          <AssinaturaVersiculo
            largura={Math.min(maxLargura, 620 * u)}
            entradaEm={referencia.entradas[0]}
            referencia="JOÃO 14,6"
            corTexto={paletaFe.textoSuave}
            corFio={paletaFe.primaria}
            fonteReferencia={fontesFe.editorial}
          />
        </Ancora>
      </PlanoDeFoco>
    </CameraCinema>
  );
};
