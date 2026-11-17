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
  /** true = preenchimento dourado em vez de branco quente. */
  dourada?: boolean;
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
  const porLargura = (maxLargura * preenchimento) / larguraEm(caixa, fonte, trackingEm);
  const tamanho = tamanhoMax ? Math.min(tamanhoMax, porLargura) : porLargura;

  const entrada = batidas[0] ?? 0;
  // Pouso da 1ª batida: chega de 118% desfocada e assenta (o "soco" vem do contraste com as demais).
  const pouso = interpolate(frame, [entrada, entrada + 16], [0, 1], {easing: curvas.entrada, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const anteriores = batidas.filter((b) => b <= frame);
  const ultima = anteriores.length ? anteriores[anteriores.length - 1] : -Infinity;
  const pulso = batidas.slice(1).reduce((acc, b) => acc + envelope(frame - b), 0);
  // Escala: margem de segurança — pico total (1 + forcaBatida) ainda dentro de maxLargura/preenchimento.
  const escalaPico = Math.min(forcaBatida, 1 / preenchimento - 1);
  const escala = (1.18 - 0.18 * pouso) * (1 + escalaPico * Math.min(1, pulso));
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
            color: dourada ? luzFe.dourado : cor,
            textShadow: [sombraProfundidade(tamanho, profundidade), brilhoAmbar(tamanho, 0.35 + 0.65 * brilho)].filter(Boolean).join(', '),
          }}
        >
          {caixa}
        </span>
        {dourada ? (
          <span style={{...base, backgroundImage: gradienteDourado, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>{caixa}</span>
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
