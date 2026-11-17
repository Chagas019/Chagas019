// Biblioteca cinematográfica de luz/cor. Dono: agente COR.
// Determinística: só useCurrentFrame + random('seed') + @remotion/noise. Sem blur de tela cheia (tudo radial/conic-gradient).
// Convenção: posições em fração da tela (0..1); intensidades 0..1; `tempo` opcional substitui o frame (para congelar/reusar).
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, interpolateColors, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {luzFe} from './tema';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Converte hex (#RRGGBB) em rgba(). Aceita também strings rgb/rgba já prontas (alpha ignorado nesse caso). */
export const rgba = (cor: string, a: number) => {
  if (!cor.startsWith('#')) return cor;
  const n = cor.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${clamp01(a).toFixed(4)})`;
};

const useTempo = (tempo?: number) => {
  const frame = useCurrentFrame();
  return tempo ?? frame;
};

// ---------------------------------------------------------------------------
// FUNDOS
// ---------------------------------------------------------------------------

export type CeuNoturnoProps = {
  /** Cor do topo (azul). */
  corTopo?: string;
  /** Cor da base (preto). */
  corBase?: string;
  /** Altura (0..1) do brilho de horizonte; null desliga. */
  horizonte?: number | null;
  /** Cor do brilho de horizonte. */
  corHorizonte?: string;
  /** 0..1 intensidade do brilho de horizonte (anime para "amanhecer"). */
  brilhoHorizonte?: number;
  /** Quantidade de estrelas (0 desliga). */
  estrelas?: number;
  /** 0..1 opacidade geral das estrelas. */
  brilhoEstrelas?: number;
  /** 0..1 névoa baixa (blobs radiais com noise). */
  nevoa?: number;
  seed?: string;
  tempo?: number;
};

/** Céu noturno: gradiente azul→preto, horizonte opcional, estrelas cintilantes e névoa baixa. */
export const CeuNoturno: React.FC<CeuNoturnoProps> = ({
  corTopo = luzFe.azulNoite,
  corBase = luzFe.preto,
  horizonte = 0.72,
  corHorizonte = luzFe.azulMedio,
  brilhoHorizonte = 0.35,
  estrelas = 70,
  brilhoEstrelas = 0.6,
  nevoa = 0.4,
  seed = 'ceu',
  tempo,
}) => {
  const t = useTempo(tempo);
  const {width, height} = useVideoConfig();
  const u = Math.min(width, height) / 1080;

  const lista = useMemo(
    () =>
      new Array(estrelas).fill(0).map((_, i) => ({
        x: random(`${seed}-e-x-${i}`),
        // concentradas no alto do céu
        y: random(`${seed}-e-y-${i}`) ** 1.6 * (horizonte ?? 0.9) * 0.95,
        r: 0.8 + random(`${seed}-e-r-${i}`) * 1.8,
        fase: random(`${seed}-e-f-${i}`) * 100,
      })),
    [estrelas, seed, horizonte],
  );

  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${corTopo} 0%, ${interpolateColors(0.5, [0, 1], [corTopo, corBase])} 45%, ${corBase} 100%)`, overflow: 'hidden'}}>
      {horizonte !== null && brilhoHorizonte > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(140% 28% at 50% ${horizonte * 100}%, ${rgba(corHorizonte, 0.9 * brilhoHorizonte)} 0%, ${rgba(corHorizonte, 0.35 * brilhoHorizonte)} 35%, transparent 70%)`,
          }}
        />
      ) : null}
      {lista.map((e, i) => {
        const cint = 0.55 + 0.45 * noise2D(`${seed}-cint`, i * 0.37, (t + e.fase) / 50);
        const s = e.r * u;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: e.x * width - s * 2,
              top: e.y * height - s * 2,
              width: s * 4,
              height: s * 4,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${rgba(luzFe.brancoQuente, 0.95)} 0%, ${rgba(luzFe.altaFria, 0.35)} 30%, transparent 70%)`,
              opacity: clamp01(cint) * brilhoEstrelas,
            }}
          />
        );
      })}
      {nevoa > 0
        ? [0, 1, 2].map((k) => {
            const x = 0.2 + k * 0.3 + noise2D(`${seed}-nv-x-${k}`, t / 600, k) * 0.12;
            const y = (horizonte ?? 0.8) + 0.06 + noise2D(`${seed}-nv-y-${k}`, k, t / 700) * 0.03;
            const w = width * 1.3;
            const h = height * 0.22;
            return (
              <div
                key={`n${k}`}
                style={{
                  position: 'absolute',
                  left: x * width - w / 2,
                  top: y * height - h / 2,
                  width: w,
                  height: h,
                  borderRadius: '50%',
                  background: `radial-gradient(ellipse at center, ${rgba(luzFe.azulSombra, 0.55 * nevoa)} 0%, transparent 70%)`,
                }}
              />
            );
          })
        : null}
    </AbsoluteFill>
  );
};

export type FundoProfundoProps = {
  /** 0..1 — 0 = escuridão fria (azul→preto); 1 = luminoso quente (âmbar/dourado). Anime ao longo do arco. */
  luz?: number;
  /** Centro do "respiro" de luz no fundo (fração da tela). */
  origem?: {x: number; y: number};
  /** Deriva lenta do centro (0 desliga). */
  deriva?: number;
  seed?: string;
  tempo?: number;
};

/** Fundo base do projeto: gradiente radial escuro azul→preto que aquece com `luz`. */
export const FundoProfundo: React.FC<FundoProfundoProps> = ({luz = 0, origem = {x: 0.5, y: 0.38}, deriva = 0.03, seed = 'fundo', tempo}) => {
  const t = useTempo(tempo);
  const l = clamp01(luz);
  const cx = origem.x + noise2D(`${seed}-x`, t / 400, 0) * deriva;
  const cy = origem.y + noise2D(`${seed}-y`, 0, t / 400) * deriva;
  const centro = interpolateColors(l, [0, 0.5, 1], [luzFe.azulNoite, '#24252F', '#4A3318']);
  const meio = interpolateColors(l, [0, 0.5, 1], [luzFe.azulProfundo, '#101219', '#1F150B']);
  const borda = interpolateColors(l, [0, 1], [luzFe.preto, '#0A0705']);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 75% at ${cx * 100}% ${cy * 100}%, ${centro} 0%, ${meio} 45%, ${borda} 100%)`,
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// LUZ VOLUMÉTRICA (god rays)
// ---------------------------------------------------------------------------

export type LuzVolumetricaProps = {
  /** Ponto de origem dos feixes (fração da tela; pode ficar fora: y < 0 = acima do quadro). */
  origem?: {x: number; y: number};
  /** Direção central dos feixes em graus (0 = para cima, 90 = direita, 180 = para baixo). */
  angulo?: number;
  /** Abertura total do leque em graus. */
  abertura?: number;
  /** Número de feixes. */
  feixes?: number;
  /** 0..1 — anime para "acender" a luz. */
  intensidade?: number;
  cor?: string;
  /** Alcance dos feixes em fração da diagonal da tela. */
  alcance?: number;
  /** 0..1 cintilação/respiro dos feixes ao longo do tempo. */
  oscilacao?: number;
  /** Partículas de poeira dentro dos feixes (0 desliga). */
  poeira?: number;
  seed?: string;
  tempo?: number;
};

/**
 * Feixes de luz via conic-gradient com paradas suaves + máscara radial de queda.
 * Uma única camada pintada (barata). Poeira posicionada ao longo dos feixes, brilha com eles.
 */
export const LuzVolumetrica: React.FC<LuzVolumetricaProps> = ({
  origem = {x: 0.5, y: -0.05},
  angulo = 180,
  abertura = 50,
  feixes = 7,
  intensidade = 1,
  cor = luzFe.ambar,
  alcance = 1.1,
  oscilacao = 0.5,
  poeira = 40,
  seed = 'raios',
  tempo,
}) => {
  const t = useTempo(tempo);
  const {width, height} = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const I = clamp01(intensidade);

  const raios = useMemo(
    () =>
      new Array(feixes).fill(0).map((_, i) => {
        const base = feixes === 1 ? 0.5 : i / (feixes - 1);
        const jitter = (random(`${seed}-a-${i}`) - 0.5) * (0.6 / Math.max(1, feixes));
        return {
          rel: base + jitter - 0.5, // -0.5..0.5 dentro da abertura
          largura: 2.2 + random(`${seed}-w-${i}`) * 4.5, // graus
          peso: 0.45 + random(`${seed}-p-${i}`) * 0.55,
        };
      }),
    [feixes, seed],
  );

  if (I <= 0.001) return null;

  // conic-gradient: 0deg = para cima, sentido horário — igual à convenção de `angulo`.
  const inicio = angulo - abertura / 2 - 10;
  const stops: string[] = ['transparent 0deg'];
  const intens = raios.map((r, i) => {
    const osc = 1 - oscilacao * 0.5 * (1 + noise2D(`${seed}-o-${i}`, i * 0.5, t / 90));
    return clamp01(r.peso * osc);
  });
  raios.forEach((r, i) => {
    const centro = 10 + abertura / 2 + r.rel * abertura;
    const a = intens[i] * 0.45 * I;
    stops.push(`transparent ${(centro - r.largura).toFixed(2)}deg`);
    stops.push(`${rgba(cor, a)} ${centro.toFixed(2)}deg`);
    stops.push(`transparent ${(centro + r.largura).toFixed(2)}deg`);
  });
  stops.push(`transparent ${(abertura + 20).toFixed(2)}deg`, 'transparent 360deg');

  const ox = origem.x * 100;
  const oy = origem.y * 100;
  const diag = Math.hypot(width, height);
  const raio = alcance * diag;
  const mask = `radial-gradient(circle ${raio}px at ${ox}% ${oy}%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.75) 25%, rgba(0,0,0,0.25) 65%, transparent 100%)`;

  // Poeira nos feixes
  const graos = new Array(poeira).fill(0).map((_, i) => {
    const k = Math.floor(random(`${seed}-pk-${i}`) * raios.length);
    const r = raios[k];
    const ang = ((angulo + r.rel * abertura + (random(`${seed}-pa-${i}`) - 0.5) * r.largura) * Math.PI) / 180;
    const dist = (0.12 + random(`${seed}-pd-${i}`) * 0.7) * raio * 0.8;
    const dx = noise2D(`${seed}-px-${i}`, t / 160, i) * 30 * u;
    const dy = noise2D(`${seed}-py-${i}`, i, t / 160) * 30 * u - ((t * 0.15 * u) % (60 * u));
    const x = (origem.x * width) + Math.sin(ang) * dist + dx;
    const y = (origem.y * height) - Math.cos(ang) * dist + dy;
    const s = (1.5 + random(`${seed}-ps-${i}`) * 3) * u;
    const queda = 1 - dist / (raio * 0.8);
    const brilho = intens[k] * I * (0.4 + 0.6 * queda) * (0.6 + 0.4 * noise2D(`${seed}-pb-${i}`, t / 40, i));
    return {x, y, s, brilho: clamp01(brilho), i};
  });

  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen'}}>
      <AbsoluteFill
        style={{
          background: `conic-gradient(from ${inicio}deg at ${ox}% ${oy}%, ${stops.join(', ')})`,
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      />
      {/* brilho na origem */}
      <AbsoluteFill style={{background: `radial-gradient(circle ${raio * 0.35}px at ${ox}% ${oy}%, ${rgba(cor, 0.35 * I)} 0%, transparent 100%)`}} />
      {graos.map((g) => (
        <div
          key={g.i}
          style={{
            position: 'absolute',
            left: g.x - g.s * 2,
            top: g.y - g.s * 2,
            width: g.s * 4,
            height: g.s * 4,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${rgba(luzFe.nucleo, 0.9)} 0%, ${rgba(cor, 0.4)} 35%, transparent 70%)`,
            opacity: g.brilho,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// POEIRA DE LUZ (bokeh com profundidade de campo)
// ---------------------------------------------------------------------------

export type PoeiraDeLuzProps = {
  /** Partículas por camada [longe, meio, perto]. */
  quantidade?: [number, number, number];
  cor?: string;
  /** 0..1 opacidade geral (anime no arco de luz). */
  intensidade?: number;
  /** Camada em foco: 0 = longe, 1 = meio, 2 = perto. As outras ficam desfocadas (bokeh). */
  foco?: number;
  /** Velocidade de subida (px por frame em 1080p, camada do meio). */
  velocidade?: number;
  /** Deslocamento de câmera (px) para paralaxe; perto move mais. */
  camera?: {x: number; y: number};
  /** Limita a área vertical (fração) onde as partículas aparecem. */
  faixa?: [number, number];
  seed?: string;
  tempo?: number;
};

const CAMADAS = [
  {tam: [2, 5], par: 0.25, vel: 0.5},
  {tam: [5, 12], par: 0.6, vel: 1},
  {tam: [18, 46], par: 1.2, vel: 1.6},
];

/** Bokeh determinístico: 3 camadas; desfoque simulado pela suavidade do radial-gradient (sem filter: blur). */
export const PoeiraDeLuz: React.FC<PoeiraDeLuzProps> = ({
  quantidade = [40, 22, 7],
  cor = luzFe.douradoClaro,
  intensidade = 0.8,
  foco = 1,
  velocidade = 0.35,
  camera = {x: 0, y: 0},
  faixa = [0, 1],
  seed = 'poeira',
  tempo,
}) => {
  const t = useTempo(tempo);
  const {width, height} = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const I = clamp01(intensidade);
  if (I <= 0.001) return null;
  const alturaFaixa = (faixa[1] - faixa[0]) * height;

  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen', overflow: 'hidden'}}>
      {CAMADAS.map((c, ci) => {
        const desfoque = clamp01(Math.abs(ci - foco) / 2); // 0 nítido .. 1 muito desfocado
        const nucleo = interpolate(desfoque, [0, 1], [18, 2]); // % de núcleo sólido
        const anel = interpolate(desfoque, [0, 1], [42, 62]);
        const alfaCamada = interpolate(desfoque, [0, 1], [0.9, 0.35]) * (ci === 0 ? 0.7 : 1);
        return new Array(quantidade[ci]).fill(0).map((_, i) => {
          const id = `${seed}-${ci}-${i}`;
          const s = (c.tam[0] + random(`${id}-s`) * (c.tam[1] - c.tam[0])) * u * (1 + desfoque * 0.6);
          const x0 = random(`${id}-x`) * width;
          const y0 = random(`${id}-y`) * alturaFaixa;
          const sobe = (t * velocidade * c.vel * u) % (alturaFaixa + s * 2);
          const x = ((x0 + noise2D(`${id}-dx`, t / 220, i) * 40 * u + camera.x * c.par) % width + width) % width;
          const yRel = ((y0 - sobe) % (alturaFaixa + s * 2) + alturaFaixa + s * 2) % (alturaFaixa + s * 2) - s;
          const y = faixa[0] * height + yRel + camera.y * c.par;
          const pisca = 0.65 + 0.35 * noise2D(`${id}-b`, t / 70, i);
          // fade nas bordas da faixa
          const borda = Math.min(1, yRel / (alturaFaixa * 0.15 + 1), (alturaFaixa - yRel) / (alturaFaixa * 0.15 + 1));
          return (
            <div
              key={id}
              style={{
                position: 'absolute',
                left: x - s / 2,
                top: y - s / 2,
                width: s,
                height: s,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${rgba(cor, 0.95)} 0%, ${rgba(cor, 0.85)} ${nucleo}%, ${rgba(cor, 0.25)} ${anel}%, transparent 71%)`,
                opacity: clamp01(alfaCamada * pisca * I * clamp01(borda)),
              }}
            />
          );
        });
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// COLOR GRADING
// ---------------------------------------------------------------------------

export type GradacaoCorProps = {
  /** 0 = frio/escuro (sombras azuis, altas frias, mais denso); 1 = quente/esperança (sombras quentes suaves, altas âmbar). */
  mistura?: number;
  /** 0..1 força geral do grading. */
  forca?: number;
  /** Origem da luz quente (fração da tela) — reforço radial em `screen` quando mistura > 0. */
  origemLuz?: {x: number; y: number};
};

/**
 * Overlay de grading. Coloque por CIMA do fundo + luzes e ABAIXO da tipografia (preserva o branco quente do texto);
 * Grão e Vinheta vão por último, acima de tudo.
 * - `lighten` com cor escura: tinge apenas as sombras (pixels mais escuros que a cor).
 * - `multiply` com cor quase branca: tinge apenas as altas.
 * - `soft-light`: temperatura geral.
 */
export const GradacaoCor: React.FC<GradacaoCorProps> = ({mistura = 0, forca = 0.85, origemLuz = {x: 0.5, y: 0.3}}) => {
  const m = clamp01(mistura);
  const f = clamp01(forca);
  const sombra = interpolateColors(m, [0, 1], [luzFe.azulSombra, luzFe.sombraQuente]);
  const alta = interpolateColors(m, [0, 1], [luzFe.altaFria, luzFe.altaQuente]);
  const temperatura = interpolateColors(m, [0, 0.5, 1], ['#1B3358', '#4A4038', '#A8763A']);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: sombra, mixBlendMode: 'lighten', opacity: f * interpolate(m, [0, 1], [0.45, 0.35])}} />
      <AbsoluteFill style={{background: alta, mixBlendMode: 'multiply', opacity: f * 0.6}} />
      <AbsoluteFill style={{background: temperatura, mixBlendMode: 'soft-light', opacity: f * 0.3}} />
      {m > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(90% 60% at ${origemLuz.x * 100}% ${origemLuz.y * 100}%, ${rgba(luzFe.ambar, 0.12 * m * f)} 0%, transparent 70%)`,
            mixBlendMode: 'screen',
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// HALAÇÃO / FONTE DE LUZ
// ---------------------------------------------------------------------------

export type HalacaoProps = {
  /** Centro em fração da tela. */
  x: number;
  y: number;
  /** Raio do halo principal em px (já em 1080p; escala por unidade). */
  raio?: number;
  cor?: string;
  /** Cor do núcleo. */
  corNucleo?: string;
  /** 0..1 */
  intensidade?: number;
  /** Faixa anamórfica horizontal (0 desliga, 1 = forte). */
  anamorfico?: number;
};

/** Glow em camadas (núcleo, halo, halação larga, faixa anamórfica) — só radial-gradients, blend `screen`. */
export const Halacao: React.FC<HalacaoProps> = ({x, y, raio = 120, cor = luzFe.ambar, corNucleo = luzFe.nucleo, intensidade = 1, anamorfico = 0.4}) => {
  const {width, height} = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const I = clamp01(intensidade);
  if (I <= 0.001) return null;
  const R = raio * u;
  const cx = x * width;
  const cy = y * height;
  const camada = (r: number, bg: string, extra: React.CSSProperties = {}) => (
    <div style={{position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%', background: bg, ...extra}} />
  );
  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen'}}>
      {camada(R * 4, `radial-gradient(circle, ${rgba(cor, 0.22 * I)} 0%, ${rgba(cor, 0.08 * I)} 40%, transparent 70%)`)}
      {camada(R, `radial-gradient(circle, ${rgba(cor, 0.75 * I)} 0%, ${rgba(cor, 0.3 * I)} 35%, transparent 70%)`)}
      {camada(R * 0.28, `radial-gradient(circle, ${rgba(corNucleo, I)} 0%, ${rgba(corNucleo, 0.85 * I)} 30%, transparent 70%)`)}
      {anamorfico > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: cx - R * 6,
            top: cy - R * 0.08,
            width: R * 12,
            height: R * 0.16,
            borderRadius: '50%',
            background: `radial-gradient(ellipse at center, ${rgba(corNucleo, 0.55 * I * anamorfico)} 0%, ${rgba(cor, 0.25 * I * anamorfico)} 30%, transparent 70%)`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

export type FonteDeLuzProps = {
  x?: number;
  y?: number;
  /** 0..1 — crescimento da luz (cena 1: de um ponto a uma presença). */
  progresso: number;
  /** Raio (px @1080) no início e no fim do progresso. */
  raioInicial?: number;
  raioFinal?: number;
  cor?: string;
  /** 0..1 amplitude do pulso (respiração). */
  pulso?: number;
  /** Período do pulso em frames (60 fps → 150 = 2.5 s, ritmo de respiração calma). */
  periodo?: number;
  anamorfico?: number;
  seed?: string;
  tempo?: number;
};

/** Pequena luz pulsante que cresce com `progresso`. Usa Halacao internamente. */
export const FonteDeLuz: React.FC<FonteDeLuzProps> = ({
  x = 0.5,
  y = 0.5,
  progresso,
  raioInicial = 6,
  raioFinal = 220,
  cor = luzFe.ambar,
  pulso = 0.25,
  periodo = 150,
  anamorfico = 0.35,
  seed = 'fonte',
  tempo,
}) => {
  const t = useTempo(tempo);
  const p = clamp01(progresso);
  // easing de "inspiração": começa lento
  const pe = p * p * (3 - 2 * p);
  const resp = Math.sin((t / periodo) * Math.PI * 2) * 0.5 + 0.5;
  const tremor = noise2D(`${seed}-tr`, t / 30, 0) * 0.08;
  const fator = 1 + pulso * (resp - 0.5) + tremor * pulso;
  const raio = interpolate(pe, [0, 1], [raioInicial, raioFinal]) * fator;
  const intensidade = clamp01(interpolate(p, [0, 0.08, 1], [0, 0.75, 1]) * (0.85 + 0.15 * resp));
  return <Halacao x={x} y={y} raio={raio} cor={cor} intensidade={intensidade} anamorfico={anamorfico * pe} />;
};
