/**
 * V1 "E AÍ," (0–119) — laranja chapado.
 * 0–14 a linha branca corta a tela na diagonal; o personagem desce "surfando" a linha (ref 1),
 * bate no chão em 30 e EXPLODE em respingos azuis (melt + Splash + linhas radiais finas);
 * recompõe-se (36–46) e acena. "E AÍ," bate em 45 (pop-word) e treme nos beats.
 * 100–119 antecipação + salto para fora do quadro (handoff para o corte seco em 120).
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import {
  BG_V2,
  INK_V2,
  LinhaBranca,
  PERSONAGEM_CORES,
  PersonagemLiquido,
  Splash,
  jumpPose,
  lerpPose,
  linhaReta,
  wavePose,
  type PoseLiquida,
} from '../design/v2';
import { FONT_DISPLAY } from '../design/fonts';
import { EXPO_IN, EXPO_OUT, KineticText, prog, useHoldPose, mix } from '../motion';
import { useLayout } from '../layout';
import { TEXT_V2 } from '../content-v2';
import { Cam, Flat, at, hardShadow, useV2Frame, type SceneV2Props } from './shared';

const IMPACT = 30;
const TEXT_AT = 45;

export const V1EAi: React.FC<SceneV2Props> = ({ layout }) => {
  const f = useV2Frame('V1');
  const L = useLayout(layout);
  const { W, H, isV } = L;
  const hp = useHoldPose(f, 12); // pose "on twos/threes"
  const seed = Math.floor(f / 2);

  // ── composição
  const ground = isV ? 1420 : 900;
  const charX = isV ? W * 0.5 : W * 0.72;
  const size = isV ? 560 : 440;
  const textPos = isV ? { x: W / 2, y: 540 } : { x: W * 0.35, y: 460 };
  const fs = isV ? 250 : 340;

  // ── linha branca: entra no topo-esquerda e corta a tela até o ponto do impacto
  const lineFrom = isV ? { x: -120, y: 120 } : { x: -140, y: -60 };
  const lineTo = { x: charX + (charX - lineFrom.x) * 0.25, y: ground + (ground - lineFrom.y) * 0.25 };
  const lineD = linhaReta(lineFrom.x, lineFrom.y, lineTo.x, lineTo.y);
  const lineEnd = prog(f, 0, 12, EXPO_OUT);
  const lineStart = prog(f, 22, 34, EXPO_IN);

  // ── queda pela linha (8 → 30)
  const fall = prog(hp, 4, IMPACT, (t) => t * t * 0.55 + t * 0.45);
  const fx = mix(lineFrom.x + 120, charX, fall);
  const fy = mix(lineFrom.y + 160, ground, fall);
  const falling = f < IMPACT;

  // ── pose
  let pose: PoseLiquida;
  let melt = 0;
  let cx = charX;
  let cy = ground;
  let lean = 0;
  if (f < IMPACT) {
    pose = { ...jumpPose(0.78), lean: 30, trail: 35, stretch: 1.25 };
    cx = fx;
    cy = fy;
    lean = 20;
  } else if (f < 46) {
    // explode (30) → poça (30–36) → recompõe (36–46) com squash
    melt = f < 36 ? 1 - 0.15 * prog(hp, IMPACT, 36) : 1 - prog(hp, 36, 46, EXPO_OUT);
    pose = jumpPose(0.88 + 0.12 * prog(hp, 38, 46));
  } else if (f < 100) {
    const t = (hp - 46) / 22; // um aceno a cada ~0,7 s
    pose = lerpPose(jumpPose(1), wavePose(t), prog(hp, 46, 52, EXPO_OUT));
  } else {
    // antecipação + salto (100 → 119)
    pose = jumpPose(prog(hp, 100, 118));
    const air = prog(hp, 108, 119, EXPO_IN);
    cy = ground - air * (isV ? 1500 : 1100);
  }

  const showSplash = f >= IMPACT && f < IMPACT + 26;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Flat frame={f} color={BG_V2.orange} />
      <Cam frame={f} impacts={[IMPACT, TEXT_AT]} amp={isV ? 18 : 16}>
        {/* "E AÍ," — atrás do personagem, bate no 45 e treme nos beats */}
        <div style={at(textPos.x, textPos.y)}>
          <KineticText
            text={TEXT_V2.eAi}
            mode="pop-word"
            startFrame={TEXT_AT}
            popFrames={4}
            beatEvery={15}
            beatScale={0.07}
            fontFamily={FONT_DISPLAY}
            fontWeight={900}
            fontSize={fs}
            color={INK_V2.white}
            shadow={hardShadow('#D84E08', 12)}
            letterSpacing="-0.03em"
            seed="v1-eai"
          />
        </div>

        <LinhaBranca d={lineD} start={lineStart} end={lineEnd} thickness={9} width={W} height={H} />

        {showSplash && (
          <Splash
            progress={prog(f, IMPACT, IMPACT + 26)}
            seed={11}
            x={charX}
            y={ground}
            scale={isV ? 2.8 : 2.6}
            count={36}
            colors={{ main: INK_V2.blue, second: INK_V2.amber, lines: INK_V2.white }}
          />
        )}

        <div style={{ position: 'absolute', left: 0, top: 0 }}>
          <PersonagemLiquido
            size={size}
            pose={{ ...pose, lean: pose.lean + lean }}
            melt={melt}
            seed={seed}
            drips={f < IMPACT ? 1 : 0.6}
            colors={{ ...PERSONAGEM_CORES.sobreLaranja, ground: falling || f >= 108 ? null : PERSONAGEM_CORES.sobreLaranja.ground }}
            x={cx}
            y={cy}
          />
        </div>
      </Cam>
    </AbsoluteFill>
  );
};

export default V1EAi;
