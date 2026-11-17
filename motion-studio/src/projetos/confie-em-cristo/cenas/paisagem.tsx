// Paisagem compartilhada pelas cenas 2 e 3 (estrada + caminhante). Dono: agente CÓDIGO.
// A caminhada é função do frame ABSOLUTO (comum.ts → caminhada), então posição, passo e estrada
// continuam idênticos dos dois lados da transição T2.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Caminhante, naEstrada} from '../../../personagens/Caminhante';
import {luzFe} from '../../../cor/tema';
import {CAMINHADA, caminhada, useLayout} from './comum';

/** Mesma linha do horizonte e o mesmo ponto de fuga/sol no Horizonte e na Estrada. */
export const HORIZONTE = 0.6;
export const FUGA_X = 0.5;

export const CaminhanteNaEstrada: React.FC<{
  /** início absoluto da cena que contém o caminhante */
  inicioCena: number;
  cansaco: number;
  luz: number;
  /** a figura para em "escute" e retoma em "caminhando" (cena 3) */
  comParada?: boolean;
  /** a figura já está em cena (sem fade de entrada) */
  jaVisivel?: boolean;
}> = ({inicioCena, cansaco, luz, comParada = false, jaVisivel = false}) => {
  const frame = useCurrentFrame();
  const {width, height} = useLayout();
  const {progresso} = caminhada(inicioCena + frame);
  const pos = naEstrada({
    progresso,
    pertoX: width * 0.53,
    pertoY: height * 0.84,
    alturaPerto: height * 0.2,
    fugaX: width * FUGA_X,
    fugaY: height * HORIZONTE,
  });
  return (
    <Caminhante
      {...pos}
      entradaEm={0}
      duracaoEntrada={jaVisivel ? 1 : 40}
      faseFrames={inicioCena - CAMINHADA.inicio}
      paraEm={comParada ? CAMINHADA.paraEm - inicioCena : undefined}
      duracaoParada={CAMINHADA.duracaoParada}
      retomaEm={comParada ? CAMINHADA.retomaEm - inicioCena : undefined}
      duracaoRetomada={CAMINHADA.duracaoRetomada}
      cansaco={cansaco}
      ciclo={72}
      vista={12}
      anguloLuz={0}
      sombraInclinacao={0}
      sombraComprimento={1.2}
      luz={luz}
      corNevoa={luzFe.azulSombra}
      semente="confie-caminhante"
    />
  );
};
