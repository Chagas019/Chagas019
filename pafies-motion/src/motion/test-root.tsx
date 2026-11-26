import React from 'react';
import { AbsoluteFill, Composition, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Unbounded';
import { KineticText } from './KineticText';
import { TransitionWrap, whipPan, zoomDive, liquidWipe, ribbonWipe } from './transitions';
import { prog } from './hooks';
import { useBeatPulse } from '../timeline';

const { fontFamily } = loadFont('normal', { weights: ['900', '700'], subsets: ['latin', 'latin-ext'] });
const GOLD = 'linear-gradient(180deg,#FFE08A 0%,#E9B949 45%,#A8741A 100%)';
const bg = 'radial-gradient(circle at 50% 45%, #16296B 0%, #0B1A4A 55%, #060F2E 100%)';

const KTest: React.FC = () => {
  const row = (top: number, el: React.ReactNode) => (
    <div style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>{el}</div>
  );
  return (
    <AbsoluteFill style={{ background: bg }}>
      {row(40, <KineticText text="UNIR" mode="rise" startFrame={4} fontFamily={fontFamily} fontSize={150} exitFrame={70} exit="up" />)}
      {row(250, <KineticText text="ENERGIA" mode="slam" startFrame={20} stagger={1} staggerFrom="center" fontFamily={fontFamily} fontSize={150} />)}
      {row(460, <KineticText text="COMPARTILHAR" mode="wipe" startFrame={10} duration={14} wipeBand="#FF7A00" fontFamily={fontFamily} fontSize={120} />)}
      {row(650, <KineticText text="10ª EDIÇÃO" mode="stagger-scale" startFrame={12} gradient={GOLD} shadow="0 8px 0 #060F2E" fontFamily={fontFamily} fontSize={130} />)}
      {row(860, <KineticText text="JUNTOS" mode="scatter-out" startFrame={40} fontFamily={fontFamily} fontSize={130} />)}
    </AbsoluteFill>
  );
};

const SceneA: React.FC = () => (
  <AbsoluteFill style={{ background: bg, justifyContent: 'center', alignItems: 'center' }}>
    <div style={{ fontFamily, fontWeight: 900, fontSize: 360, color: '#FFF6E5', textShadow: '0 10px 0 #060F2E' }}>10ª</div>
  </AbsoluteFill>
);
const SceneB: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = useBeatPulse(f + 470, 'kick');
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(circle, #5C8BFF 0%, #1F5BFF 50%, #0B1A4A 100%)', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontFamily, fontWeight: 900, fontSize: 220, color: '#FFF6E5', textShadow: '0 8px 0 #060F2E', transform: `scale(${1 + 0.05 * pulse})` }}>ENERGIA</div>
    </AbsoluteFill>
  );
};

// 4 segmentos de 30 f: whip (0–29), dive (30–59), liquid (60–89), ribbon (90–119); transição nos f 5..25 de cada
const TrTest: React.FC = () => {
  const f = useCurrentFrame();
  const seg = Math.min(3, Math.floor(f / 30));
  const p = prog(f - seg * 30, 5, 25);
  const pres = [whipPan({ direction: 'left' }), zoomDive({ x: 960, y: 560, holeRadius: 60 }), liquidWipe({ direction: 'up' }), ribbonWipe({})][seg];
  return (
    <AbsoluteFill>
      <TransitionWrap presentation={pres as never} progress={p} role="exiting"><SceneA /></TransitionWrap>
      <TransitionWrap presentation={pres as never} progress={p} role="entering"><SceneB /></TransitionWrap>
    </AbsoluteFill>
  );
};

export const MotionTestRoot: React.FC = () => (
  <>
    <Composition id="KTest" component={KTest} durationInFrames={90} fps={30} width={1920} height={1080} />
    <Composition id="TrTest" component={TrTest} durationInFrames={120} fps={30} width={1920} height={1080} />
  </>
);
