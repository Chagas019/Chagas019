/**
 * V4 "TÁ CHEGANDO, HEIN?" (480–599).
 * 480: close EXTREMO dentro de um respingo (laranja/azul enche a tela) → zoom-out brutal (ref 1)
 *   revela o fundo turquesa chapado com a poça do respingo no chão.
 * 495–533 "TÁ CHEGANDO," entra letra a letra (type-beat, TYPE_BEATS_V2); 540 "HEIN?" pula com
 * overshoot e balança. No "HEIN?" o Corredor (personagem do cliente) ATRAVESSA a tela (528–568),
 * pisa na poça exatamente em 540 (splash) com pinceladas de velocidade atrás; passa POR TRÁS do
 * texto para não tirar a leitura.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import {
  BG_V2,
  INK_V2,
  LinhaBranca,
  PinceladasVelocidade,
  Splash,
  TONE_V2,
  blobPath,
  dropPath,
  linhaDiagonalArco,
  rng,
} from '../design/v2';
import { FONT_CONDENSED, FONT_DISPLAY } from '../design/fonts';
import { EXPO_OUT, KineticText, TYPE_BEATS_V2, extremeZoomOutStyle, mix, prog } from '../motion';
import { useLayout } from '../layout';
import { TEXT_V2 } from '../content-v2';
import { Cam, Corredor, Flat, at, hardShadow, useV2Frame, type SceneV2Props } from './shared';

const FROM = 480;
const HEIN = 540;

/** Poça-respingo (laranja com manchas azuis) onde a câmera começa "dentro". */
const Poca: React.FC<{ x: number; y: number; k: number; seed: number }> = ({ x, y, k, seed }) => {
  const R = rng(seed);
  const drops: React.ReactNode[] = [];
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI * (0.08 + 0.84 * R());
    const d = 150 + R() * 120;
    const r = 6 + R() * 12;
    drops.push(
      <path
        key={i}
        d={dropPath({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.55 - 10 }, r, a + Math.PI, r * (2 + R() * 3))}
        fill={i % 3 === 0 ? INK_V2.blue : INK_V2.orange}
      />,
    );
  }
  return (
    <svg
      width={1}
      height={1}
      style={{ position: 'absolute', left: x, top: y, overflow: 'visible' }}
      viewBox="0 0 1 1"
    >
      <g transform={`scale(${k})`}>
        <path d={blobPath({ x: 0, y: 0 }, 230, 62, 0, seed, 0.22, 12)} fill={INK_V2.orange} />
        <path d={blobPath({ x: -40, y: -6 }, 120, 30, 0.1, seed + 3, 0.35, 10)} fill={INK_V2.amber} />
        <path d={blobPath({ x: 70, y: 8 }, 90, 24, -0.1, seed + 5, 0.4, 9)} fill={INK_V2.blue} />
        <path d={blobPath({ x: -120, y: 14 }, 50, 14, 0, seed + 8, 0.4, 8)} fill={INK_V2.blue} />
        {drops}
      </g>
    </svg>
  );
};

export const V4Chegando: React.FC<SceneV2Props> = ({ layout }) => {
  const f = useV2Frame('V4');
  const L = useLayout(layout);
  const { W, H, isV, cx } = L;
  const seed = Math.floor(f / 2);
  const rel = (abs: number) => abs - FROM;
  const beats = TYPE_BEATS_V2.map(rel);

  const ground = isV ? 1700 : 950;
  const charX = isV ? 300 : 330;
  const pocaK = isV ? 1.15 : 1;
  const pocaX = charX + 40 * pocaK;

  // Corredor atravessa: pisa na poça em HEIN (540)
  const speed = isV ? 58 : 78;
  const runX = pocaX + (f - HEIN) * speed;
  const runH = isV ? 900 : 820;
  const running = runX > -runH && runX < W + runH;
  const runY = (isV ? H + 60 : H + 70) + (Math.floor(f / 3) % 2 ? -8 : 0);

  // zoom-out de dentro do respingo: foco num ponto laranja da poça
  const focus = { x: charX + 60 * pocaK, y: ground - 4 };
  const zoom = extremeZoomOutStyle(f, FROM, 26, { x: focus.x, y: focus.y, fromScale: 34, blur: 0, rotate: -14, width: W, height: H });

  // texto
  const textX = isV ? cx : 1180;
  const chegY = isV ? 500 : 330;
  const heinY = isV ? 880 : 690;
  const lineD = isV
    ? linhaDiagonalArco(-40, 1180, cx + 200, 900, 300, 220)
    : linhaDiagonalArco(-40, 520, 1580, 600, 260, 220);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={zoom}>
        {/* o turquesa vive DENTRO do plano que abre: no close extremo só se vê o respingo */}
        <Flat frame={f} color={BG_V2.turquoise} />
        <Cam frame={f} impacts={[HEIN]} amp={16}>
          <LinhaBranca d={lineD} start={prog(f, 560, 590)} end={prog(f, 536, 560, EXPO_OUT)} thickness={8} width={W} height={H} />
          <Poca x={pocaX} y={ground} k={pocaK * mix(1, 0.75, prog(f, 494, 520))} seed={7} />
          {running && (
            <>
              <PinceladasVelocidade
                width={W}
                height={H}
                center={{ x: runX, y: runY - runH * 0.5 }}
                progress={(f - 520) / 14}
                seed={seed}
                count={48}
                maxWidth={isV ? 110 : 100}
                innerRadius={runH * 0.35}
                colors={[TONE_V2.strokeOnTurquoiseLight, TONE_V2.groundOnTurquoise, TONE_V2.strokeOnTurquoiseLight]}
              />
              <Corredor x={runX} y={runY} height={runH} framesPerPose={2} />
            </>
          )}
          {f >= HEIN && f < HEIN + 24 && (
            <Splash
              progress={prog(f, HEIN, HEIN + 24)}
              seed={9}
              x={pocaX}
              y={ground}
              scale={isV ? 2.6 : 2.4}
              count={30}
              colors={{ main: INK_V2.blue, second: INK_V2.orange, lines: INK_V2.white }}
            />
          )}
          {isV ? (
            <>
              <div style={at(textX, chegY - 150)}>
                <KineticText
                  text="TÁ"
                  mode="type-beat"
                  beats={beats.slice(0, 2)}
                  fontFamily={FONT_CONDENSED}
                  fontWeight={400}
                  fontSize={250}
                  color={INK_V2.navy}
                  shadow={false}
                  letterSpacing="0.02em"
                  seed="v4-ta"
                />
              </div>
              <div style={at(textX, chegY + 110)}>
                <KineticText
                  text="CHEGANDO,"
                  mode="type-beat"
                  beats={beats.slice(2)}
                  fontFamily={FONT_CONDENSED}
                  fontWeight={400}
                  fontSize={180}
                  color={INK_V2.navy}
                  shadow={false}
                  letterSpacing="0.02em"
                  seed="v4-cheg"
                />
              </div>
            </>
          ) : (
            <div style={at(textX, chegY)}>
              <KineticText
                text={TEXT_V2.chegando}
                mode="type-beat"
                beats={beats}
                fontFamily={FONT_CONDENSED}
                fontWeight={400}
                fontSize={240}
                color={INK_V2.navy}
                shadow={false}
                letterSpacing="0.02em"
                seed="v4-cheg"
              />
            </div>
          )}
          <div style={{ ...at(textX, heinY), transform: `translate(-50%, -50%) rotate(${f >= HEIN ? 5 * Math.sin((f - HEIN) * 0.35) * Math.exp(-(f - HEIN) / 30) - 3 : 0}deg)` }}>
            <KineticText
              text={TEXT_V2.hein}
              mode="pop-word"
              startFrame={rel(HEIN)}
              popFrames={5}
              beatEvery={15}
              beatScale={0.08}
              fontFamily={FONT_DISPLAY}
              fontWeight={900}
              fontSize={isV ? 200 : 270}
              color={INK_V2.white}
              shadow={hardShadow(INK_V2.navy, 12)}
              letterSpacing="-0.03em"
              seed="v4-hein"
            />
          </div>
        </Cam>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default V4Chegando;
