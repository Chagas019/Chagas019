/**
 * V1 "E AÍ," (0–119) — laranja chapado.
 * 0–12 a linha branca corta a tela na diagonal. O Corredor (personagem do cliente) entra correndo
 * de baixo/esquerda com zoom de câmera (escala grande → normal) e PISA no chão em 30: splash azul +
 * linhas radiais finas + tremor; pinceladas de velocidade explodem atrás dele.
 * 45 "E AÍ," bate (pop-word) e treme nos beats. 100–119 ele dispara para fora do quadro.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { BG_V2, INK_V2, LinhaBranca, PinceladasVelocidade, Splash, TONE_V2, linhaReta } from '../design/v2';
import { FONT_DISPLAY } from '../design/fonts';
import { BACK_OUT, EXPO_IN, EXPO_OUT, KineticText, mix, prog, useBeatPulseV2 } from '../motion';
import { useLayout } from '../layout';
import { TEXT_V2 } from '../content-v2';
import { Cam, Corredor, Flat, at, hardShadow, useV2Frame, type SceneV2Props } from './shared';

const IMPACT = 30;
const TEXT_AT = 45;

export const V1EAi: React.FC<SceneV2Props> = ({ layout }) => {
  const f = useV2Frame('V1');
  const L = useLayout(layout);
  const { W, H, isV } = L;
  const seed = Math.floor(f / 2);
  const kick = useBeatPulseV2(f, 'kick', { decay: 6 });

  // ── composição
  const ground = isV ? 1660 : 1010;
  const restX = isV ? W * 0.5 : W * 0.7;
  const h = isV ? 1040 : 760; // altura do quadro do Corredor
  const textPos = isV ? { x: W / 2, y: 480 } : { x: W * 0.32, y: 440 };
  const fs = isV ? 250 : 330;

  // ── entrada: de baixo/esquerda, grande → normal (zoom de câmera), pisa em 30
  const enter = prog(f, 0, IMPACT, EXPO_OUT);
  const exit = prog(f, 100, 118, EXPO_IN);
  const rx = mix(isV ? -260 : -500, restX, enter) + exit * (isV ? 1300 : 1500);
  const ry = mix(ground + (isV ? 700 : 520), ground, prog(f, 0, IMPACT, BACK_OUT));
  const rs = mix(1.9, 1, enter) * (1 + 0.025 * kick);
  // micro-quique do passo no impacto
  const land = f >= IMPACT && f < IMPACT + 6 ? Math.sin(((f - IMPACT) / 6) * Math.PI) * 14 : 0;

  // ── linha branca: corta a tela até o ponto do impacto
  const lineFrom = isV ? { x: -120, y: 160 } : { x: -140, y: -60 };
  const lineTo = { x: restX + (restX - lineFrom.x) * 0.2, y: ground + (ground - lineFrom.y) * 0.2 };
  const lineD = linhaReta(lineFrom.x, lineFrom.y, lineTo.x, lineTo.y);

  // pinceladas atrás dele: nascem no impacto
  const burst = prog(f, IMPACT - 2, IMPACT + 8, EXPO_OUT);
  const chest = { x: rx, y: ground - h * 0.55 };

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Flat frame={f} color={BG_V2.orange} />
      {f >= IMPACT && (
        <AbsoluteFill>
          <PinceladasVelocidade
            width={W}
            height={H}
            center={chest}
            progress={(f - IMPACT) / 20}
            seed={seed}
            count={56}
            maxWidth={isV ? 120 : 110}
            innerRadius={(isV ? 300 : 280) * (1.8 - 0.8 * burst)}
            colors={[TONE_V2.strokeOnOrangeLight, TONE_V2.strokeOnOrangeDark, '#FF9A52']}
          />
        </AbsoluteFill>
      )}
      <Cam frame={f} impacts={[IMPACT, TEXT_AT]} amp={isV ? 20 : 18}>
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
            shadow={hardShadow(TONE_V2.orangeDeep, 12)}
            letterSpacing="-0.03em"
            seed="v1-eai"
          />
        </div>

        <LinhaBranca d={lineD} start={prog(f, 20, 34, EXPO_IN)} end={prog(f, 0, 12, EXPO_OUT)} thickness={9} width={W} height={H} />

        {f >= IMPACT && f < IMPACT + 26 && (
          <Splash
            progress={prog(f, IMPACT, IMPACT + 26)}
            seed={11}
            x={restX + h * 0.08}
            y={ground - 10}
            scale={isV ? 3 : 2.8}
            count={36}
            colors={{ main: INK_V2.blue, second: INK_V2.amber, lines: INK_V2.white }}
          />
        )}

        <Corredor x={rx} y={ry + land} height={h} scale={rs} framesPerPose={3} />
      </Cam>
    </AbsoluteFill>
  );
};

export default V1EAi;
