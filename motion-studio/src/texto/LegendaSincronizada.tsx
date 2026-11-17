// Legenda com destaque palavra-a-palavra sincronizado à narração. Dono: agente TEXTO.
import React, {useMemo} from 'react';
import {useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {createTikTokStyleCaptions, type Caption} from '@remotion/captions';
import {mola, springs} from '../movimento/curvas';
import {fontes} from './fontes';

/** Quanto a pílula ativa pode passar do box da palavra, por lado, em frações de `tamanho`. */
const PILULA_EXCESSO_MAX = 0.08;

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
        columnGap: tamanho * 0.32,
        rowGap: tamanho * 0.18,
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
        // Sincronia: o pop começa exatamente no frame do startMs da palavra.
        const pop = mola(frame, fps, Math.round((t.fromMs / 1000) * fps), springs.elastico, 12);
        // A pílula é uma camada absoluta atrás do texto: o box no fluxo NUNCA é escalado,
        // então a palavra não empurra nem cobre as vizinhas. A pílula cresce em px (não em %),
        // para que palavras longas ("SINCRONIZADO") não ganhem um overshoot maior que as curtas.
        // Extensão para fora do box limitada a PILULA_EXCESSO_MAX·tamanho por lado,
        // bem menor que o vão livre até o texto vizinho (gap + padding do vizinho = 0,52·tamanho).
        const k = Math.min(Math.max(pop, 0), 1.25); // 0 → 1 (+ overshoot elástico até 1,25)
        // k<1: pílula começa recolhida dentro do padding (−0,16·t); k>1: overshoot até +0,08·t.
        const excesso = k < 1 ? (k - 1) * tamanho * 0.16 : (k - 1) * tamanho * (PILULA_EXCESSO_MAX / 0.25);
        const pilulaOpacidade = interpolate(pop, [0, 0.35], [0.75, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        return (
          <span
            key={i}
            style={{
              position: 'relative',
              display: 'inline-block',
              padding: `${tamanho * 0.06}px ${tamanho * 0.2}px`,
              color: ativa ? corAtiva : corTexto,
              opacity: ativa || passou ? 1 : 0.55,
              textShadow: ativa ? 'none' : '0 4px 24px rgba(0,0,0,0.45)',
            }}
          >
            {ativa ? (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: -excesso * 0.5,
                  bottom: -excesso * 0.5,
                  left: -excesso,
                  right: -excesso,
                  borderRadius: tamanho * 0.22,
                  background: fundoAtivo,
                  opacity: pilulaOpacidade,
                  zIndex: 0,
                }}
              />
            ) : null}
            <span style={{position: 'relative', zIndex: 1}}>{t.text.trim()}</span>
          </span>
        );
      })}
    </div>
  );
};
