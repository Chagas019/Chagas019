/**
 * V2 "ESTÃO PREPARADOS" (120–299) — azul elétrico chapado (corte seco em 120).
 * Anel tipográfico 3D (ref 3) tumbling nos 3 eixos e aproximando (120–205); meia-volta
 * com freio (205–225) e TRAVA de frente legível 225–276 (~1,7 s); linha branca entra em
 * arco envolvendo o anel (232–262). 276–299: o anel volta a girar e mergulha na câmera.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AnelFrase, BG_V2, INK_V2, LinhaBranca, Splash, linhaArco } from '../design/v2';
import { EXPO_IN, EXPO_OUT, FLUID, mix, prog, useBeatPulseV2, useHoldPose } from '../motion';
import { useLayout } from '../layout';
import { TEXT_V2 } from '../content-v2';
import { Cam, Flat, useV2Frame, type SceneV2Props } from './shared';

const LOCK = 225;
const UNLOCK = 276;

/** Rotação do anel por frame absoluto (graus). Contínua nas emendas. */
const ringRot = (f: number): { x: number; y: number; z: number } => {
  // fase livre: velocidade decrescente, tumble nos 3 eixos (como ref 3)
  const t = f - 120;
  const freeX = -10 + 62 * Math.sin(t * 0.045) + 18 * Math.sin(t * 0.11);
  const freeY = -t * 5.2;
  const freeZ = 28 * Math.sin(t * 0.06 + 0.8) - 12;
  if (f < 200) return { x: freeX, y: freeY, z: freeZ };
  // 200→225: freia até a frente legível (y múltiplo de 360 → 0 aparente)
  const a = ringRot(199.999);
  const k = prog(f, 200, LOCK, EXPO_OUT);
  const yTarget = Math.floor(a.y / 360) * 360 - 360; // continua no mesmo sentido, mais uma volta
  if (f < UNLOCK) {
    const kk = Math.min(1, k);
    return { x: mix(a.x, -9, kk), y: mix(a.y, yTarget, kk), z: mix(a.z, 0, kk) };
  }
  // 276→299: volta a girar e tomba
  const u = prog(f, UNLOCK, 299, EXPO_IN);
  return { x: -9 + 70 * u, y: yTarget - 260 * u, z: -35 * u };
};

export const V2Preparados: React.FC<SceneV2Props> = ({ layout }) => {
  const f = useV2Frame('V2');
  const L = useLayout(layout);
  const { W, H, isV, cx, cy } = L;
  const hp = useHoldPose(f, 15);
  const kick = useBeatPulseV2(f, 'kick', { decay: 8 });

  const radius = isV ? 470 : 640;
  const band = isV ? 132 : 170;
  const r = ringRot(f < LOCK || f >= UNLOCK ? hp : f);

  // aproximação: começa pequeno e longe, chega ao tamanho de leitura no lock
  const approach = mix(0.38, 1, prog(f, 120, LOCK, EXPO_OUT));
  const dive = 1 + 3.2 * prog(f, UNLOCK + 8, 300, EXPO_IN);
  const locked = f >= LOCK && f < UNLOCK;
  const lockHit = f >= LOCK && f < LOCK + 12 ? Math.exp(-(f - LOCK) / 4) : 0;
  const scale = approach * dive * (1 + 0.035 * kick + 0.06 * lockHit);
  const yOff = isV ? 0 : 20;

  // linha branca em arco em volta do anel
  const arcR = (isV ? 500 : 700) * 1;
  const arcStart = prog(f, 246, 268, EXPO_IN);
  const arcEnd = prog(f, 228, 250, EXPO_OUT);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Flat frame={f} color={BG_V2.electric} />
      <Cam frame={f} impacts={[120, LOCK]} amp={14}>
        {/* respingos brancos que o anel "solta" na entrada */}
        {f < 150 && (
          <Splash
            progress={prog(f, 120, 150)}
            seed={5}
            ground={false}
            x={cx}
            y={cy}
            scale={isV ? 2.2 : 2.6}
            count={26}
            colors={{ main: INK_V2.white, second: INK_V2.gold, lines: null }}
          />
        )}
        <LinhaBranca
          d={linhaArco(cx, cy + yOff, arcR, 150, 150 + 300)}
          start={arcStart}
          end={arcEnd}
          thickness={8}
          width={W}
          height={H}
        />
        <div
          style={{
            position: 'absolute',
            left: cx,
            top: cy + yOff,
            width: 0,
            height: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(-50%, -50%) scale(${scale})`,
            }}
          >
            <AnelFrase
              text={TEXT_V2.preparadosRing}
              radius={radius}
              bandHeight={band}
              repeat={3}
              fontSize={band * 0.8}
              rotateX={r.x}
              rotateY={r.y}
              rotateZ={r.z + (locked ? 1.2 * Math.sin((f - LOCK) * 0.5) * Math.exp(-(f - LOCK) / 10) : 0)}
              perspective={isV ? 2600 : 3200}
              colors={{ outer: BG_V2.electric }}
            />
          </div>
        </div>
      </Cam>
    </AbsoluteFill>
  );
};

export default V2Preparados;
