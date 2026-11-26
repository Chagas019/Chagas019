/**
 * V3 "PARA A 10ª GINCANA?" (300–479).
 * 300–389 verde chapado (fiel ao GIF do cliente): câmera baixa — o Corredor (personagem do cliente)
 *   em loop, com pinceladas de velocidade radiais (tons do verde + brancas). "PARA A" sobe em 330.
 *   386–389 silêncio: tudo congela (hold) antes do drop.
 * 390 corte seco p/ marinho: "10ª" GIGANTE em ouro bate (impacto máx) + respingos laranja;
 *   "PARA A" fica em cima, pequeno; 405 "GINCANA?" slam branco. Frase inteira legível 405–479.
 *   436–476 (vertical): o Corredor atravessa pela linha embaixo, com pinceladas atrás.
 */
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import {
  BG_V2,
  INK_V2,
  LinhaBranca,
  PinceladasVelocidade,
  Splash,
  TONE_V2,
  linhaReta,
} from '../design/v2';
import { FONT_CONDENSED, FONT_DISPLAY } from '../design/fonts';
import { EXPO_OUT, GELATINA, KineticText, mix, prog, springAt, squashAt, useHoldPose } from '../motion';
import { useLayout } from '../layout';
import { TEXT_V2 } from '../content-v2';
import { Cam, Corredor, Flat, at, hardShadow, useV2Frame, type SceneV2Props } from './shared';

/** Verde chapado do GIF do cliente — só nesta cena (corrida), com pinceladas em tons do próprio verde. */
const GREEN = { bg: '#22E04A', light: '#5CF27A', dark: '#14C23C', deep: '#0FA532' } as const;

const DROP = 390;
const GINC = 405;
const PARA = 330;

export const V3DezGincana: React.FC<SceneV2Props> = ({ layout }) => {
  const f = useV2Frame('V3');
  const { fps } = useVideoConfig();
  const L = useLayout(layout);
  const { W, H, isV, cx } = L;
  // silêncio 386–389: congela tudo no frame 385
  const fz = f >= 386 && f < DROP ? 385 : f;
  const hp = useHoldPose(fz, 15);
  const seed = Math.floor(fz / 2);
  const rel = (abs: number) => abs - 300;

  if (f < DROP) {
    // ───────────── corrida em câmera baixa (fiel ao GIF do cliente: verde chapado + pinceladas)
    const center = isV ? { x: W * 0.5, y: H * 0.6 } : { x: W * 0.36, y: H * 0.52 };
    const h = isV ? 1400 : 1080;
    const push = mix(0.94, 1.08, prog(fz, 300, 386));
    const bob = Math.floor(fz / 3) % 2 === 0 ? 0 : -10;
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <Flat frame={f} color={GREEN.bg} />
        <PinceladasVelocidade
          width={W}
          height={H}
          center={center}
          progress={(hp - 300) / 24}
          seed={seed}
          count={72}
          maxWidth={isV ? 160 : 150}
          innerRadius={140}
          colors={[GREEN.light, GREEN.dark, GREEN.light, GREEN.deep]}
        />
        <PinceladasVelocidade
          width={W}
          height={H}
          center={center}
          progress={(hp - 300) / 18 + 0.37}
          seed={seed + 50}
          count={14}
          maxWidth={40}
          innerRadius={420}
          colors={[INK_V2.white, GREEN.light, INK_V2.white]}
        />
        <Cam frame={fz} impacts={[300]} amp={12} scale={push} originX={center.x} originY={center.y}>
          <Corredor
            x={center.x + (isV ? 60 : 0)}
            y={(isV ? H * 0.98 : H * 1.04) + bob}
            height={h}
            frame={fz}
            framesPerPose={3}
          />
        </Cam>
        {/* "PARA A" sobe em 330 (canto alto, fora do corpo) */}
        <div style={at(isV ? cx : W * 0.76, isV ? 330 : 250)}>
          <KineticText
            text={TEXT_V2.paraA}
            mode="rise"
            startFrame={rel(PARA)}
            stagger={2}
            fontFamily={FONT_CONDENSED}
            fontWeight={400}
            fontSize={isV ? 230 : 250}
            color={INK_V2.navy}
            shadow={hardShadow(INK_V2.white, 10)}
            letterSpacing="0.02em"
            seed="v3-para"
          />
        </div>
      </AbsoluteFill>
    );
  }

  // ───────────── drop: marinho + 10ª ouro gigante
  const sq = squashAt(f, fps, DROP, 1.4, GELATINA);
  const inDez = springAt(f, fps, DROP - 2, GELATINA);
  const dezScale = mix(2.6, 1, Math.min(1.2, inDez));
  const dezSize = isV ? 430 : 520;
  const dezPos = isV ? { x: cx, y: 900 } : { x: cx, y: 520 };
  const ginPos = isV ? { x: cx, y: 1330 } : { x: cx, y: 880 };
  const paraPos = isV ? { x: cx, y: 470 } : { x: cx, y: 150 };
  const paraIn = springAt(f, fps, DROP, GELATINA);

  // personagem atravessa embaixo (440–476)
  const runP = prog(f, 436, 476);
  const runX = mix(-260, W + 260, runP);
  const lineE = prog(f, GINC + 2, GINC + 14, EXPO_OUT);
  const lineY = isV ? 1660 : 1000;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Flat frame={f} color={BG_V2.navy} />
      <Cam frame={f} impacts={[DROP, GINC]} amp={isV ? 26 : 22} dur={8}>
        {isV && f >= 436 && f < 478 && (
          <>
            <PinceladasVelocidade
              width={W}
              height={H}
              center={{ x: runX, y: lineY - 200 }}
              progress={(f - 436) / 16}
              seed={seed}
              count={40}
              maxWidth={70}
              innerRadius={260}
              colors={[TONE_V2.strokeOnNavyLight, '#1C3480']}
            />
            <Corredor x={runX} y={lineY + 40 - (runX / W) * 80} height={420} framesPerPose={2} />
          </>
        )}
        {/* respingos laranja/ouro saindo de trás do 10ª */}
        {f < DROP + 34 && (
          <Splash
            progress={prog(f, DROP, DROP + 34)}
            seed={21}
            ground={false}
            x={dezPos.x}
            y={dezPos.y + 40}
            scale={isV ? 3.4 : 3.6}
            count={34}
            colors={{ main: INK_V2.orange, second: INK_V2.gold, lines: null }}
          />
        )}
        <div style={at(paraPos.x, paraPos.y)}>
          <div
            style={{
              fontFamily: FONT_CONDENSED,
              fontSize: isV ? 150 : 120,
              color: INK_V2.white,
              letterSpacing: '0.06em',
              lineHeight: 1,
              transform: `scale(${Math.min(1.15, paraIn)})`,
            }}
          >
            {TEXT_V2.paraA}
          </div>
        </div>
        <div style={at(dezPos.x, dezPos.y)}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              fontFamily: FONT_DISPLAY,
              fontWeight: 900,
              color: INK_V2.gold,
              lineHeight: 0.86,
              letterSpacing: '-0.04em',
              textShadow: hardShadow(INK_V2.orange, 18),
              transform: `scale(${dezScale * sq.scaleX}, ${dezScale * sq.scaleY})`,
              transformOrigin: '50% 90%',
            }}
          >
            <span style={{ fontSize: dezSize }}>{TEXT_V2.dez}</span>
            <span style={{ fontSize: dezSize * 0.5, marginTop: dezSize * 0.02, marginLeft: dezSize * 0.02 }}>{TEXT_V2.ordinal}</span>
          </div>
        </div>
        <div style={at(ginPos.x, ginPos.y)}>
          <KineticText
            text={TEXT_V2.gincanaQ}
            mode="slam"
            startFrame={rel(GINC)}
            stagger={1}
            slamFrames={5}
            slamScale={2.2}
            fontFamily={FONT_DISPLAY}
            fontWeight={900}
            fontSize={isV ? 128 : 190}
            color={INK_V2.white}
            shadow={hardShadow(INK_V2.blue, 10)}
            letterSpacing="-0.03em"
            seed="v3-gincana"
          />
        </div>
        <LinhaBranca
          d={linhaReta(-40, lineY + 40, W + 40, lineY - 40)}
          start={prog(f, 470, 479)}
          end={lineE}
          thickness={8}
          width={W}
          height={H}
        />
      </Cam>
    </AbsoluteFill>
  );
};

export default V3DezGincana;
