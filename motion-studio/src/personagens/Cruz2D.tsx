// Cruz luminosa vetorial (alternativa ao 3D). Dono: agente PERSONAGENS.
// Minimalista: cruz latina com gradiente quente, borda de luz, halo radial e raios finos opcionais.
// Tudo função do frame; variação dos raios com random('seed').
import React, {useId} from 'react';
import {interpolate, Easing, random, useCurrentFrame, useVideoConfig} from 'remotion';

export type Cruz2DProps = {
  /** Altura da cruz em px. O SVG ocupa ~2.4× para caber o halo; o centro do SVG = centro da cruz. */
  altura: number;
  /** Centro da cruz em px na composição (omitido = centralizado no quadro). */
  x?: number;
  y?: number;
  /** Corpo da cruz: 'luz' (luminosa, núcleo claro) | 'silhueta' (escura recortada contra o halo). */
  modo?: 'luz' | 'silhueta';
  corNucleo?: string;
  corOuro?: string;
  corLuz?: string;
  corSilhueta?: string;
  /** Intensidade 0..1.5 — anime para "acender" (halo + brilho + raios). */
  luz?: number;
  /** Espessura relativa das hastes (0.1 = fina/elegante). */
  espessura?: number;
  raios?: boolean;
  /** Abertura dos raios 0..1.5 (anime para "abrir" a luz num ponto da fala). */
  aberturaRaios?: number;
  /** Frame local de entrada (fade + leve subida) e saída opcional. */
  entradaEm?: number;
  duracaoEntrada?: number;
  saidaEm?: number;
  duracaoSaida?: number;
  /** Respiração lenta do halo (amplitude 0..0.2). */
  respiracao?: number;
};

export const Cruz2D: React.FC<Cruz2DProps> = ({
  altura,
  x,
  y,
  modo = 'luz',
  corNucleo = '#FFF4DE',
  corOuro = '#D9B56E',
  corLuz = '#FFB24A',
  corSilhueta = '#0A0E16',
  luz = 1,
  espessura = 0.1,
  raios = true,
  aberturaRaios = 1,
  entradaEm = 0,
  duracaoEntrada = 75,
  saidaEm,
  duracaoSaida = 40,
  respiracao = 0.06,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ent = interpolate(frame, [entradaEm, entradaEm + duracaoEntrada], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const sai =
    saidaEm === undefined
      ? 1
      : interpolate(frame, [saidaEm, saidaEm + duracaoSaida], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  const op = ent * sai;
  if (op <= 0) return null;
  const t = (frame - entradaEm) / fps;
  const L = Math.max(0, luz) * ent;
  const resp = 1 + respiracao * Math.sin(t * 0.9);

  // geometria em unidades: altura 100
  const H = 100;
  const W = 66; // braço = 2/3 da altura
  const e = H * espessura;
  const yBarra = -H / 2 + (W / 2 - e / 2) + e / 2; // braço superior = braços laterais
  const r = e * 0.12; // cantos levemente suavizados
  const vbS = 240;
  const k = altura / H;
  const cx = x ?? width / 2;
  const cy = y ?? height / 2;

  const cruz = (fill: string, extra: React.SVGProps<SVGGElement> = {}) => (
    <g {...extra}>
      <rect x={-e / 2} y={-H / 2} width={e} height={H} rx={r} fill={fill} />
      <rect x={-W / 2} y={yBarra - e / 2} width={W} height={e} rx={r} fill={fill} />
    </g>
  );

  const nRaios = 14;
  const listaRaios = Array.from({length: nRaios}, (_, i) => {
    const ang = (i / nRaios) * 360 + random(`raio-a-${i}`) * 14 + t * 1.2;
    const comp = (55 + random(`raio-c-${i}`) * 60) * Math.max(0, aberturaRaios);
    const larg = 0.6 + random(`raio-l-${i}`) * 2.2;
    const pulso = 0.5 + 0.5 * Math.sin(t * (0.5 + random(`raio-p-${i}`) * 0.7) + i);
    return {ang, comp, larg, alpha: (0.05 + 0.12 * pulso) * Math.min(1, L)};
  });

  return (
    <svg
      width={vbS * k}
      height={vbS * k}
      viewBox={`${-vbS / 2} ${-vbS / 2} ${vbS} ${vbS}`}
      style={{position: 'absolute', left: cx - (vbS * k) / 2, top: cy - (vbS * k) / 2 - (1 - ent) * altura * 0.04, opacity: op, overflow: 'visible'}}
    >
      <defs>
        <radialGradient id={`h${uid}`} cx="0" cy={yBarra} r={110} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={corNucleo} stopOpacity={0.55 * Math.min(1, L)} />
          <stop offset="0.18" stopColor={corLuz} stopOpacity={0.32 * Math.min(1, L)} />
          <stop offset="0.5" stopColor={corLuz} stopOpacity={0.08 * Math.min(1, L)} />
          <stop offset="1" stopColor={corLuz} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`c${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={corNucleo} />
          <stop offset="0.5" stopColor={corOuro} />
          <stop offset="1" stopColor={corLuz} />
        </linearGradient>
        <linearGradient id={`r${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={corNucleo} stopOpacity={1} />
          <stop offset="1" stopColor={corLuz} stopOpacity={0} />
        </linearGradient>
        <filter id={`g${uid}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation={3 + 3 * L} />
        </filter>
        <filter id={`g2${uid}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation={0.8} />
        </filter>
      </defs>

      {/* halo */}
      <ellipse cx={0} cy={yBarra} rx={110 * resp} ry={115 * resp} fill={`url(#h${uid})`} />
      {/* raios finos */}
      {raios &&
        listaRaios.map((ri, i) => (
          <g key={i} transform={`translate(0 ${yBarra}) rotate(${ri.ang.toFixed(2)})`} opacity={ri.alpha}>
            <rect x={e * 0.8} y={-ri.larg / 2} width={ri.comp} height={ri.larg} fill={`url(#r${uid})`} filter={`url(#g2${uid})`} />
          </g>
        ))}
      {modo === 'luz' ? (
        <>
          {/* bloom */}
          {cruz(corLuz, {filter: `url(#g${uid})`, opacity: 0.85 * Math.min(1, L)})}
          {cruz(`url(#c${uid})`, {opacity: 0.35 + 0.65 * Math.min(1, L)})}
          {/* núcleo */}
          <g opacity={0.6 * Math.min(1, L)} filter={`url(#g2${uid})`}>
            <rect x={-e * 0.18} y={-H / 2 + e * 0.4} width={e * 0.36} height={H - e * 0.8} fill={corNucleo} />
            <rect x={-W / 2 + e * 0.4} y={yBarra - e * 0.18} width={W - e * 0.8} height={e * 0.36} fill={corNucleo} />
          </g>
        </>
      ) : (
        <>
          {cruz(corLuz, {filter: `url(#g2${uid})`, opacity: Math.min(1, L), transform: 'scale(1.02)'})}
          {cruz(corSilhueta)}
        </>
      )}
    </svg>
  );
};
