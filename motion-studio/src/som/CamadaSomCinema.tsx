// Camada de áudio "cinema": narração + trilha com ducking suave por palavras + cues de SFX (cinema e base).
// Dono: agente SOM. Não substitui CamadaSom (que continua valendo para outros projetos).
import React, {useMemo} from 'react';
import {Html5Audio, Sequence, interpolate, staticFile, useVideoConfig} from 'remotion';
import type {Caption} from '@remotion/captions';
import {SFX} from './biblioteca';
import {MIX_CINEMA, SFX_CINEMA, type CueCinema} from './sfxCinema';

type Props = {
  cues: CueCinema[];
  narracao?: string | null;
  trilha?: string | null;
  palavras?: Caption[];
  /** sobrescreve níveis de MIX_CINEMA (ex.: {trilha: 0.5}) */
  mix?: Partial<Record<keyof typeof MIX_CINEMA, number>>;
};

type Segmento = {ini: number; fim: number};

/** Junta palavras próximas em blocos de fala (evita o "bombeamento" entre sílabas). */
export const blocosDeFala = (palavras: Caption[], juntarMs: number): Segmento[] => {
  const ord = [...palavras].sort((a, b) => a.startMs - b.startMs);
  const out: Segmento[] = [];
  for (const p of ord) {
    const ult = out[out.length - 1];
    if (ult && p.startMs - ult.fim < juntarMs) ult.fim = Math.max(ult.fim, p.endMs);
    else out.push({ini: p.startMs, fim: p.endMs});
  }
  return out;
};

const suave = (x: number) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * (3 - 2 * u);
};

/** Quanto a trilha deve estar abaixada (0 = livre, 1 = sob a voz) em `ms`. Rampa em curva S. */
export const profundidadeDucking = (ms: number, blocos: Segmento[], m: {rampaMs: number; preMs: number; posMs: number}) => {
  let d = 0;
  for (const b of blocos) {
    const a1 = b.ini - m.preMs; // já totalmente abaixada aqui
    const a0 = a1 - m.rampaMs;
    const r0 = b.fim + m.posMs; // começa a subir aqui
    const r1 = r0 + m.rampaMs;
    if (ms < a0 || ms > r1) continue;
    const v = ms < a1 ? suave((ms - a0) / m.rampaMs) : ms <= r0 ? 1 : 1 - suave((ms - r0) / m.rampaMs);
    if (v > d) d = v;
    if (d >= 1) break;
  }
  return d;
};

const fonte = (som: CueCinema['som']) =>
  som in SFX_CINEMA ? SFX_CINEMA[som as keyof typeof SFX_CINEMA] : {...SFX[som as keyof typeof SFX], duracaoS: 3};

export const CamadaSomCinema: React.FC<Props> = ({cues, narracao, trilha, palavras = [], mix}) => {
  const {fps, durationInFrames} = useVideoConfig();
  const m: Record<keyof typeof MIX_CINEMA, number> = {...MIX_CINEMA, ...mix};
  const blocos = useMemo(() => blocosDeFala(palavras, m.juntarMs), [palavras, m.juntarMs]);

  const volumeTrilha = (f: number) => {
    const d = profundidadeDucking((f / fps) * 1000, blocos, m);
    const nivel = m.trilha + (m.trilhaSobVoz - m.trilha) * d;
    const envelope = interpolate(f, [0, m.fadeInFrames, durationInFrames - m.fadeOutFrames, durationInFrames], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return nivel * envelope;
  };

  return (
    <>
      {narracao ? <Html5Audio src={staticFile(narracao)} volume={m.narracao} /> : null}
      {trilha ? <Html5Audio src={staticFile(trilha)} volume={volumeTrilha} name="trilha" /> : null}
      {cues.map((c, i) => {
        const s = fonte(c.som);
        const total = Math.round(s.duracaoS * fps) - (c.trimInicio ?? 0);
        const dur = Math.max(1, Math.min(total, c.duracao ?? total));
        const fade = c.duracao ? (c.fadeOut ?? 8) : 0;
        const base = (c.volume ?? s.volume) * m.sfx;
        return (
          <Sequence key={`${c.som}-${c.frame}-${i}`} from={c.frame} durationInFrames={dur} name={`sfx:${c.som}${c.evento ? ` · ${c.evento}` : ''}`} layout="none">
            <Html5Audio
              src={staticFile(s.arquivo)}
              trimBefore={c.trimInicio || undefined}
              volume={(f) => (fade ? base * interpolate(f, [dur - fade, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : base)}
            />
          </Sequence>
        );
      })}
    </>
  );
};
