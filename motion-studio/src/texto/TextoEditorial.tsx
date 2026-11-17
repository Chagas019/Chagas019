// Tipografia editorial contemplativa (Cormorant Garamond): entrada palavra a palavra com desfoque→foco e leve subida.
// Variante "frase" (itálico) para frases de apoio e "Ele é o caminho, a verdade e a vida.";
// variante "referencia" (caixa alta com tracking aberto, estilo versalete) para "João 14,6". Dono: agente TEXTO.
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {luzFe} from '../cor/tema';
import {curvas} from '../movimento/curvas';
import {fontesFe, quebrarLinhas, tamanhoQueCabe} from './fontesEditoriais';

export type TextoEditorialProps = {
  palavras: string[];
  /** Frame de entrada de cada palavra, relativo à Sequence (msParaFrame(startMs) - inicioDaCena). */
  entradas: number[];
  /** px já multiplicado por unidade(). Mínimo recomendado: 48 * u (frase) / 34 * u (referência). */
  tamanho: number;
  maxLargura: number;
  variante?: 'frase' | 'referencia';
  quebras?: number[];
  /** Índices em dourado (1 palavra-chave por frase, ex.: "caminho"). */
  destaques?: number[];
  cor?: string;
  corDestaque?: string;
  alinhamento?: 'center' | 'left';
  /** Duração do foco de cada palavra (frames). Contemplativo: 30–45. */
  duracaoEntrada?: number;
  /** Desfoque inicial em `em` (0.12 = 12% do corpo). */
  desfoqueInicial?: number;
  /** Subida inicial em `em`. */
  subida?: number;
  /** Fios finos à esquerda/direita (só na variante referencia). */
  fios?: boolean;
  saidaEm?: number;
  duracaoSaida?: number;
  autoAjuste?: boolean;
};

export const TextoEditorial: React.FC<TextoEditorialProps> = ({
  palavras,
  entradas,
  tamanho: tamanhoPedido,
  maxLargura,
  variante = 'frase',
  quebras,
  destaques = [],
  cor,
  corDestaque = luzFe.douradoClaro,
  alinhamento = 'center',
  duracaoEntrada = 36,
  desfoqueInicial = 0.12,
  subida = 0.28,
  fios = true,
  saidaEm,
  duracaoSaida = 30,
  autoAjuste = true,
}) => {
  const frame = useCurrentFrame();
  const ref = variante === 'referencia';
  const fonte = ref ? 'editorialVersal' : 'editorialItalico';
  const textos = ref ? palavras.map((p) => p.toLocaleUpperCase('pt-BR')) : palavras;
  const trackFinal = ref ? 0.32 : 0;
  const trackInicial = ref ? 0.2 : 0;
  const corBase = cor ?? (ref ? luzFe.dourado : luzFe.brancoQuente);
  const tamanho = autoAjuste ? tamanhoQueCabe(textos, fonte, tamanhoPedido, maxLargura * (ref && fios ? 0.7 : 1), trackFinal) : tamanhoPedido;
  const gapEm = ref ? 0.5 : 0.26;
  const linhas = quebrarLinhas(textos, fonte, tamanho, maxLargura * (ref && fios ? 0.7 : 1), {quebras, gapEm, trackingEm: trackFinal});
  const saida = saidaEm === undefined ? 0 : interpolate(frame, [saidaEm, saidaEm + duracaoSaida], [0, 1], {easing: curvas.suave, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const primeira = entradas[0] ?? 0;
  const fio = interpolate(frame, [primeira, primeira + 50], [0, 1], {easing: curvas.entrada, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const bloco = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: alinhamento === 'center' ? 'center' : 'flex-start',
        rowGap: tamanho * (ref ? 0.2 : 0.06),
        fontFamily: fontesFe.editorial,
        fontStyle: ref ? 'normal' : 'italic',
        fontWeight: ref ? 600 : 500,
        fontSize: tamanho,
        lineHeight: ref ? 1.1 : 1.18,
        color: corBase,
        opacity: 1 - saida,
        filter: saida > 0.01 ? `blur(${saida * tamanho * 0.1}px)` : undefined,
        transform: `translateY(${-saida * tamanho * 0.15}px)`,
      }}
    >
      {linhas.map((linha, li) => (
        <div key={li} style={{display: 'flex', columnGap: tamanho * gapEm, justifyContent: alinhamento === 'center' ? 'center' : 'flex-start'}}>
          {linha.map((i) => {
            const e = entradas[i] ?? 0;
            const p = interpolate(frame, [e, e + duracaoEntrada], [0, 1], {easing: curvas.entrada, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            const blur = (1 - p) * desfoqueInicial * tamanho;
            const track = trackInicial + (trackFinal - trackInicial) * p;
            const destaque = destaques.includes(i);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                  opacity: interpolate(p, [0, 0.6], [0, 1], {extrapolateRight: 'clamp'}),
                  filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
                  transform: `translateY(${(1 - p) * subida}em)`,
                  letterSpacing: ref ? `${track}em` : undefined,
                  marginRight: ref ? `${-track}em` : undefined, // tracking não empurra o centro
                  color: destaque ? corDestaque : undefined,
                  textShadow: destaque
                    ? `0 0 ${tamanho * 0.3}px rgba(255,178,74,0.35), 0 ${tamanho * 0.04}px ${tamanho * 0.18}px rgba(0,0,0,0.5)`
                    : `0 ${tamanho * 0.04}px ${tamanho * 0.2}px rgba(0,0,0,0.55)`,
                }}
              >
                {textos[i]}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );

  if (!ref || !fios) return bloco;
  const linhaFio = (lado: 'esq' | 'dir') => (
    <div
      style={{
        width: tamanho * 2.2,
        height: Math.max(1, tamanho * 0.04),
        background: `linear-gradient(${lado === 'esq' ? 90 : 270}deg, transparent, ${corBase})`,
        transform: `scaleX(${fio})`,
        transformOrigin: lado === 'esq' ? '100% 50%' : '0% 50%',
        opacity: 0.7 * (1 - saida),
      }}
    />
  );
  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', columnGap: tamanho * 0.7, maxWidth: maxLargura}}>
      {linhaFio('esq')}
      {bloco}
      {linhaFio('dir')}
    </div>
  );
};
