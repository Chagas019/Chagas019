/**
 * V5 Selo (600–719) — azul-marinho chapado.
 * 600–618 a linha branca desenha um círculo; 612–636 ela "vira" o selo dourado ondulado (Selo, V1);
 * gota → coração (626–640); pessoas entram e erguem os braços (634–652);
 * lockup GINCANA (645) / Solidária (648–668) / PAFIES (654) / 10ª EDIÇÃO (660 = hit final, carimbo).
 * Segura vivo até 719. Lockup adaptado da S06 da V1 ao fundo chapado (sem vinheta/grão/blobs).
 */
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { Coracao, Pessoa, Selo, pessoaHandPosition } from '../design/elements';
import { FONT_DISPLAY, FONT_SANS } from '../design/fonts';
import { GRADIENTS, TRACKING } from '../design/tokens';
import { BG_V2, INK_V2, LinhaBranca, Splash, linhaCirculo } from '../design/v2';
import { EXPO_IN, EXPO_OUT, FLUID, GELATINA, KineticText, anticipate, breathe, mix, prog, springAt } from '../motion';
import { useLayout } from '../layout';
import { TEXT_V2 } from '../content-v2';
import { ScriptWriteOn, sansStyle } from '../scenes/shared';
import { Cam, Flat, at, useV2Frame, type SceneV2Props } from './shared';

const FROM = 600;
const HIT = 660;
const CUE = {
  circle: [600, 618] as const,
  seal: [612, 636] as const,
  drop: 626,
  heart: 640,
  people: 636,
  meet: 652,
  gincana: 645,
  solidaria: 648,
  pafies: 654,
  edicao: HIT,
};

const SEAL_R = 460;
const SEAL_SIZE = (SEAL_R * 2) / 0.903;
const HEART = { y: -230, w: 380 };
const MEET = { x: 0, y: -318 };
const PERSON = 400;
const TYPE = {
  gincana: { y: -15, size: 124 },
  solidaria: { y: 100, size: 150 },
  pafies: { y: 225, size: 72 },
  edicao: { y: 305, size: 44 },
};
const centered = (x: number, y: number): React.CSSProperties => ({ ...at(x, y) });

const SealContent: React.FC<{ f: number; fps: number }> = ({ f, fps }) => {
  const rel = (abs: number) => abs - FROM;
  const draw = prog(f, CUE.seal[0], CUE.seal[1], EXPO_OUT);
  const rot = mix(-40, 0, draw);

  const fall = prog(f, CUE.drop, CUE.heart - 5, EXPO_IN);
  const splat = springAt(f, fps, CUE.heart - 5, GELATINA);
  const morph = prog(f, CUE.heart - 5, CUE.heart, EXPO_OUT);
  const heartY = mix(-720, HEART.y, fall);
  const heartScale = f < CUE.heart - 5 ? 0.28 : mix(0.28, 1, splat);

  const slide = anticipate(f, CUE.people - 4, 4, CUE.meet - 6, 420, 0, 0.06, EXPO_OUT);
  const reach = prog(f, CUE.meet - 10, CUE.meet, EXPO_OUT);
  const hand = pessoaHandPosition(PERSON, 1);
  const pw = (PERSON * 200) / 240;
  const top = MEET.y - hand.y;
  const leftA = MEET.x - hand.x + 6;
  const leftB = MEET.x + hand.x - pw - 6;

  return (
    <>
      <div style={{ ...centered(0, 0), transform: `translate(-50%, -50%) rotate(${rot}deg)` }}>
        <Selo size={SEAL_SIZE} draw={draw} fill={prog(f, CUE.seal[0] + 8, CUE.seal[1])} wobble={0.3 * breathe(f, 120)} shimmer={f >= HIT && f <= HIT + 24 ? prog(f, HIT, HIT + 24, FLUID) : undefined} />
      </div>
      {f >= CUE.drop && (
        <div style={{ ...centered(0, heartY), transform: `translate(-50%, -50%) scale(${heartScale})` }}>
          <Coracao size={HEART.w} morph={morph} wave={f / 9} pulse={0.03 * (0.5 + 0.5 * breathe(f, 30))} seed="v5-heart" blobPhase={f / 60} />
        </div>
      )}
      {f >= CUE.people - 4 && (
        <>
          <Pessoa size={PERSON} reach={reach} variant="A" lean={2 * breathe(f, 60)} style={{ position: 'absolute', left: leftA - slide, top }} />
          <Pessoa size={PERSON} reach={reach} variant="B" flip lean={-2 * breathe(f, 60, 15)} style={{ position: 'absolute', left: leftB + slide, top }} />
        </>
      )}
      <div style={centered(0, TYPE.gincana.y)}>
        <KineticText
          text={TEXT_V2.seloGincana}
          mode="slam"
          startFrame={rel(CUE.gincana)}
          stagger={2}
          slamScale={1.8}
          slamFrames={5}
          fontFamily={FONT_DISPLAY}
          fontSize={TYPE.gincana.size}
          color={INK_V2.white}
          shadow={`0 6px 0 ${INK_V2.navy}`}
          seed="v5-gincana"
        />
      </div>
      <div style={centered(0, TYPE.solidaria.y)}>
        <ScriptWriteOn text={TEXT_V2.seloSolidaria} frame={f} start={CUE.solidaria} end={CUE.solidaria + 20} fontSize={TYPE.solidaria.size} />
      </div>
      {f >= CUE.pafies && (
        <div
          style={{
            ...centered(0, TYPE.pafies.y + 30 * (1 - prog(f, CUE.pafies, CUE.pafies + 8, EXPO_OUT))),
            clipPath: `inset(${100 * (1 - prog(f, CUE.pafies, CUE.pafies + 8, EXPO_OUT))}% -10% -20% -10%)`,
          }}
        >
          <div style={{ ...sansStyle(TYPE.pafies.size, 800, TRACKING.pafies), color: INK_V2.white, textShadow: `0 4px 0 ${INK_V2.navy}`, paddingLeft: '0.12em' }}>
            {TEXT_V2.seloPafies}
          </div>
        </div>
      )}
      <div style={centered(0, TYPE.edicao.y)}>
        <KineticText
          text={TEXT_V2.seloEdicao}
          mode="wipe"
          startFrame={rel(CUE.edicao)}
          duration={7}
          fontFamily={FONT_SANS}
          fontWeight={600}
          fontSize={TYPE.edicao.size}
          letterSpacing={TRACKING.edicaoSeal}
          gradient={GRADIENTS.gold}
          shadow={false}
          seed="v5-edicao"
        />
      </div>
    </>
  );
};

export const V5Selo: React.FC<SceneV2Props> = ({ layout }) => {
  const f = useV2Frame('V5');
  const { fps } = useVideoConfig();
  const L = useLayout(layout);
  const { W, H, isV, cx } = L;
  const center = isV ? { x: cx, y: 940 } : { x: cx, y: H / 2 };
  const k = isV ? 470 / SEAL_R : 1;
  const R = SEAL_R * k;

  const d = f - HIT;
  const stamp = d < 0 ? 0 : d < 2 ? 1 : Math.exp(-(d - 2) / 4);
  const pull = mix(1.12, 1, prog(f, FROM, HIT, EXPO_OUT));
  const float = 5 * breathe(f, 60) * prog(f, HIT, HIT + 20, FLUID);

  const circleEnd = prog(f, CUE.circle[0], CUE.circle[1], EXPO_OUT);
  const circleStart = prog(f, CUE.seal[0] + 4, CUE.seal[1], EXPO_IN);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Flat frame={f} color={BG_V2.navy} />
      <Cam frame={f} impacts={[FROM, HIT]} amp={12} scale={pull} y={float} originX={center.x} originY={center.y}>
        <LinhaBranca d={linhaCirculo(center.x, center.y, R + 20, -150)} start={circleStart} end={circleEnd} thickness={9} width={W} height={H} />
        {f >= HIT && f < HIT + 30 && (
          <Splash
            progress={prog(f, HIT, HIT + 30)}
            seed={33}
            ground={false}
            x={center.x}
            y={center.y}
            scale={isV ? 3.3 : 3.6}
            count={28}
            colors={{ main: INK_V2.gold, second: INK_V2.orange, lines: null }}
          />
        )}
        <div style={{ position: 'absolute', left: center.x, top: center.y, width: 0, height: 0, transform: `scale(${k * (1 + 0.05 * stamp)})` }}>
          <SealContent f={f} fps={fps} />
        </div>
      </Cam>
    </AbsoluteFill>
  );
};

export default V5Selo;
