// Tipografia de impacto: CAIXA ALTA condensada (Oswald), revelação por máscara palavra a palavra sincronizada à voz,
// tracking que fecha levemente, profundidade quente em camadas, destaque dourado opcional e saída por frame. Dono: agente TEXTO.
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {luzFe} from '../cor/tema';
import {curvas} from '../movimento/curvas';
import {fontesFe, larguraPx, quebrarLinhas, tamanhoQueCabe, tamanhoQueCabeLinhas} from './fontesEditoriais';
import {brilhoAmbar, gradienteDourado, sombraProfundidade} from './profundidade';

export type TextoImpactoProps = {
  /** Palavras na ordem de leitura (serão convertidas para CAIXA ALTA). */
  palavras: string[];
  /** Frame de entrada de cada palavra, relativo à Sequence (use msParaFrame(palavra.startMs) - inicioDaCena). */
  entradas: number[];
  /** Tamanho desejado em px já multiplicado por unidade(). Pode ser reduzido automaticamente para caber. */
  tamanho: number;
  /** Largura máxima do bloco em px (normalmente width - 2 * areaSegura().x). */
  maxLargura: number;
  /** Índices após os quais quebrar a linha (quebra manual; sem isso, quebra gulosa por largura medida). */
  quebras?: number[];
  /** Índices das palavras em dourado (recomendado: 1 por frase). */
  destaques?: number[];
  cor?: string;
  peso?: 600 | 700;
  alinhamento?: 'center' | 'left';
  /** Duração da revelação de cada palavra (frames). */
  duracaoEntrada?: number;
  /** Tracking inicial → final (em). Fecha durante `duracaoTracking` frames após a entrada da palavra. */
  trackingInicial?: number;
  trackingFinal?: number;
  duracaoTracking?: number;
  /** 0..1 — extrusão/sombra quente. */
  profundidade?: number;
  /** Frame (relativo) em que começa a saída. */
  saidaEm?: number;
  duracaoSaida?: number;
  tipoSaida?: 'mascara' | 'desfoque';
  /** Reduz `tamanho` se alguma palavra não couber sozinha em `maxLargura` (padrão: true). */
  autoAjuste?: boolean;
  entrelinha?: number;
  /** Centraliza a linha só com as palavras já reveladas (a linha "abre" conforme as palavras entram). Padrão: true. */
  centrarVisiveis?: boolean;
};

export const TextoImpacto: React.FC<TextoImpactoProps> = ({
  palavras,
  entradas,
  tamanho: tamanhoPedido,
  maxLargura,
  quebras,
  destaques = [],
  cor = luzFe.brancoQuente,
  peso = 700,
  alinhamento = 'center',
  duracaoEntrada = 20,
  trackingInicial = 0.06,
  trackingFinal = -0.005,
  duracaoTracking = 70,
  profundidade = 0.8,
  saidaEm,
  duracaoSaida = 18,
  tipoSaida = 'mascara',
  autoAjuste = true,
  entrelinha = 1.02,
  centrarVisiveis = true,
}) => {
  const frame = useCurrentFrame();
  const fonte = peso === 700 ? 'impacto700' : 'impacto600';
  const caixa = palavras.map((p) => p.toLocaleUpperCase('pt-BR'));
  const trackMax = Math.max(trackingInicial, trackingFinal);
  // Cabe com o tracking mais aberto -> nunca estoura durante a animação.
  const t1 = autoAjuste ? tamanhoQueCabe(caixa, fonte, tamanhoPedido, maxLargura, trackMax) : tamanhoPedido;
  const linhas = quebrarLinhas(caixa, fonte, t1, maxLargura, {quebras, gapEm: 0.24, trackingEm: trackMax});
  // Quebra manual pode gerar linha larga demais: reduz até caber (medido com o tracking mais aberto).
  const tamanho = autoAjuste ? tamanhoQueCabeLinhas(caixa, linhas, fonte, t1, maxLargura, {gapEm: 0.24, trackingEm: trackMax}) : t1;
  const gap = tamanho * 0.24;
  const H = entrelinha;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: alinhamento === 'center' ? 'center' : 'flex-start',
        width: maxLargura,
        fontFamily: fontesFe.impacto,
        fontWeight: peso,
        fontSize: tamanho,
        lineHeight: entrelinha,
        color: cor,
      }}
    >
      {linhas.map((linha, li) => (
        <div key={li} style={{display: 'flex', justifyContent: alinhamento === 'center' ? 'center' : 'flex-start'}}>
          {linha.map((i, k) => {
            const e = entradas[i] ?? 0;
            const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
            const p = interpolate(frame, [e, e + duracaoEntrada], [0, 1], {easing: curvas.entrada, ...clamp});
            const track = interpolate(frame, [e, e + duracaoTracking], [trackingInicial, trackingFinal], {easing: curvas.entrada, ...clamp});
            // Saída escalonada (2 frames por palavra, na ordem de leitura). Termina em saidaEm + 2*(n-1) + duracaoSaida.
            const s0 = saidaEm === undefined ? undefined : saidaEm + i * 2;
            const s = s0 === undefined ? 0 : interpolate(frame, [s0, s0 + duracaoSaida], [0, 1], {easing: curvas.saida, ...clamp});
            const blurSaida = tipoSaida === 'desfoque' ? s * tamanho * 0.08 : 0;
            const opSaida = tipoSaida === 'desfoque' ? 1 - s : 1;
            // Máscara (wipe de baixo p/ cima): a borda sobe pelo glifo, então o acento é revelado POR ÚLTIMO
            // (sem acento órfão). Na saída 'mascara' a borda desce de cima: o acento some primeiro.
            const topoEntrada = H + 0.12 - (H + 0.57) * p; // H+0.12em (vazio) -> -0.45em (inteiro, com acento)
            const topoSaida = tipoSaida === 'mascara' ? -0.45 + (H + 0.57) * s : -0.45;
            const topo = Math.max(topoEntrada, topoSaida);
            const y = (1 - p) * 40 + (tipoSaida === 'mascara' ? s * -30 : 0);
            // Sombra/brilho só depois que a palavra assentou (antes vazavam como linha âmbar na borda da máscara).
            const kLuz = interpolate(frame, [e + duracaoEntrada * 0.8, e + duracaoEntrada + 10], [0, 1], clamp) * (1 - s);
            const acende = interpolate(frame, [e + duracaoEntrada * 0.8, e + duracaoEntrada + 30], [1, 0], clamp);
            const destaque = destaques.includes(i);
            const sombra = sombraProfundidade(tamanho, profundidade * kLuz);
            const glow = brilhoAmbar(tamanho, kLuz * (destaque ? 0.7 + acende * 0.3 : acende * 0.35));
            // Largura do slot = largura real no tracking ATUAL (gap de 0.24em nunca é invadido).
            // centrarVisiveis: palavras ainda não ditas têm largura 0 -> a linha centraliza só o que já apareceu.
            const fVis = centrarVisiveis ? interpolate(frame, [e, e + duracaoEntrada * 0.5], [0, 1], {easing: curvas.entrada, ...clamp}) : 1;
            const larguraSlot = (larguraPx(caixa[i], fonte, tamanho, track) - track * tamanho) * fVis;
            const camada: React.CSSProperties = {
              position: 'absolute',
              left: '50%',
              top: 0,
              whiteSpace: 'nowrap',
              letterSpacing: `${track}em`,
              // letter-spacing acrescenta espaço após a última letra; compensa para centralizar.
              transform: `translateX(calc(-50% + ${track / 2}em))`,
            };
            return (
              <span
                key={i}
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: larguraSlot,
                  marginLeft: k > 0 ? gap * fVis : 0,
                  height: `${H}em`,
                  clipPath: `inset(${topo.toFixed(4)}em -1em -0.12em -1em)`,
                  visibility: frame < e || topo >= H + 0.11 ? 'hidden' : 'visible',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transform: `translateY(${y}%)`,
                    opacity: opSaida,
                    filter: blurSaida > 0.05 ? `blur(${blurSaida}px)` : undefined,
                  }}
                >
                  <span
                    style={{
                      ...camada,
                      color: destaque ? luzFe.dourado : cor,
                      textShadow: [sombra === 'none' ? '' : sombra, glow].filter(Boolean).join(', ') || undefined,
                      filter: kLuz > 0 && acende > 0.01 ? `brightness(${1 + acende * 0.35 * kLuz})` : undefined,
                    }}
                  >
                    {caixa[i]}
                  </span>
                  {destaque ? (
                    <span
                      style={{
                        ...camada,
                        backgroundImage: gradienteDourado,
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent',
                      }}
                    >
                      {caixa[i]}
                    </span>
                  ) : null}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
