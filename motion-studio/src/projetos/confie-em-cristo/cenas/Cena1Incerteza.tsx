// Cena 1 — A incerteza: escuridão, um ponto de luz âmbar que cresce e "VOCÊ NÃO PRECISA TER TODAS AS RESPOSTAS.". Dono: agente CÓDIGO.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {CeuNoturno, FonteDeLuz, GradacaoCor, PoeiraDeLuz} from '../../../cor/Cinematico';
import {CameraCinema, PlanoDeFoco, dolly} from '../../../movimento/cinema';
import {TextoImpacto} from '../../../texto/TextoImpacto';
import {escalaFe} from '../../../texto/fontesEditoriais';
import {gatilhosConfie as g} from '../cenas';
import {misturaPorCena} from '../estilo';
import {ancoraDouradoCena1, relativo, textoCena1} from '../texto';
import {Ancora, janelaCena, local, rampa, useLayout} from './comum';

const {inicio: INICIO, frames: DURACAO} = janelaCena('incerteza');
/** Posição do ponto de luz (fração). A origem do vazamento de luz da T1 usa o mesmo ponto. */
export const LUZ_CENA1 = {x: 0.5, y: 0.68} as const;

export const Cena1Incerteza: React.FC = () => {
  const frame = useCurrentFrame();
  const {u, maxLargura} = useLayout();
  const texto = relativo(textoCena1, INICIO);
  const dourado = local(ancoraDouradoCena1, INICIO);
  // A luz já existe no f0 (gancho) e cresce devagar; pulsa uma vez no 1º "Talvez".
  const talvez = local(g.talvez1, INICIO);
  const pulso = rampa(frame, talvez, talvez + 10, 0, 1) * rampa(frame, talvez + 10, talvez + 50, 1, 0);
  const progresso = rampa(frame, 0, DURACAO, 0.07, 0.42) + pulso * 0.05;
  // "RESPOSTAS" aquece para dourado em "planos": cruzamento entre a versão branca e a com destaque.
  const aquece = rampa(frame, dourado, dourado + 24, 0, 1);
  const props = {
    palavras: texto.palavras,
    entradas: texto.entradas,
    quebras: texto.quebras,
    tamanho: escalaFe.impacto * u,
    maxLargura,
    saidaEm: texto.saidaEm,
    duracaoSaida: 22,
    profundidade: rampa(frame, local(g.talvez2, INICIO), local(g.talvez2, INICIO) + 40, 0.4, 0.9),
  };
  return (
    <CameraCinema chaves={[...dolly(0, DURACAO, 1, 1.06), {frame: 0, y: 0}, {frame: DURACAO, y: -20}]} mao={{amplitude: 2}}>
      <PlanoDeFoco profundidade={0}>
        <CeuNoturno horizonte={null} estrelas={45} brilhoEstrelas={0.28} nevoa={0.35} seed="c1-ceu" />
      </PlanoDeFoco>
      <PlanoDeFoco profundidade={0.6} semDesfoque>
        <PoeiraDeLuz quantidade={[26, 12, 3]} intensidade={0.32} foco={1} velocidade={0.22} seed="c1-poeira" />
      </PlanoDeFoco>
      <PlanoDeFoco profundidade={1} semDesfoque>
        <FonteDeLuz x={LUZ_CENA1.x} y={LUZ_CENA1.y} progresso={progresso} raioInicial={14} raioFinal={200} seed="c1-luz" />
      </PlanoDeFoco>
      <GradacaoCor mistura={misturaPorCena.cena1} />
      <PlanoDeFoco profundidade={1} semDesfoque>
        <Ancora y={0.36}>
          <div style={{position: 'relative'}}>
            <div style={{opacity: 1 - aquece}}>
              <TextoImpacto {...props} />
            </div>
            {aquece > 0 ? (
              <div style={{position: 'absolute', inset: 0, opacity: aquece}}>
                <TextoImpacto {...props} destaques={texto.destaques} />
              </div>
            ) : null}
          </div>
        </Ancora>
      </PlanoDeFoco>
    </CameraCinema>
  );
};
