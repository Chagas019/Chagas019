// Composição "Confie em Cristo" — integra VOZ, CENAS, PERSONAGENS, TEXTO, PEÇAS, MOVIMENTO, COR e SOM. Dono: agente CÓDIGO.
// Camadas (de baixo para cima): fundo global → cenas (cada uma: cenário → luz → poeira → halo → GradacaoCor → tipografia)
// → Grão → Vinheta → saída para o preto → áudio. Sem legenda separada: a tipografia de cada cena já é a narração.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {TransitionSeries} from '@remotion/transitions';
import {FundoProfundo} from '../../cor/Cinematico';
import {Grao, Vinheta} from '../../cor/Atmosfera';
import {
  SaidaParaNegro,
  dissolveFoco,
  fadeNegro,
  revelacaoDeLuz,
  tempoDissolveFoco,
  tempoFadeNegro,
  tempoRevelacao,
  tempoVazamento,
  vazamentoDeLuz,
} from '../../movimento/cinema';
import {CamadaSomCinema} from '../../som/CamadaSomCinema';
import {efeitosTransicaoConfie, planoConfie} from './cenas';
import {atmosferaFe, paletaFe} from './estilo';
import {cuesConfie, trilhaConfie} from './som';
import {vozConfie} from './voz';
import {iniciosConfie} from './cenas/comum';
import {Cena1Incerteza, LUZ_CENA1} from './cenas/Cena1Incerteza';
import {Cena2MomentosDificeis} from './cenas/Cena2MomentosDificeis';
import {Cena3Mensagem} from './cenas/Cena3Mensagem';
import {Cena4Confianca} from './cenas/Cena4Confianca';
import {Cena5Cristo} from './cenas/Cena5Cristo';
import {Cena6Finalizacao} from './cenas/Cena6Finalizacao';

const componentes: Record<string, React.FC> = {
  incerteza: Cena1Incerteza,
  'momentos-dificeis': Cena2MomentosDificeis,
  mensagem: Cena3Mensagem,
  confianca: Cena4Confianca,
  cristo: Cena5Cristo,
  finalizacao: Cena6Finalizacao,
};

/** Duração do fade final para o preto (respiro final da voz: ~150 f). */
const SAIDA_FINAL = 50;

/**
 * Transição de saída da cena `i` (tabela do 06-movimento.md). Os `tipo` de cenas.ts não descrevem o efeito;
 * a fonte é `efeitosTransicaoConfie`. A duração vem do plano (garante duracaoTotal = soma das Sequences).
 */
const transicao = (i: number, frames: number, key: string) => {
  const efeito = efeitosTransicaoConfie[i];
  if (efeito.fim - efeito.inicio !== frames) {
    throw new Error(`ConfieEmCristo: transição ${i + 1} tem ${frames} f no plano e ${efeito.fim - efeito.inicio} f em efeitosTransicaoConfie`);
  }
  switch (i) {
    case 0: // T1 vazamento de luz, a partir do ponto âmbar da cena 1
      return <TransitionSeries.Transition key={key} presentation={vazamentoDeLuz({cor: 'ambar', origem: {x: LUZ_CENA1.x * 100, y: LUZ_CENA1.y * 100}, seed: 'confie-t1'})} timing={tempoVazamento(frames)} />;
    case 1: // T2 revelação de luz em fenda (a virada)
      return <TransitionSeries.Transition key={key} presentation={revelacaoDeLuz({forma: 'fenda', angulo: 90, cor: 'dourado', brilhoBorda: 0.7})} timing={tempoRevelacao(frames)} />;
    case 2: // T3 dissolve com foco, subindo
      return <TransitionSeries.Transition key={key} presentation={dissolveFoco({subida: 40, desfoque: 14})} timing={tempoDissolveFoco(frames)} />;
    case 3: // T4 rack focus: CONFIE. desfoca, a cruz aparece nítida
      return <TransitionSeries.Transition key={key} presentation={dissolveFoco({modo: 'rack', desfoque: 14})} timing={tempoDissolveFoco(frames)} />;
    default: // T5 fade para preto no silêncio de 1000 ms
      return <TransitionSeries.Transition key={key} presentation={fadeNegro({respiro: 0.2})} timing={tempoFadeNegro(frames)} />;
  }
};

/** Interpola um valor por cena (frames absolutos de início de cada cena). */
const porCena = (frame: number, valores: number[]) => interpolate(frame, iniciosConfie, valores, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const ConfieEmCristo: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const {grao, vinheta} = atmosferaFe;
  const intensidadeGrao = porCena(frame, [grao.escuro, grao.escuro, grao.transicao, grao.luminoso, grao.luminoso, grao.luminoso]);
  const forcaVinheta = porCena(frame, [vinheta.escuro, vinheta.escuro, vinheta.transicao, vinheta.luminoso, vinheta.luminoso, 0.4]);
  return (
    <AbsoluteFill style={{backgroundColor: paletaFe.fundo}}>
      <SaidaParaNegro inicio={durationInFrames - SAIDA_FINAL} duracao={SAIDA_FINAL}>
        <FundoProfundo luz={0} seed="confie-global" />
        <TransitionSeries>
          {planoConfie.cenas.flatMap((c, i) => {
            const Cena = componentes[c.id];
            if (!Cena) throw new Error(`ConfieEmCristo: sem componente para a cena "${c.id}"`);
            const itens = [
              <TransitionSeries.Sequence key={c.id} durationInFrames={c.frames} name={`${i + 1} · ${c.titulo}`}>
                <Cena />
              </TransitionSeries.Sequence>,
            ];
            if (c.transicaoSaida && i < planoConfie.cenas.length - 1) itens.push(transicao(i, c.transicaoSaida.frames, `${c.id}-saida`));
            return itens;
          })}
        </TransitionSeries>
        <Grao intensidade={intensidadeGrao} />
        <Vinheta forca={forcaVinheta} />
      </SaidaParaNegro>
      {/* Narração toca sozinha quando vozConfie.arquivo existir; trilha com ducking pelas palavras + cues de SFX. */}
      <CamadaSomCinema cues={cuesConfie} trilha={trilhaConfie} narracao={vozConfie.arquivo} palavras={vozConfie.palavras} />
    </AbsoluteFill>
  );
};
