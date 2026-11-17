// Camada de áudio: narração + SFX por cue + trilha com ducking. Dono: agente SOM.
import React from 'react';
import {Html5Audio, Sequence, staticFile, useVideoConfig, interpolate} from 'remotion';
import type {Caption} from '@remotion/captions';
import {MIX, SFX, type Cue} from './biblioteca';

type Props = {
  cues: Cue[];
  narracao?: string | null;
  trilha?: string | null;
  palavras?: Caption[];
};

/** Volume da trilha por frame: abaixa (ducking) enquanto houver fala. */
const ducking = (palavras: Caption[], fps: number) => (f: number) => {
  const ms = (f / fps) * 1000;
  const falando = palavras.some((p) => ms >= p.startMs - 120 && ms <= p.endMs + 200);
  return falando ? MIX.trilhaSobVoz : MIX.trilha;
};

export const CamadaSom: React.FC<Props> = ({cues, narracao, trilha, palavras = []}) => {
  const {fps, durationInFrames} = useVideoConfig();
  return (
    <>
      {narracao ? <Html5Audio src={staticFile(narracao)} volume={MIX.narracao} /> : null}
      {trilha ? (
        <Html5Audio
          src={staticFile(trilha)}
          volume={(f) => ducking(palavras, fps)(f) * interpolate(f, [0, 30, durationInFrames - 45, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />
      ) : null}
      {cues.map((c, i) => (
        <Sequence key={`${c.som}-${i}`} from={c.frame} durationInFrames={fps * 3} name={`sfx:${c.som}`} layout="none">
          <Html5Audio src={staticFile(SFX[c.som].arquivo)} volume={(c.volume ?? SFX[c.som].volume) * MIX.sfx} />
        </Sequence>
      ))}
    </>
  );
};
