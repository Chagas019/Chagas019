import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Chibi, KOLBE_HABITO, KOLBE_PRISIONEIRO, Sparkle} from './Chibi';
import {C, F} from '../brand/tokens';
import {Paper} from '../core/flat';

export const CharacterSheet: React.FC = () => (
  <AbsoluteFill style={{background: '#E9DCC3', fontFamily: F.titulo, color: C.carvao}}>
    <Paper />
    <div style={{position: 'absolute', top: 70, width: '100%', textAlign: 'center', fontSize: 40, letterSpacing: 8, color: C.terra}}>SANTORAMA · MODEL SHEET</div>
    <div style={{position: 'absolute', top: 130, width: '100%', textAlign: 'center', fontSize: 64, fontWeight: 700}}>São Maximiliano Kolbe</div>
    <svg width={1080} height={1920} style={{position: 'absolute'}}>
      <Chibi {...KOLBE_HABITO} x={290} y={880} h={600} expression="gentil" />
      <Chibi {...KOLBE_PRISIONEIRO} x={790} y={880} h={600} expression="sereno" seed="k2" />
      <Chibi {...KOLBE_HABITO} x={150} y={1560} h={380} arms="open" expression="gentil" halo={1} seed="k3" />
      <Chibi {...KOLBE_PRISIONEIRO} x={410} y={1560} h={380} arms="pray" eyesClosed seed="k4" />
      <Chibi {...KOLBE_PRISIONEIRO} x={670} y={1560} h={380} expression="determinado" walk={1.2} seed="k5" />
      <Chibi outfit="listrado" hair="curto" cap="listrado" x={930} y={1560} h={380} arms="face" expression="choro" seed="pai" />
      <Sparkle x={100} y={1170} r={30} />
    </svg>
    <div style={{position: 'absolute', top: 900, left: 0, width: 540, textAlign: 'center', fontFamily: F.serifa, fontSize: 34, fontWeight: 700}}>Hábito conventual · 1918–1941</div>
    <div style={{position: 'absolute', top: 900, left: 540, width: 540, textAlign: 'center', fontFamily: F.serifa, fontSize: 34, fontWeight: 700}}>Auschwitz 1941 · nº 16670</div>
    <div style={{position: 'absolute', top: 1610, width: '100%', display: 'flex', justifyContent: 'space-around', fontFamily: F.serifa, fontSize: 28, fontWeight: 700}}>
      <span>glória</span><span>oração</span><span>o passo</span><span>o pai (Gajowniczek)</span>
    </div>
    <div style={{position: 'absolute', bottom: 90, width: '100%', textAlign: 'center', fontFamily: F.serifa, fontSize: 30, color: C.terra}}>
      contorno #2B1B14 · óculos redondos sempre · sem barba (1939–41) · olhos de ponto · cabeça = 40% da altura
    </div>
  </AbsoluteFill>
);
