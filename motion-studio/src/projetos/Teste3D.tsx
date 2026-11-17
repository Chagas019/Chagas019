// Composição de teste do pipeline 3D (agente PERSONAGENS + CÓDIGO).
import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {Objeto3D} from '../personagens/Objeto3D';
import {FundoVivo} from '../cor/Atmosfera';
import {paletas} from '../cor/tema';

export const Teste3D: React.FC = () => {
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <FundoVivo paleta={paletas.noite} />
      <Objeto3D cor={paletas.noite.primaria} corEmissiva={paletas.noite.secundaria} tamanho={Math.min(width, height) * 0.8} />
    </AbsoluteFill>
  );
};
