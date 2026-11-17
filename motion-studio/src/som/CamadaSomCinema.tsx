// Camada de áudio "cinema": narração + trilha com ducking suave por palavras + cues de SFX (cinema e base).
// Dono: agente SOM. Não substitui CamadaSom (que continua valendo para outros projetos).
import React, {useMemo} from 'react';
import {Html5Audio, Sequence, interpolate, staticFile, useVideoConfig} from 'remotion';
import type {Caption} from '@remotion/captions';
import {SFX} from './biblioteca';
import {MIX_CINEMA, SFX_CINEMA, type CueCinema} from './sfxCinema';
import {blocosDeFala, ganhoTrilha, type TrilhaComNiveis} from './ducking';

export {blocosDeFala, profundidadeDucking, ganhoTrilha, niveisNoFrame} from './ducking';
export type {NivelSecao, TrilhaComNiveis} from './ducking';

type Props = {
  cues: CueCinema[];
  narracao?: string | null;
  /** caminho da trilha OU descritor com níveis por seção (ver `TrilhaComNiveis`) */
  trilha?: string | TrilhaComNiveis | null;
  palavras?: Caption[];
  /** sobrescreve níveis de MIX_CINEMA (ex.: {trilha: 0.5}) */
  mix?: Partial<Record<keyof typeof MIX_CINEMA, number>>;
  /**
   * Abaixar a trilha pelas palavras mesmo sem arquivo de narração.
   * Padrão: false. Sem voz real o preview toca a trilha no nível livre e não "bombeia" em silêncio.
   * Com `narracao` presente, o ducking é sempre aplicado.
   */
  duckingSemVoz?: boolean;
};

const fonte = (som: CueCinema['som']) =>
  som in SFX_CINEMA ? SFX_CINEMA[som as keyof typeof SFX_CINEMA] : {...SFX[som as keyof typeof SFX], duracaoS: 3};

export const CamadaSomCinema: React.FC<Props> = ({cues, narracao, trilha, palavras = [], mix, duckingSemVoz = false}) => {
  const {fps, durationInFrames} = useVideoConfig();
  const m: Record<keyof typeof MIX_CINEMA, number> = {...MIX_CINEMA, ...mix};
  const blocos = useMemo(() => blocosDeFala(palavras, m.juntarMs), [palavras, m.juntarMs]);
  const arquivoTrilha = typeof trilha === 'string' ? trilha : (trilha?.arquivo ?? null);
  const niveis = typeof trilha === 'object' && trilha ? trilha.niveis : [];
  const comDucking = Boolean(narracao) || duckingSemVoz;

  const volumeTrilha = (f: number) => {
    const g = ganhoTrilha(f, fps, blocos, niveis, m, comDucking);
    const envelope = interpolate(f, [0, m.fadeInFrames, durationInFrames - m.fadeOutFrames, durationInFrames], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return g * envelope;
  };

  return (
    <>
      {narracao ? <Html5Audio src={staticFile(narracao)} volume={m.narracao} /> : null}
      {arquivoTrilha ? <Html5Audio src={staticFile(arquivoTrilha)} volume={volumeTrilha} name="trilha" /> : null}
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
              volume={(f) => {
                const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
                const entrada = c.fadeIn ? interpolate(f, [0, c.fadeIn], [0, 1], cl) : 1;
                const saida = fade ? interpolate(f, [dur - fade, dur], [1, 0], cl) : 1;
                return base * entrada * saida;
              }}
            />
          </Sequence>
        );
      })}
    </>
  );
};
