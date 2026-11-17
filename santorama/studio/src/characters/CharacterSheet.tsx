import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Kolbe} from './Kolbe';
import {C, F} from '../brand/tokens';
import {FilmFinish} from '../core/cinema';

export const CharacterSheet: React.FC = () => (
  <AbsoluteFill style={{background: `radial-gradient(circle at 50% 30%, ${C.sepia}, ${C.carvao} 70%)`, fontFamily: F.titulo, color: C.pergaminho}}>
    <div style={{position: 'absolute', top: 60, width: '100%', textAlign: 'center', fontSize: 44, letterSpacing: 8, color: C.ouro}}>SANTORAMA · MODEL SHEET</div>
    <div style={{position: 'absolute', top: 120, width: '100%', textAlign: 'center', fontSize: 64}}>São Maximiliano Kolbe</div>
    <div style={{position: 'absolute', top: 260, left: 0, width: 540, display: 'flex', justifyContent: 'center'}}><Kolbe width={520} light="quente" /></div>
    <div style={{position: 'absolute', top: 260, left: 540, width: 540, display: 'flex', justifyContent: 'center'}}><Kolbe width={520} variant="prisioneiro" light="frio" expression="determinado" blinkSeed="b" /></div>
    <div style={{position: 'absolute', top: 1080, left: 0, width: 540, textAlign: 'center', fontFamily: F.serifa, fontSize: 34}}>Hábito franciscano conventual<br/>1918–1941</div>
    <div style={{position: 'absolute', top: 1080, left: 540, width: 540, textAlign: 'center', fontFamily: F.serifa, fontSize: 34}}>Auschwitz, 1941<br/>prisioneiro nº 16670</div>
    <div style={{position: 'absolute', top: 1230, left: 0, width: 360, display: 'flex', justifyContent: 'center'}}><Kolbe width={340} expression="gentil" gaze={[0.6, -0.4]} tilt={-4} blinkSeed="c" /></div>
    <div style={{position: 'absolute', top: 1230, left: 360, width: 360, display: 'flex', justifyContent: 'center'}}><Kolbe width={340} variant="prisioneiro" expression="sereno" eyesClosed={1} tilt={5} light="ouro" blinkSeed="d" /></div>
    <div style={{position: 'absolute', top: 1230, left: 720, width: 360, display: 'flex', justifyContent: 'center'}}><Kolbe width={340} variant="prisioneiro" expression="dor" gaze={[-0.7, 0.3]} tilt={-3} light="frio" blinkSeed="e" /></div>
    <div style={{position: 'absolute', bottom: 60, width: '100%', textAlign: 'center', fontFamily: F.serifa, fontSize: 30, color: C.ouroClaro}}>expressões: gentil · oração · dor   —   óculos redondos, sem barba (1939–41), rosto oval e alongado</div>
    <FilmFinish vignette={0.5} />
  </AbsoluteFill>
);
