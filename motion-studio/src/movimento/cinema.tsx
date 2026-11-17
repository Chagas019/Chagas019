// Movimento cinematográfico (contemplação → impacto). Dono: agente MOVIMENTO.
// Transições para @remotion/transitions, câmera com profundidade de campo e helpers de batida.
// 100% determinístico: tudo é função de frame/progresso; aleatoriedade só via @remotion/noise com seed.
import React, {createContext, useContext} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {linearTiming, type TransitionPresentation, type TransitionPresentationComponentProps, type TransitionTiming} from '@remotion/transitions';
import {noise2D} from '@remotion/noise';
import {curvas} from './curvas';
import {unidade} from '../config/formatos';

// ───────────────────────── utilidades internas ─────────────────────────
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const faixa = (p: number, a: number, b: number, de: number, ate: number, easing: (t: number) => number = curvas.suave) =>
  interpolate(p, [a, b], [de, ate], {...clamp, easing});
/** Sino 0→1→0 com pico em `pico` (0..1). */
const sino = (p: number, pico = 0.5) => (p <= pico ? curvas.suave(p / pico) : curvas.suave(1 - (p - pico) / (1 - pico)));
const filtro = (partes: Array<string | false>) => partes.filter(Boolean).join(' ') || undefined;
const px = (v: number) => (v < 0.05 ? false : `blur(${v.toFixed(2)}px)`);

export const CORES_LUZ = {
  ambar: '255, 176, 92',
  quente: '255, 236, 205',
  dourado: '232, 196, 120',
  branco: '255, 250, 242',
} as const;
type CorLuz = keyof typeof CORES_LUZ;

// ═════════════════════════ 1. TRANSIÇÕES ═════════════════════════
// Contrato de todas as apresentações: identidade em p=0 (exiting) e p=1 (entering), pois o TransitionSeries
// mantém os wrappers montados durante a cena inteira com o progresso travado.

// ── vazamentoDeLuz ──────────────────────────────────────────────
export type VazamentoProps = {
  /** cor dominante do vazamento (núcleo é sempre branco quente) */
  cor?: CorLuz;
  /** 0..1.2 — quanto a imagem estoura no pico */
  intensidade?: number;
  /** origem do vazamento em % da tela */
  origem?: {x: number; y: number};
  /** ponto do pico do flash no progresso (0..1) */
  pico?: number;
  seed?: string;
};

const Vazamento: React.FC<TransitionPresentationComponentProps<VazamentoProps>> = ({children, presentationDirection, presentationProgress: p, passedProps}) => {
  const {cor = 'ambar', intensidade = 1, origem = {x: 72, y: 28}, pico = 0.46, seed = 'vazamento'} = passedProps;
  const tremor = noise2D(seed, p * 4, 0.5) * 0.06; // cintilação orgânica do vazamento
  const flash = Math.min(1, sino(p, pico) * (1 + tremor));
  const k = Math.min(1, intensidade);

  if (presentationDirection === 'exiting') {
    // a cena atual "aquece": brilho moderado (+0,8 no pico) + bloom leve + micro dolly-in. Nunca estoura em chapado.
    const brilho = 1 + faixa(p, 0, pico, 0, 0.8 * intensidade);
    const bloom = faixa(p, 0.15, pico, 0, 5);
    const escala = 1 + faixa(p, 0, pico, 0, 0.02);
    return (
      <AbsoluteFill style={{transform: `scale(${escala})`, filter: filtro([`brightness(${brilho.toFixed(3)})`, `saturate(${(1 - flash * 0.15).toFixed(3)})`, px(bloom)])}}>
        {children}
      </AbsoluteFill>
    );
  }
  // entrando (fica por cima): cross-fade largo em torno do pico — no ápice as DUAS cenas aparecem sob a luz.
  const opac = faixa(p, pico - 0.22, pico + 0.24, 0, 1);
  const brilho = 1 + faixa(p, pico - 0.22, 1, 0.7 * intensidade, 0, curvas.entrada);
  const bloom = faixa(p, pico - 0.22, 0.95, 5, 0, curvas.entrada);
  const escala = 1 + faixa(p, pico - 0.22, 1, 0.025, 0, curvas.entrada);
  const c = CORES_LUZ[cor];
  const d = CORES_LUZ.dourado;
  const n = CORES_LUZ.quente;
  // varredura lateral do leak (da esquerda para a direita, passando pela origem no pico)
  const varre = interpolate(p, [0, pico, 1], [-35, 0, 35], clamp);
  const ox = origem.x;
  const oy = origem.y;
  // manchas de película: posições/raios guiados por noise com seed (textura, não cor chapada)
  const manchas = [0, 1, 2, 3].map((i) => {
    const mx = ox + varre * (0.6 + i * 0.25) + noise2D(`${seed}-mx${i}`, p * 1.3, i) * 22;
    const my = oy + (i - 1.5) * 9 + noise2D(`${seed}-my${i}`, p * 1.1, i + 4) * 10;
    const r = 16 + i * 7 + noise2D(`${seed}-mr${i}`, p * 2, i + 9) * 5;
    const tom = [n, c, d, c][i];
    const a = 0.55 - i * 0.08;
    return `radial-gradient(ellipse ${r}% ${r * 0.62}% at ${mx.toFixed(2)}% ${my.toFixed(2)}%, rgba(${tom},${a}) 0%, rgba(${tom},${(a * 0.35).toFixed(3)}) 45%, rgba(${tom},0) 100%)`;
  });
  const camadas = [
    // núcleo quente pequeno na origem (a fonte de luz)
    `radial-gradient(ellipse 26% 16% at ${ox}% ${oy}%, rgba(${n},0.85) 0%, rgba(${n},0.35) 40%, rgba(${c},0) 100%)`,
    // streak anamórfico horizontal que atravessa a fonte
    `radial-gradient(ellipse 85% 3.5% at ${(ox + varre * 0.4).toFixed(2)}% ${oy}%, rgba(${n},0.6) 0%, rgba(${c},0.18) 50%, rgba(${c},0) 100%)`,
    ...manchas,
    // véu diagonal suave (vazamento lateral), opacidade baixa
    `linear-gradient(${(105 + varre * 0.3).toFixed(2)}deg, rgba(${c},0) 25%, rgba(${c},0.28) ${(50 + varre * 0.5).toFixed(2)}%, rgba(${c},0) 78%)`,
  ];
  // queda nas bordas: a luz nunca chega chapada aos cantos da tela
  const queda = `radial-gradient(ellipse 85% 70% at ${ox}% ${oy}%, #000 35%, rgba(0,0,0,0.35) 75%, transparent 100%)`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: opac, transform: `scale(${escala})`, filter: filtro([`brightness(${brilho.toFixed(3)})`, px(bloom)])}}>{children}</AbsoluteFill>
      {flash > 0.001 ? (
        <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen', opacity: flash * k, background: camadas.join(','), WebkitMaskImage: queda, maskImage: queda}} />
      ) : null}
    </AbsoluteFill>
  );
};

export const vazamentoDeLuz = (props: VazamentoProps = {}): TransitionPresentation<VazamentoProps> => ({component: Vazamento, props});
/** Recomendado 30–48 frames (0,5–0,8 s). Projeto: 30 f. */
export const tempoVazamento = (frames = 30): TransitionTiming => linearTiming({durationInFrames: frames, easing: curvas.suave});

// ── revelacaoDeLuz ──────────────────────────────────────────────
export type RevelacaoProps = {
  /** 'fenda' = feixe linear que se abre; 'radial' = abertura circular a partir de um ponto */
  forma?: 'fenda' | 'radial';
  /** ângulo da fenda em graus (90 = fenda vertical se abrindo para os lados; 0 = horizontal) */
  angulo?: number;
  /** centro (radial) ou eixo (fenda) em % */
  centro?: {x: number; y: number};
  /** suavidade da borda da máscara em % */
  suavidade?: number;
  cor?: CorLuz;
  /** brilho do feixe nas bordas (0..1) */
  brilhoBorda?: number;
};

const Revelacao: React.FC<TransitionPresentationComponentProps<RevelacaoProps>> = ({children, presentationDirection, presentationProgress: p, passedProps}) => {
  const {forma = 'fenda', angulo = 90, centro = {x: 50, y: 50}, suavidade = 14, cor = 'quente', brilhoBorda = 0.85} = passedProps;
  const c = CORES_LUZ[cor];
  const a = CORES_LUZ.ambar;

  if (presentationDirection === 'exiting') {
    // a cena antiga recua levemente e é "lavada" pela luz que a atravessa
    const escala = 1 + interpolate(p, [0, 1], [0, 0.035], {...clamp, easing: curvas.suave});
    const brilho = 1 + sino(p, 0.4) * 0.35;
    return <AbsoluteFill style={{transform: `scale(${escala})`, filter: `brightness(${brilho.toFixed(3)})`}}>{children}</AbsoluteFill>;
  }

  // abertura 0 → além da tela. Começa devagar (fenda fina), abre com elegância.
  const abre = interpolate(p, [0, 1], [0, 1], {...clamp, easing: Easing3});
  const s = suavidade;
  let mascara: string;
  let feixe: string;
  if (forma === 'radial') {
    const r = abre * 130; // % do raio (ultrapassa os cantos em 9:16)
    mascara = `radial-gradient(circle at ${centro.x}% ${centro.y}%, #000 ${Math.max(0, r - s)}%, transparent ${r}%)`;
    feixe = `radial-gradient(circle at ${centro.x}% ${centro.y}%, rgba(${c},0) ${Math.max(0, r - s * 1.4)}%, rgba(${c},0.9) ${Math.max(0, r - s * 0.5)}%, rgba(${a},0) ${r + s * 0.6}%)`;
  } else {
    const w = abre * 62; // meia-largura da fenda em %
    const e = centro.x; // eixo
    mascara = `linear-gradient(${angulo}deg, transparent ${e - w - s}%, #000 ${e - w}%, #000 ${e + w}%, transparent ${e + w + s}%)`;
    feixe = `linear-gradient(${angulo}deg, rgba(${a},0) ${e - w - s * 1.6}%, rgba(${c},0.95) ${e - w - s * 0.2}%, rgba(${c},0.25) ${e}%, rgba(${c},0.95) ${e + w + s * 0.2}%, rgba(${a},0) ${e + w + s * 1.6}%)`;
  }
  const brilhoFeixe = brilhoBorda * faixa(p, 0, 0.12, 0, 1) * faixa(p, 0.6, 1, 1, 0);
  const escala = 1 + faixa(p, 0, 1, 0.04, 0, curvas.entrada);
  const brilhoCena = 1 + faixa(p, 0, 0.9, 0.5, 0, curvas.entrada);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{WebkitMaskImage: p >= 1 ? undefined : mascara, maskImage: p >= 1 ? undefined : mascara, transform: `scale(${escala})`, filter: `brightness(${brilhoCena.toFixed(3)})`}}>
        {children}
      </AbsoluteFill>
      {/* o feixe de luz que "rasga" a cena acompanhando a borda da máscara */}
      <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen', opacity: brilhoFeixe, background: feixe}} />
    </AbsoluteFill>
  );
};
// abre lento → acelera → assenta (cubic-ish in-out, mais longo no começo para "a luz pedir passagem")
const Easing3 = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const revelacaoDeLuz = (props: RevelacaoProps = {}): TransitionPresentation<RevelacaoProps> => ({component: Revelacao, props});
/** Recomendado 40–72 frames (0,7–1,2 s). Projeto: 40 f. */
export const tempoRevelacao = (frames = 40): TransitionTiming => linearTiming({durationInFrames: frames, easing: curvas.linear});

// ── dissolveFoco ────────────────────────────────────────────────
export type DissolveFocoProps = {
  /** desfoque máximo em px (base 1080). Teto 20 por performance. */
  desfoque?: number;
  /** variação de escala total (ex. 0.04 = 4%) */
  escala?: number;
  /** deslocamento vertical total em px (base 1080): >0 = as cenas sobem (a nova vem de baixo). */
  subida?: number;
  /** 'cruzado' = as duas cenas se fundem; 'rack' = o foco sai da atual e só depois "puxa" a próxima (rack focus). */
  modo?: 'cruzado' | 'rack';
};

const DissolveFoco: React.FC<TransitionPresentationComponentProps<DissolveFocoProps>> = ({children, presentationDirection, presentationProgress: p, passedProps}) => {
  const {width, height} = useVideoConfig();
  const u = unidade(width, height);
  const {desfoque = 16, escala = 0.04, subida = 0, modo = 'cruzado'} = passedProps;
  const max = Math.min(desfoque, 20) * u;
  const rack = modo === 'rack';
  if (presentationDirection === 'exiting') {
    // a cena perde o foco e "avança" levemente (rack focus para fora)
    const b = rack ? faixa(p, 0, 0.5, 0, max, curvas.saida) : faixa(p, 0, 0.7, 0, max, curvas.saida);
    const s = 1 + faixa(p, 0, 1, 0, escala * 0.5);
    const o = rack ? faixa(p, 0.42, 0.72, 1, 0) : faixa(p, 0.35, 1, 1, 0);
    const y = -faixa(p, 0, 1, 0, subida * 0.5, curvas.saida) * u;
    return <AbsoluteFill style={{opacity: o, transform: `translateY(${y.toFixed(2)}px) scale(${s})`, filter: filtro([px(b)])}}>{children}</AbsoluteFill>;
  }
  // a próxima chega fora de foco e "assenta" (foco puxado para ela)
  const b = rack ? faixa(p, 0.45, 1, max, 0, curvas.entrada) : faixa(p, 0.3, 1, max, 0, curvas.entrada);
  const s = 1 + faixa(p, 0, 1, escala * 0.5, 0, curvas.entrada);
  const o = rack ? faixa(p, 0.3, 0.6, 0, 1) : faixa(p, 0, 0.65, 0, 1);
  const y = faixa(p, 0, 1, subida * 0.5, 0, curvas.entrada) * u;
  return <AbsoluteFill style={{opacity: o, transform: `translateY(${y.toFixed(2)}px) scale(${s})`, filter: filtro([px(b)])}}>{children}</AbsoluteFill>;
};

export const dissolveFoco = (props: DissolveFocoProps = {}): TransitionPresentation<DissolveFocoProps> => ({component: DissolveFoco, props});
/** Recomendado 30–60 frames (0,5–1 s). Projeto: 30 f. */
export const tempoDissolveFoco = (frames = 30): TransitionTiming => linearTiming({durationInFrames: frames, easing: curvas.linear});

// ── fadeNegro ───────────────────────────────────────────────────
export type FadeNegroProps = {
  /** fração do tempo em preto absoluto no meio (respiro) */
  respiro?: number;
  cor?: string;
};

const FadeNegro: React.FC<TransitionPresentationComponentProps<FadeNegroProps>> = ({children, presentationDirection, presentationProgress: p, passedProps}) => {
  const {respiro = 0.25, cor = '#030304'} = passedProps;
  const meio = (1 - respiro) / 2;
  if (presentationDirection === 'exiting') {
    // descida GRADUAL: a luz se recolhe para o centro (vinheta fechando, curva suave desde o 1º frame)
    // e um véu uniforme acompanha, chegando a preto absoluto só em p = meio. Afunda 1,5%.
    const v = faixa(p, 0, meio, 0, 1, curvas.suave);
    const veu = faixa(p, 0, meio, 0, 1, curvas.linear);
    const s = 1 - faixa(p, 0, meio, 0, 0.015);
    // IMPORTANTE: o TransitionSeries renderiza este wrapper durante TODA a cena (progresso 0 antes da transição),
    // então ele precisa ser transparente/identidade em p=0 — nada de fundo opaco (cobriria a cena anterior).
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{transform: `scale(${s})`}}>{children}</AbsoluteFill>
        {v > 0 ? <AbsoluteFill style={{background: vinhetaFechando(v, cor), opacity: Math.min(1, v * 2)}} /> : null}
        {veu > 0 ? <AbsoluteFill style={{backgroundColor: cor, opacity: veu}} /> : null}
      </AbsoluteFill>
    );
  }
  // emerge do preto pelo centro (máscara abrindo) com ease-out.
  // A cena que entra fica POR CIMA: nada de camada opaca aqui (cobriria a descida da cena anterior);
  // usa-se só opacidade + máscara (transparência), então por baixo continua valendo o escurecimento do exiting.
  const v = faixa(p, 1 - meio, 1, 1, 0, curvas.entrada);
  const o = faixa(p, 1 - meio, 1, 0, 1, Easing2Out);
  const s = 1 + faixa(p, 1 - meio, 1, 0.015, 0, curvas.entrada);
  const interno = 70 * (1 - v);
  const externo = interno + 55 - 25 * v;
  const mascara = `radial-gradient(ellipse 75% 60% at 50% 46%, #000 ${interno.toFixed(2)}%, rgba(0,0,0,${(1 - v).toFixed(3)}) ${externo.toFixed(2)}%)`;
  return (
    <AbsoluteFill style={{opacity: o, transform: `scale(${s})`, WebkitMaskImage: v > 0 ? mascara : undefined, maskImage: v > 0 ? mascara : undefined}}>
      {children}
    </AbsoluteFill>
  );
};

const Easing2Out = (t: number) => 1 - (1 - t) * (1 - t);
/** Vinheta que fecha para o centro: v=0 nada, v=1 só um resto de luz no miolo. */
const vinhetaFechando = (v: number, cor: string) => {
  const interno = 70 * (1 - v); // raio limpo
  const externo = interno + 55 - 25 * v;
  return `radial-gradient(ellipse 75% 60% at 50% 46%, rgba(0,0,0,0) ${interno.toFixed(2)}%, ${cor} ${externo.toFixed(2)}%)`;
};

export const fadeNegro = (props: FadeNegroProps = {}): TransitionPresentation<FadeNegroProps> => ({component: FadeNegro, props});
/** Recomendado 40–90 frames. Projeto: 40 f (use respiro 0.2 → ~8 f de preto). */
export const tempoFadeNegro = (frames = 40): TransitionTiming => linearTiming({durationInFrames: frames, easing: curvas.linear});

/**
 * Saída final para o preto (sem cena seguinte — use no fim da composição, fora do TransitionSeries).
 * Escurece de `inicio` por `duracao` frames com ease-in-out e leve afundamento.
 */
export const SaidaParaNegro: React.FC<{inicio: number; duracao?: number; cor?: string; children: React.ReactNode}> = ({inicio, duracao = 90, cor = '#030304', children}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [inicio, inicio + duracao], [1, 0], {...clamp, easing: curvas.suave});
  const s = 1 - interpolate(frame, [inicio, inicio + duracao], [0, 0.015], {...clamp, easing: curvas.suave});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `scale(${s})`}}>{children}</AbsoluteFill>
      {o < 1 ? <AbsoluteFill style={{backgroundColor: cor, opacity: 1 - o}} /> : null}
    </AbsoluteFill>
  );
};

// ═════════════════════════ 2. CÂMERA CINEMA ═════════════════════════

export type ChaveCinema = {
  frame: number;
  /** dolly: 1 = neutro. Mantenha a variação ≤ 10% por cena. */
  zoom?: number;
  /** pan (px base 1080, positivo = câmera vai para a direita) */
  x?: number;
  /** tilt (px base 1080, positivo = câmera desce) */
  y?: number;
  /** roll em graus (mínimo: ±0,6°) */
  rot?: number;
  /** profundidade do plano focal (0 fundo … 1 plano médio … 2 primeiro plano) */
  foco?: number;
};

export type Mao = {
  /** amplitude da translação em px (base 1080). Padrão 2,5 — quase imperceptível. */
  amplitude?: number;
  /** amplitude do roll em graus. Padrão 0,12°. */
  rotacao?: number;
  /** ciclos por segundo do ruído. Padrão 0,22. */
  velocidade?: number;
  seed?: string;
};

type EstadoCinema = {zoom: number; x: number; y: number; rot: number; foco: number; abertura: number; desfoqueMax: number; u: number};
const CtxCinema = createContext<EstadoCinema>({zoom: 1, x: 0, y: 0, rot: 0, foco: 1, abertura: 9, desfoqueMax: 14, u: 1});

const valorChave = (frame: number, chaves: ChaveCinema[], k: Exclude<keyof ChaveCinema, 'frame'>, pad: number, easing: (t: number) => number) => {
  const pts = chaves.filter((c) => c[k] !== undefined).sort((a, b) => a.frame - b.frame);
  if (pts.length === 0) return pad;
  if (pts.length === 1) return pts[0][k] as number;
  return interpolate(frame, pts.map((q) => q.frame), pts.map((q) => q[k] as number), {...clamp, easing});
};

/** Leitura do estado da câmera (para elementos que querem reagir a ela, ex.: texto acompanhando a câmera). */
export const useCameraCinema = () => useContext(CtxCinema);

/**
 * Câmera cinematográfica: dolly/pan/tilt/roll por chaves (easing suave), câmera na mão via noise
 * e profundidade de campo para os filhos <PlanoDeFoco>.
 * Frames das chaves são relativos à Sequence da cena.
 */
export const CameraCinema: React.FC<{
  chaves?: ChaveCinema[];
  /** micro-movimento de câmera na mão; `false` desliga */
  mao?: Mao | false;
  /** px de desfoque por unidade de distância ao plano focal (base 1080). Padrão 9. */
  abertura?: number;
  /** teto de desfoque por camada (px base 1080). Padrão 14 (performance: nunca > 30). */
  desfoqueMax?: number;
  /** easing entre chaves. Padrão curvas.suave (contemplativo). */
  easing?: (t: number) => number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({chaves = [], mao = {}, abertura = 9, desfoqueMax = 14, easing = curvas.suave, style, children}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const u = unidade(width, height);
  const e: EstadoCinema = {
    zoom: valorChave(frame, chaves, 'zoom', 1, easing),
    x: valorChave(frame, chaves, 'x', 0, easing),
    y: valorChave(frame, chaves, 'y', 0, easing),
    rot: valorChave(frame, chaves, 'rot', 0, easing),
    foco: valorChave(frame, chaves, 'foco', 1, easing),
    abertura,
    desfoqueMax: Math.min(desfoqueMax, 30),
    u,
  };
  let hx = 0;
  let hy = 0;
  let hr = 0;
  if (mao) {
    const {amplitude = 2.5, rotacao = 0.12, velocidade = 0.22, seed = 'mao'} = mao;
    const t = (frame / fps) * velocidade;
    // duas oitavas de ruído: deriva lenta + micro-tremor
    hx = (noise2D(`${seed}-x`, t, 0) + 0.35 * noise2D(`${seed}-x2`, t * 3.1, 7)) * amplitude * u;
    hy = (noise2D(`${seed}-y`, t, 3) + 0.35 * noise2D(`${seed}-y2`, t * 2.7, 11)) * amplitude * u;
    hr = noise2D(`${seed}-r`, t * 0.8, 5) * rotacao;
  }
  return (
    <CtxCinema.Provider value={e}>
      <AbsoluteFill style={{overflow: 'hidden', ...style}}>
        <AbsoluteFill style={{transform: `translate(${hx.toFixed(2)}px, ${hy.toFixed(2)}px) rotate(${(e.rot + hr).toFixed(3)}deg)`, transformOrigin: '50% 50%'}}>
          {children}
        </AbsoluteFill>
      </AbsoluteFill>
    </CtxCinema.Provider>
  );
};

/**
 * Plano de profundidade dentro de <CameraCinema>.
 * profundidade: 0 = infinito (céu/fundo, não se move), 1 = plano médio (move com a câmera), 2 = primeiro plano (parallax dobrado).
 * Desfoque = |profundidade − foco| × abertura (limitado a desfoqueMax). Use 2–4 planos por cena.
 */
export const PlanoDeFoco: React.FC<{
  profundidade: number;
  /** ignora a profundidade de campo (ex.: tipografia que deve ficar sempre nítida) */
  semDesfoque?: boolean;
  /** desfoque mínimo extra (atmosfera) */
  desfoqueBase?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({profundidade, semDesfoque = false, desfoqueBase = 0, style, children}) => {
  const {x, y, zoom, foco, abertura, desfoqueMax, u} = useContext(CtxCinema);
  const d = profundidade;
  // dolly: objetos próximos crescem mais que os distantes
  const escala = 1 + (zoom - 1) * d;
  const b = semDesfoque ? 0 : Math.min(desfoqueMax, Math.abs(d - foco) * abertura + desfoqueBase) * u;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${(-x * d * u).toFixed(2)}px, ${(-y * d * u).toFixed(2)}px) scale(${escala.toFixed(4)})`,
        transformOrigin: '50% 50%',
        filter: filtro([px(b)]),
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Gera chaves de rack focus: foco vai de `de` para `ate` entre `inicio` e `inicio+duracao`. */
export const rackFocus = (inicio: number, duracao: number, de: number, ate: number): ChaveCinema[] => [
  {frame: inicio, foco: de},
  {frame: inicio + duracao, foco: ate},
];

/** Gera chaves de dolly lento (in: zoomFinal > 1; out: < 1) ao longo da cena. */
export const dolly = (inicio: number, fim: number, zoomInicial = 1, zoomFinal = 1.06): ChaveCinema[] => [
  {frame: inicio, zoom: zoomInicial},
  {frame: fim, zoom: zoomFinal},
];

// ═════════════════════════ 3. HELPERS ═════════════════════════

/** Escala sutil contínua (respiração). Começa exatamente em 1 no frame `fase`. */
export const respirar = (frame: number, {amplitude = 0.012, periodo = 300, fase = 0}: {amplitude?: number; periodo?: number; fase?: number} = {}) =>
  1 + amplitude * (0.5 - 0.5 * Math.cos(((frame - fase) / periodo) * Math.PI * 2));

export type OpcoesImpacto = {
  /** acréscimo de escala no pico (0.08 = +8%). Mantenha ≤ 0.15. */
  pico?: number;
  /** frames até o pico (ataque curto e preciso) */
  ataque?: number;
  /** frames para assentar de volta */
  decaimento?: number;
  /** recuo antes da batida (antecipação), em fração de escala */
  antecipacao?: number;
  /** frames de antecipação antes da batida */
  framesAntecipacao?: number;
  /** escala de repouso após cada batida acumula (ex.: 0.03 → cada "confie" deixa o texto 3% maior) */
  degrau?: number;
};

/**
 * Punch de escala nas batidas (frames relativos à Sequence). Ideal para "CONFIE.":
 * recuo mínimo → estalo em `ataque` frames (expo out) → assenta em `decaimento` frames.
 * Batidas: use msParaFrame(palavra.startMs) − inicioDaCena.
 */
export const impactoEscala = (frame: number, batidas: number[], o: OpcoesImpacto = {}) => {
  const {pico = 0.08, ataque = 3, decaimento = 24, antecipacao = 0.015, framesAntecipacao = 6, degrau = 0} = o;
  let s = 1;
  for (const b of batidas) {
    const pre = frame >= b - framesAntecipacao && frame < b ? -antecipacao * curvas.suave((frame - (b - framesAntecipacao)) / framesAntecipacao) : 0;
    let golpe = 0;
    if (frame >= b && frame < b + ataque) golpe = interpolate(frame, [b, b + ataque], [-antecipacao, pico], {...clamp, easing: curvas.entrada});
    else if (frame >= b + ataque) golpe = interpolate(frame, [b + ataque, b + ataque + decaimento], [pico, 0], {...clamp, easing: Easing3Out});
    if (frame >= b) s += degrau;
    s += pre + golpe;
  }
  return s;
};
const Easing3Out = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Trepidação mínima pós-impacto (decai em `duracao` frames). Retorna deslocamento em px (base 1080) e roll.
 * Some com `transform: translate(x,y) rotate(rot)` — multiplique por unidade() se fora da CameraCinema.
 */
export const trepidacao = (
  frame: number,
  batidas: number[],
  {amplitude = 5, rotacao = 0.25, duracao = 12, seed = 'trepida'}: {amplitude?: number; rotacao?: number; duracao?: number; seed?: string} = {},
) => {
  let x = 0;
  let y = 0;
  let rot = 0;
  for (const b of batidas) {
    const t = frame - b;
    if (t < 0 || t > duracao) continue;
    const env = Math.pow(1 - t / duracao, 2);
    x += noise2D(`${seed}-x-${b}`, t * 0.45, 0) * amplitude * env;
    y += noise2D(`${seed}-y-${b}`, t * 0.45, 9) * amplitude * env;
    rot += noise2D(`${seed}-r-${b}`, t * 0.45, 4) * rotacao * env;
  }
  return {x, y, rot};
};

/** Atalho: estilo de transform com punch de escala + trepidação nas mesmas batidas. */
export const estiloImpacto = (frame: number, batidas: number[], u = 1, opcoes: OpcoesImpacto = {}, tremor: Parameters<typeof trepidacao>[2] = {}): React.CSSProperties => {
  const s = impactoEscala(frame, batidas, opcoes);
  const t = trepidacao(frame, batidas, tremor);
  return {transform: `translate(${(t.x * u).toFixed(2)}px, ${(t.y * u).toFixed(2)}px) rotate(${t.rot.toFixed(3)}deg) scale(${s.toFixed(4)})`};
};

/** Entrada contemplativa padrão (opacidade + subida + foco), para elementos irmãos com stagger. */
export const entradaContemplativa = (frame: number, inicio: number, {duracao = 54, subida = 24, desfoque = 8}: {duracao?: number; subida?: number; desfoque?: number} = {}) => {
  const p = interpolate(frame, [inicio, inicio + duracao], [0, 1], {...clamp, easing: curvas.entrada});
  return {opacity: p, transform: `translateY(${((1 - p) * subida).toFixed(2)}px)`, filter: filtro([px((1 - p) * desfoque)])} as React.CSSProperties;
};
