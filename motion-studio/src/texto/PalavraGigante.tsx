// Palavra única gigante ("CONFIE.") ocupando a largura útil: impacto de escala a cada batida da voz,
// máscara de luz que varre as letras, profundidade quente e tremor de câmera mínimo opcional. Dono: agente TEXTO.
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {luzFe} from '../cor/tema';
import {curvas} from '../movimento/curvas';
import {fontesFe, larguraEm} from './fontesEditoriais';
import {brilhoAmbar, gradienteDourado, sombraProfundidade} from './profundidade';

export type PalavraGiganteProps = {
  texto: string;
  /** Frames (relativos à Sequence) de cada "confie" da voz: msParaFrame(startMs) - inicioDaCena. A 1ª batida é a entrada. */
  batidas: number[];
  /** Largura útil em px (width - 2 * areaSegura().x). A palavra é dimensionada para ocupá-la. */
  maxLargura: number;
  /** Fração da largura útil a ocupar (0..1). Padrão 0.96. */
  preenchimento?: number;
  /** Teto de tamanho em px (evita altura excessiva no horizontal). Ex.: 300 * unidade(). */
  tamanhoMax?: number;
  peso?: 600 | 700;
  cor?: string;
  /** true = preenchimento dourado desde a entrada. */
  dourada?: boolean;
  /** Índice da batida a partir da qual a palavra aquece para dourado (ex.: 1 = 2º "confie"). */
  douradoNaBatida?: number;
  /** Escala de base após cada batida (ex.: [1, 1.08] = 2º "confie" maior). O tamanho é calculado para o MAIOR valor caber. */
  escalasBatidas?: number[];
  /** Escala inicial do pouso (slam) na 1ª batida. Breve (16 f) e desfocada; mantenha <= 1.15. */
  escalaEntrada?: number;
  /** Intensidade do "soco" de escala por batida (0.06 = +6%). */
  forcaBatida?: number;
  /** Varredura de luz em cada batida (frames). 0 desliga. */
  duracaoVarredura?: number;
  /** Amplitude do tremor (px). 0 = desligado (padrão). Recomendado: 3–6 * unidade(). */
  tremor?: number;
  profundidade?: number;
  trackingEm?: number;
  saidaEm?: number;
  duracaoSaida?: number;
  /** Semente do tremor (determinístico). */
  semente?: string;
};

/** Envelope de uma batida: sobe em 3 frames, decai exponencialmente. */
const envelope = (t: number, decai = 9) => (t < 0 ? 0 : t < 3 ? t / 3 : Math.exp(-(t - 3) / decai));

export const PalavraGigante: React.FC<PalavraGiganteProps> = ({
  texto,
  batidas,
  maxLargura,
  preenchimento = 0.96,
  tamanhoMax,
  peso = 700,
  cor = luzFe.brancoQuente,
  dourada = false,
  douradoNaBatida,
  escalasBatidas = [],
  escalaEntrada = 1.1,
  forcaBatida = 0.06,
  duracaoVarredura = 42,
  tremor = 0,
  profundidade = 1,
  trackingEm = -0.01,
  saidaEm,
  duracaoSaida = 24,
  semente = 'palavra-gigante',
}) => {
  const frame = useCurrentFrame();
  const caixa = texto.toLocaleUpperCase('pt-BR');
  const fonte = peso === 700 ? 'impacto700' : 'impacto600';
  // Dimensiona pela MAIOR escala de repouso + pico do soco -> nunca sai da largura útil depois do pouso.
  const escalaMaxRepouso = Math.max(1, ...escalasBatidas);
  const porLargura = (maxLargura * preenchimento) / (larguraEm(caixa, fonte, trackingEm) * escalaMaxRepouso * (1 + forcaBatida));
  const tamanho = tamanhoMax ? Math.min(tamanhoMax, porLargura) : porLargura;

  const entrada = batidas[0] ?? 0;
  // Pouso da 1ª batida: chega de 110% desfocada e assenta (o "soco" vem do contraste com as demais).
  const pouso = interpolate(frame, [entrada, entrada + 16], [0, 1], {easing: curvas.entrada, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const anteriores = batidas.filter((b) => b <= frame);
  const ultima = anteriores.length ? anteriores[anteriores.length - 1] : -Infinity;
  const pulso = batidas.slice(1).reduce((acc, b) => acc + envelope(frame - b), 0);
  // Base que cresce de batida em batida (transição de 12 f), soco de escala somado por cima.
  const escalaBase = batidas.reduce((acc, b, k) => {
    const alvo = escalasBatidas[k] ?? (k ? escalasBatidas[k - 1] ?? 1 : 1);
    const ant = k ? escalasBatidas[k - 1] ?? 1 : 1;
    return acc + (alvo - ant) * interpolate(frame, [b, b + 12], [0, 1], {easing: curvas.entrada, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  }, 1);
  const escala = (escalaEntrada - (escalaEntrada - 1) * pouso) * escalaBase * (1 + forcaBatida * Math.min(1, pulso));
  const bOuro = douradoNaBatida === undefined ? undefined : batidas[douradoNaBatida];
  const ouro = dourada ? 1 : bOuro === undefined ? 0 : interpolate(frame, [bOuro, bOuro + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const blurEntrada = (1 - pouso) * tamanho * 0.06;
  const opEntrada = interpolate(frame, [entrada, entrada + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Brilho/calor por batida (inclui a de entrada).
  const calor = batidas.reduce((acc, b) => acc + envelope(frame - b, 18), 0);
  const brilho = Math.min(1, calor);

  // Varredura de luz: banda clara atravessa da esquerda p/ direita após cada batida.
  const tv = frame - ultima;
  const varrendo = duracaoVarredura > 0 && tv >= 0 && tv <= duracaoVarredura;
  const posBanda = interpolate(tv, [0, duracaoVarredura], [-30, 130], {easing: curvas.suave, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Tremor mínimo: ruído determinístico, só logo após cada batida.
  const ampTremor = tremor * Math.min(1, batidas.reduce((acc, b) => acc + envelope(frame - b, 6), 0));
  const tx = ampTremor ? noise2D(semente + 'x', frame * 0.35, 0) * ampTremor : 0;
  const ty = ampTremor ? noise2D(semente + 'y', 0, frame * 0.35) * ampTremor : 0;

  const saida = saidaEm === undefined ? 0 : interpolate(frame, [saidaEm, saidaEm + duracaoSaida], [0, 1], {easing: curvas.saida, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  if (frame < entrada) return null;

  const base: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    whiteSpace: 'nowrap',
    letterSpacing: `${trackingEm}em`,
    marginRight: `${-trackingEm}em`,
  };

  return (
    <div
      style={{
        position: 'relative',
        width: maxLargura,
        height: tamanho * 1.05,
        display: 'flex',
        justifyContent: 'center',
        fontFamily: fontesFe.impacto,
        fontWeight: peso,
        fontSize: tamanho,
        lineHeight: 1.05,
        transform: `translate(${tx}px, ${ty}px) scale(${escala * (1 - saida * 0.06)})`,
        opacity: opEntrada * (1 - saida),
        filter: blurEntrada + saida * 12 > 0.05 ? `blur(${blurEntrada + saida * tamanho * 0.05}px)` : undefined,
      }}
    >
      <div style={{position: 'relative'}}>
        {/* Camada de corpo: cor + profundidade + glow da batida */}
        <span
          style={{
            whiteSpace: 'nowrap',
            letterSpacing: `${trackingEm}em`,
            marginRight: `${-trackingEm}em`,
            color: ouro > 0.5 ? luzFe.dourado : cor,
            textShadow: [sombraProfundidade(tamanho, profundidade), brilhoAmbar(tamanho, 0.35 + 0.65 * brilho)].filter(Boolean).join(', '),
          }}
        >
          {caixa}
        </span>
        {ouro > 0 ? (
          <span style={{...base, opacity: ouro, backgroundImage: gradienteDourado, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>{caixa}</span>
        ) : null}
        {/* Máscara de luz: só a banda aparece, recortada pelas letras */}
        {varrendo ? (
          <span
            style={{
              ...base,
              backgroundImage: `linear-gradient(105deg, transparent ${posBanda - 16}%, rgba(255,226,179,0.0) ${posBanda - 10}%, ${luzFe.nucleo} ${posBanda}%, rgba(255,226,179,0.0) ${posBanda + 10}%, transparent ${posBanda + 16}%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              opacity: 0.9,
            }}
          >
            {caixa}
          </span>
        ) : null}
      </div>
    </div>
  );
};
