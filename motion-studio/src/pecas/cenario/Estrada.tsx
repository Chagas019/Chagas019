// Estrada em perspectiva até o horizonte, com colinas em profundidade e névoa atmosférica. Dono: agente PEÇAS.
// Transparente acima das colinas: coloque <Horizonte> por baixo e o personagem por cima.
// Determinístico: relevo por noise2D com seed fixa; pedras/marcos por random('seed').
import React, {useId, useMemo} from 'react';
import {AbsoluteFill, random, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {clamp01, coresCenarioPadrao, f, mix, modp, smooth, type CoresCenario} from './comum';

export type EstradaProps = {
  /**
   * Distância percorrida (unidades de mundo; 1 ciclo de faixa = 2.4 unidades). Dirija pelo frame:
   * ex. `avanco={frame * 0.05}` = caminhada lenta. Valores contínuos, sem limite.
   */
  avanco?: number;
  /** 0 = noite fria · 1 = amanhecer âmbar. Interpolável. */
  luz?: number;
  /** Altura do horizonte como fração da altura (padrão 0.6). Use o mesmo valor no <Horizonte>. */
  horizonte?: number;
  /** Ponto de fuga X como fração da largura (padrão 0.5). */
  fugaX?: number;
  /** Curvatura da estrada perto do horizonte (-1 esquerda · 0 reta · 1 direita). */
  curva?: number;
  /** Meia-largura da estrada na base, fração da largura (padrão 0.44). */
  larguraBase?: number;
  /** Deslocamento lateral de câmera em px (base 1080): colinas fazem parallax por profundidade. */
  deriva?: number;
  /** Intensidade da névoa 0..1.5 (padrão 1). */
  nevoa?: number;
  /** Mostrar marcos laterais (postes baixos com refletor). Padrão true. */
  marcos?: boolean;
  cores?: Partial<CoresCenario>;
  /** Seed do relevo (troque para outra paisagem). */
  seed?: string;
  largura?: number;
  altura?: number;
};

const CAMADAS = [
  // profundidade 0 = mais distante
  {amp: 0.115, freq: 1.6, vale: 0.12, rim: 1},
  {amp: 0.09, freq: 2.4, vale: 0.16, rim: 0.7},
  {amp: 0.065, freq: 3.4, vale: 0.21, rim: 0.45},
  {amp: 0.042, freq: 5.0, vale: 0.27, rim: 0.25},
];

export const Estrada: React.FC<EstradaProps> = ({
  avanco = 0,
  luz = 0,
  horizonte = 0.6,
  fugaX = 0.5,
  curva = 0,
  larguraBase = 0.44,
  deriva = 0,
  nevoa = 1,
  marcos = true,
  cores: coresIn,
  seed = 'estrada',
  largura,
  altura,
}) => {
  const vc = useVideoConfig();
  const W = largura ?? vc.width;
  const H = altura ?? vc.height;
  const u = Math.min(W, H) / 1080;
  const c = {...coresCenarioPadrao, ...coresIn};
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const L = clamp01(luz);

  const hy = H * horizonte;
  const yBase = H * 1.04;
  const meiaBase = W * larguraBase;
  const desvio = curva * W * 0.22;
  const vx = W * fugaX;
  // t: 1 = base da tela, -> 0 = horizonte. t = 1/z (z = profundidade de mundo, z=1 na base).
  const cx = (t: number) => vx + desvio * (1 - t) * (1 - t);
  const yt = (t: number) => hy + (yBase - hy) * t;
  const fugaFinal = vx + desvio;

  // ---------- Cores por luz (perspectiva aérea) ----------
  const nevoaCor = mix(mix(c.azulSombra, c.azulMedio, 0.55), mix(c.ambar, c.sombraQuente, 0.35), L);
  const nevoaClara = mix(mix(c.azulMedio, c.brancoQuente, 0.18), mix(c.ambar, c.nucleo, 0.35), L);
  const pertoCor = mix(c.preto, mix(c.sombraQuente, c.preto, 0.3), L);
  const chaoLonge = mix(mix(c.azulSombra, c.preto, 0.35), mix(c.sombraQuente, c.ambar, 0.28), L);
  const asfaltoLonge = mix(mix(c.azulSombra, c.azulMedio, 0.25), mix(c.ambar, c.sombraQuente, 0.45), L);
  const asfaltoPerto = mix(mix(c.preto, c.azulSombra, 0.25), mix(c.preto, c.sombraQuente, 0.6), L);
  const faixaCor = mix(mix(c.brancoQuente, c.azulMedio, 0.25), mix(c.brancoQuente, c.nucleo, 0.5), L);
  const reflexo = mix(c.azulMedio, c.ambar, L);
  const refletor = mix(mix(c.brancoQuente, c.azulMedio, 0.3), c.ambar, L);

  // ---------- Colinas ----------
  const colinas = useMemo(() => {
    const passos = 72;
    return CAMADAS.map((cam, i) => {
      const prof = i / (CAMADAS.length - 1); // 0 longe .. 1 perto
      const px = deriva * u * (0.12 + 0.88 * prof);
      const pts: string[] = [];
      for (let k = 0; k <= passos; k++) {
        const x = -0.15 * W + (k / passos) * 1.3 * W;
        const xs = (x - px) / W; // coordenada no mundo (estável com a deriva)
        const n =
          0.62 * noise2D(`${seed}-c${i}`, xs * cam.freq, 0.3) + 0.38 * noise2D(`${seed}-c${i}b`, xs * cam.freq * 2.7, 1.7);
        const vale = smooth(0, W * cam.vale, Math.abs(x - fugaFinal));
        const h = H * cam.amp * (0.55 + 0.45 * n) * (0.18 + 0.82 * vale);
        pts.push(`${f(x)},${f(hy - h)}`);
      }
      const d = `M${f(-0.15 * W)},${f(hy + 4 * u)} L${pts.join(' L')} L${f(1.15 * W)},${f(hy + 4 * u)} Z`;
      const linha = `M${pts.join(' L')}`;
      return {d, linha, prof, rim: cam.rim};
    });
  }, [W, H, u, hy, deriva, seed, fugaFinal]);

  // ---------- Estrada ----------
  const amostras = 48;
  const ts = Array.from({length: amostras + 1}, (_, k) => {
    const s = k / amostras;
    return 0.004 + (1 - 0.004) * s * s; // mais amostras perto do horizonte
  });
  const borda = (lado: -1 | 1, fator: number) => ts.map((t) => `${f(cx(t) + lado * meiaBase * fator * t)},${f(yt(t))}`);
  const faixaQuad = (lado: -1 | 1, a: number, b: number) =>
    `M${borda(lado, a).join(' L')} L${borda(lado, b).reverse().join(' L')} Z`;
  const pista = `M${borda(-1, 1).join(' L')} L${borda(1, 1).reverse().join(' L')} Z`;

  // Faixas centrais tracejadas fluindo (período 2.4, traço 1).
  const P = 2.4;
  const T = 1;
  const off = modp(avanco, P);
  const tracos: {d: string; a: number}[] = [];
  for (let i = 0; i < 90; i++) {
    let z0 = 1 + i * P - off;
    let z1 = z0 + T;
    if (z1 < 0.6) continue;
    z0 = Math.max(z0, 0.6);
    z1 = Math.max(z1, z0 + 0.01);
    const t0 = 1 / z0;
    const t1 = 1 / z1;
    const lw = meiaBase * 0.016;
    const d = `M${f(cx(t0) - lw * t0)},${f(yt(t0))} L${f(cx(t0) + lw * t0)},${f(yt(t0))} L${f(cx(t1) + lw * t1)},${f(yt(t1))} L${f(cx(t1) - lw * t1)},${f(yt(t1))} Z`;
    tracos.push({d, a: Math.exp(-z0 / (45 / Math.max(0.4, nevoa)))});
  }

  // Pedras / tufos no acostamento (mundo fixo, deslizam com o avanço).
  const ZP = 32;
  const pedras = Array.from({length: 120}, (_, k) => {
    const lado = random(`${seed}-p-lado-${k}`) < 0.5 ? -1 : 1;
    const xw = lado * (1.06 + random(`${seed}-p-x-${k}`) * 1.5);
    const z = 0.7 + modp(random(`${seed}-p-z-${k}`) * ZP - avanco, ZP);
    const t = 1 / z;
    const r = (0.6 + random(`${seed}-p-r-${k}`) * 1.6) * 9 * u * t;
    return {x: cx(t) + xw * meiaBase * t, y: yt(t), r, a: Math.exp(-z / 22) * (0.55 + random(`${seed}-p-a-${k}`) * 0.5)};
  });

  // Marcos laterais (a cada 14 unidades, alternados).
  const ZM = 14;
  const offM = modp(avanco, ZM);
  const listaMarcos = marcos
    ? Array.from({length: 16}, (_, i) => {
        const z = 0.75 + i * ZM - offM;
        if (z < 0.75) return null;
        const t = 1 / z;
        const lado = i % 2 === 0 ? 1 : -1;
        const x = cx(t) + lado * meiaBase * 1.18 * t;
        const y = yt(t);
        const h = H * 0.07 * t;
        const w = Math.max(1, W * 0.012 * t);
        return {x, y, h, w, a: Math.exp(-z / 45), i};
      }).filter((m): m is NonNullable<typeof m> => m !== null)
    : [];

  const nv = clamp01(nevoa);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id={`${id}chao`} x1="0" y1={hy} x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={chaoLonge} />
            <stop offset="0.22" stopColor={mix(chaoLonge, pertoCor, 0.65)} />
            <stop offset="1" stopColor={pertoCor} />
          </linearGradient>
          <linearGradient id={`${id}pista`} x1="0" y1={hy} x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={asfaltoLonge} />
            <stop offset="0.3" stopColor={mix(asfaltoLonge, asfaltoPerto, 0.7)} />
            <stop offset="1" stopColor={asfaltoPerto} />
          </linearGradient>
          <linearGradient id={`${id}borda`} x1="0" y1={hy} x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={faixaCor} stopOpacity={0} />
            <stop offset="0.12" stopColor={faixaCor} stopOpacity={0.35} />
            <stop offset="1" stopColor={faixaCor} stopOpacity={0.75} />
          </linearGradient>
          <radialGradient id={`${id}reflexo`} cx={fugaFinal} cy={hy} r={H * 0.5} gradientUnits="userSpaceOnUse" gradientTransform={`translate(${fugaFinal} ${hy}) scale(0.55 1) translate(${-fugaFinal} ${-hy})`}>
            <stop offset="0" stopColor={reflexo} stopOpacity={0.55 + 0.35 * L} />
            <stop offset="0.45" stopColor={reflexo} stopOpacity={0.12 + 0.18 * L} />
            <stop offset="1" stopColor={reflexo} stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`${id}brilhoChao`} cx={fugaFinal} cy={hy} r={W * 0.9} gradientUnits="userSpaceOnUse" gradientTransform={`translate(${fugaFinal} ${hy}) scale(1 0.32) translate(${-fugaFinal} ${-hy})`}>
            <stop offset="0" stopColor={c.ambar} stopOpacity={0.5 * L} />
            <stop offset="0.5" stopColor={c.ambar} stopOpacity={0.12 * L} />
            <stop offset="1" stopColor={c.ambar} stopOpacity={0} />
          </radialGradient>
          {colinas.map((_, i) => (
            <linearGradient key={i} id={`${id}nv${i}`} x1="0" y1={hy - H * 0.13} x2="0" y2={hy} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={nevoaClara} stopOpacity={0} />
              <stop offset="0.75" stopColor={nevoaClara} stopOpacity={(0.1 + 0.08 * (3 - i)) * nv} />
              <stop offset="1" stopColor={nevoaClara} stopOpacity={(0.2 + 0.1 * (3 - i)) * nv} />
            </linearGradient>
          ))}
          <linearGradient id={`${id}nevoaChao`} x1="0" y1={hy - H * 0.03} x2="0" y2={hy + H * 0.14} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={nevoaClara} stopOpacity={0} />
            <stop offset="0.18" stopColor={nevoaClara} stopOpacity={0.42 * nv} />
            <stop offset="0.4" stopColor={nevoaCor} stopOpacity={0.22 * nv} />
            <stop offset="1" stopColor={nevoaCor} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${id}sombraBase`} x1="0" y1={H * 0.78} x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={c.preto} stopOpacity={0} />
            <stop offset="1" stopColor={c.preto} stopOpacity={0.7} />
          </linearGradient>
          <clipPath id={`${id}clipPista`}>
            <path d={pista} />
          </clipPath>
          <filter id={`${id}suave`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={1.2 * u} />
          </filter>
        </defs>

        {/* Colinas: longe -> perto, cada uma seguida de um véu de névoa (perspectiva aérea) */}
        {colinas.map((col, i) => {
          const corCol = mix(mix(nevoaCor, nevoaClara, 0.35 * (1 - col.prof)), pertoCor, 0.18 + 0.78 * col.prof);
          return (
            <g key={i}>
              <path d={col.d} fill={corCol} />
              {/* contraluz na crista (amanhecer) / luar frio sutil (noite) */}
              <path
                d={col.linha}
                fill="none"
                stroke={mix(c.azulMedio, c.ambar, L)}
                strokeOpacity={col.rim * (0.12 + 0.5 * L)}
                strokeWidth={1.6 * u}
                filter={`url(#${id}suave)`}
              />
              <rect x={0} y={hy - H * 0.13} width={W} height={H * 0.13} fill={`url(#${id}nv${i})`} />
            </g>
          );
        })}

        {/* Chão */}
        <rect x={0} y={hy} width={W} height={H - hy} fill={`url(#${id}chao)`} />
        <rect x={0} y={hy} width={W} height={H - hy} fill={`url(#${id}brilhoChao)`} />
        {pedras.map((p, k) => (
          <ellipse key={k} cx={p.x} cy={p.y} rx={p.r} ry={p.r * 0.42} fill={k % 3 === 0 ? mix(nevoaClara, pertoCor, 0.55 - 0.2 * L) : mix(c.preto, pertoCor, 0.3)} opacity={p.a} />
        ))}

        {/* Pista */}
        <path d={pista} fill={`url(#${id}pista)`} />
        <g clipPath={`url(#${id}clipPista)`}>
          <rect x={0} y={hy} width={W} height={H - hy} fill={`url(#${id}reflexo)`} />
        </g>
        <path d={faixaQuad(-1, 0.955, 0.975)} fill={`url(#${id}borda)`} />
        <path d={faixaQuad(1, 0.955, 0.975)} fill={`url(#${id}borda)`} />
        {tracos.map((tr, k) => (
          <path key={k} d={tr.d} fill={faixaCor} opacity={tr.a * 0.85} />
        ))}

        {/* Marcos laterais */}
        {listaMarcos.map((m) => (
          <g key={m.i} opacity={m.a}>
            <rect x={m.x - m.w / 2} y={m.y - m.h} width={m.w} height={m.h} rx={m.w * 0.25} fill={mix(c.preto, nevoaCor, 0.25)} />
            <rect x={m.x - m.w / 2} y={m.y - m.h} width={m.w} height={m.h * 0.14} fill={refletor} opacity={0.8} />
            <ellipse cx={m.x} cy={m.y} rx={m.w * 2.2} ry={m.w * 0.5} fill={c.preto} opacity={0.5} />
          </g>
        ))}

        {/* Névoa rente ao chão no horizonte e peso no primeiro plano */}
        <rect x={0} y={hy - H * 0.03} width={W} height={H * 0.17} fill={`url(#${id}nevoaChao)`} />
        <rect x={0} y={H * 0.78} width={W} height={H * 0.22} fill={`url(#${id}sombraBase)`} />
      </svg>
    </AbsoluteFill>
  );
};

/** Pontos úteis para posicionar o personagem sobre a estrada. */
export const geometriaEstrada = (W: number, H: number, horizonte = 0.6, fugaX = 0.5, larguraBase = 0.44) => {
  const hy = H * horizonte;
  const yBase = H * 1.04;
  return {
    horizonteY: hy,
    fugaX: W * fugaX,
    /** Y na tela para uma profundidade t (1 = base, ->0 = horizonte). */
    y: (t: number) => hy + (yBase - hy) * t,
    /** Escala de um objeto na profundidade t (1 = tamanho na base). */
    escala: (t: number) => t,
    meiaLargura: (t: number) => W * larguraBase * t,
  };
};
