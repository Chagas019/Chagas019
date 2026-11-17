// Legenda com destaque palavra-a-palavra sincronizado à narração. Dono: agente TEXTO.
import React, {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {createTikTokStyleCaptions, type Caption} from '@remotion/captions';
import {mola, springs} from '../movimento/curvas';
import {fontes} from './fontes';

type Props = {
  captions: Caption[];
  /** Frame absoluto da composição em que a narração começa (para usar dentro de Sequences, passe o offset). */
  offsetFrames?: number;
  tamanho: number;
  corTexto: string;
  corAtiva: string;
  fundoAtivo: string;
  agruparMs?: number;
  maxLargura: number;
};

export const LegendaSincronizada: React.FC<Props> = ({captions, offsetFrames = 0, tamanho, corTexto, corAtiva, fundoAtivo, agruparMs = 1100, maxLargura}) => {
  const frame = useCurrentFrame() + offsetFrames;
  const {fps} = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const {pages} = useMemo(() => createTikTokStyleCaptions({captions, combineTokensWithinMilliseconds: agruparMs}), [captions, agruparMs]);
  const pagina = pages.find((p, i) => ms >= p.startMs && ms < (pages[i + 1]?.startMs ?? p.startMs + p.durationMs + 400));
  if (!pagina) return null;
  const fimPagina = pagina.startMs + pagina.durationMs;
  const inFrame = Math.round((pagina.startMs / 1000) * fps);
  const entrada = mola(frame, fps, inFrame, springs.rapido);
  const saida = interpolate(ms, [fimPagina + 150, fimPagina + 350], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: tamanho * 0.18,
        maxWidth: maxLargura,
        fontFamily: fontes.texto,
        fontWeight: 800,
        fontSize: tamanho,
        lineHeight: 1.15,
        textTransform: 'uppercase',
        letterSpacing: '-0.01em',
        opacity: saida,
        transform: `translateY(${(1 - entrada) * 30}px) scale(${0.92 + entrada * 0.08})`,
      }}
    >
      {pagina.tokens.map((t, i) => {
        const ativa = ms >= t.fromMs && ms < t.toMs;
        const passou = ms >= t.toMs;
        const pop = mola(frame, fps, Math.round((t.fromMs / 1000) * fps), springs.elastico, 12);
        return (
          <span
            key={i}
            style={{
              padding: `${tamanho * 0.06}px ${tamanho * 0.2}px`,
              borderRadius: tamanho * 0.22,
              background: ativa ? fundoAtivo : 'transparent',
              color: ativa ? corAtiva : corTexto,
              opacity: ativa || passou ? 1 : 0.55,
              transform: `scale(${ativa ? 1 + (1 - pop) * 0.12 + 0.04 : 1})`,
              textShadow: ativa ? 'none' : '0 4px 24px rgba(0,0,0,0.45)',
            }}
          >
            {t.text.trim()}
          </span>
        );
      })}
    </div>
  );
};
