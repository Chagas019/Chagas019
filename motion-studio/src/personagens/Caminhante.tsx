// Caminhante: silhueta humana 2D (SVG) de um jovem caminhando de costas / 3/4 de costas. Dono: agente PERSONAGENS.
// Estilo editorial: silhueta escura + luz de recorte (rim light) + sombra longa projetada no chão.
// Esqueleto 3D simples (x lateral, y vertical, z = direção da caminhada, para DENTRO da cena) projetado
// com guinada (`vista`) e elevação de câmera. Ciclo de caminhada 100% função do frame (determinístico).
import React, {useId} from 'react';
import {interpolate, Easing, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';

type V3 = {x: number; y: number; z: number};
type P2 = {x: number; y: number; d: number};

export type CaminhanteProps = {
  /** Posição dos PÉS (ponto de contato com o chão) em px da composição. */
  x: number;
  y: number;
  /** Altura da figura em px (perspectiva: diminua para ele "entrar" na cena). */
  altura: number;
  /** Frame local em que a figura surge (fade da escuridão). */
  entradaEm?: number;
  duracaoEntrada?: number;
  /** Frame local em que a figura some (fade). Omitido = não sai. */
  saidaEm?: number;
  duracaoSaida?: number;
  /** Frames por ciclo completo (2 passos). 60 = 1 s; 72 = cansado. */
  ciclo?: number;
  /** 0 = caminhada neutra · 1 = muito cansado (passo curto, tronco/cabeça caídos, braços pesados). */
  cansaco?: number;
  /** Frame local em que começa a desacelerar até parar (opcional). */
  paraEm?: number;
  duracaoParada?: number;
  /** Frame local em que volta a caminhar depois de `paraEm` (opcional). */
  retomaEm?: number;
  duracaoRetomada?: number;
  /** Guinada em graus: 0 = de costas puro; 25–35 = 3/4 de costas (positivo = vira para a direita). */
  vista?: number;
  /** Cor da silhueta (escura, não preto puro). */
  corCorpo?: string;
  /** Cor da luz de recorte (quente). */
  corLuz?: string;
  /** Intensidade da luz de recorte 0..1 (anime para "acender"). */
  luz?: number;
  /** De onde vem a luz, em graus na tela: 0 = de cima/trás, 90 = da direita, -90 = da esquerda. */
  anguloLuz?: number;
  /** Sombra longa: comprimento relativo à altura (0 = sem sombra longa; 1.5 = luz baixa no horizonte). */
  sombraComprimento?: number;
  /** Inclinação horizontal da sombra (−1..1; 0 = reta para baixo/câmera). */
  sombraInclinacao?: number;
  sombraOpacidade?: number;
  /** Desfoque em px (profundidade de campo para camadas distantes). */
  desfoque?: number;
  /** Névoa atmosférica 0..1: mistura a silhueta com `corNevoa` (distância). */
  nevoa?: number;
  corNevoa?: string;
  /** Semente da micro-variação do passo (ruído determinístico). */
  semente?: string;
  /** Desloca a fase do ciclo (frames) — útil para sincronizar um passo com um impacto. */
  faseFrames?: number;
};

const rad = (g: number) => (g * Math.PI) / 180;
const TAU = Math.PI * 2;

/** Velocidade do ciclo (0..1) no tempo local t: desacelera em `paraEm`, volta a acelerar em `retomaEm`. */
const velocidade = (t: number, paraEm?: number, durP = 45, retomaEm?: number, durR = 40) => {
  let v = 1;
  if (paraEm !== undefined && t > paraEm) v = Math.max(0, 1 - (t - paraEm) / durP);
  if (retomaEm !== undefined && t > retomaEm) v = Math.max(v, Math.min(1, (t - retomaEm) / durR));
  return v;
};

/** Fase acumulada (em ciclos) = soma da velocidade quadro a quadro (determinística, contínua). */
const faseAcumulada = (t: number, ciclo: number, paraEm?: number, durP = 45, retomaEm?: number, durR = 40) => {
  if (paraEm === undefined) return {fase: t / ciclo, vel: 1};
  let acc = 0;
  const n = Math.floor(t);
  for (let f = 0; f < n; f++) acc += velocidade(f + 0.5, paraEm, durP, retomaEm, durR);
  acc += (t - n) * velocidade(n + (t - n) / 2, paraEm, durP, retomaEm, durR);
  return {fase: acc / ciclo, vel: velocidade(t, paraEm, durP, retomaEm, durR)};
};

export const Caminhante: React.FC<CaminhanteProps> = ({
  x,
  y,
  altura,
  entradaEm = 0,
  duracaoEntrada = 40,
  saidaEm,
  duracaoSaida = 30,
  ciclo = 66,
  cansaco = 0.5,
  paraEm,
  duracaoParada = 45,
  retomaEm,
  duracaoRetomada = 40,
  vista = 22,
  corCorpo = '#0A0E16',
  corLuz = '#FFB24A',
  luz = 1,
  anguloLuz = 35,
  sombraComprimento = 1.3,
  sombraInclinacao = -0.25,
  sombraOpacidade = 0.6,
  desfoque = 0,
  nevoa = 0,
  corNevoa = '#16263F',
  semente = 'caminhante',
  faseFrames = 0,
}) => {
  const frame = useCurrentFrame();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const t = Math.max(0, frame - entradaEm) + faseFrames;
  const {fase, vel} = faseAcumulada(
    t,
    ciclo,
    paraEm === undefined ? undefined : paraEm - entradaEm + faseFrames,
    duracaoParada,
    retomaEm === undefined ? undefined : retomaEm - entradaEm + faseFrames,
    duracaoRetomada,
  );
  const c = Math.min(1, Math.max(0, cansaco));
  const ph = fase * TAU;
  // micro-irregularidade (cansaço não é metrônomo)
  const ru = noise2D(semente, fase * 0.7, 0) * 0.12 * c;

  // ---- parâmetros da marcha ----
  const passo = (1 - 0.35 * c) * vel; // amplitude relativa
  const coxaAmp = 24 * passo; // graus
  const joelhoAmp = 52 * passo;
  const bracoAmp = (24 - 12 * c) * vel;
  const inclinacao = 3 + 7 * c; // tronco para frente (graus)
  const cabecaCaida = 4 + 14 * c; // cabeça baixa (graus)
  const ombroCaido = 1.2 * c; // ombros arriados (unidades)
  const torcao = (7 - 2 * c) * vel; // torção ombros x quadril (graus)

  // ---- esqueleto (unidades: altura = 100, origem no chão) ----
  const L_COXA = 25.5;
  const L_CANELA = 24.5;
  const L_BRACO = 17;
  const L_ANTEBRACO = 16;
  const QUADRIL_W = 5;
  const OMBRO_W = 10.2;

  type Perna = {quadril: V3; joelho: V3; tornozelo: V3; ponta: V3};
  const perna = (lado: 1 | -1, p: number, hipY: number, hipZ: number): Perna => {
    const s = Math.sin(p);
    const coxa = rad(coxaAmp * s + 3);
    // joelho dobra na fase de balanço (coxa indo para frente: cos>0), e um pouco no apoio
    const balanco = Math.max(0, Math.cos(p - 0.35));
    const joelho = rad(6 + joelhoAmp * Math.pow(balanco, 1.6) + 4 * Math.max(0, -s) * passo);
    const quadril = {x: lado * QUADRIL_W, y: hipY, z: hipZ};
    const kn = {x: quadril.x, y: quadril.y - L_COXA * Math.cos(coxa), z: quadril.z + L_COXA * Math.sin(coxa)};
    const a = coxa - joelho;
    const tor = {x: kn.x * 0.98, y: kn.y - L_CANELA * Math.cos(a), z: kn.z + L_CANELA * Math.sin(a)};
    // pé: no balanço o calcanhar sobe (pé aponta para baixo); no apoio, plano
    const pe = rad(interpolate(balanco, [0, 1], [0, 55 * passo]));
    const ponta = {x: tor.x, y: tor.y - 6.5 * Math.sin(pe), z: tor.z + 6.5 * Math.cos(pe)};
    return {quadril, joelho: kn, tornozelo: tor, ponta};
  };

  // altura do quadril: ajusta para que o pé mais baixo toque o chão (bob natural)
  const pernaAlturaRel = (p: number) => {
    const q = perna(1, p, 0, 0);
    return -Math.min(q.tornozelo.y - 1.2, q.ponta.y);
  };
  const pE = ph + ru;
  const pD = ph + Math.PI + ru;
  const hipY = Math.max(pernaAlturaRel(pE), pernaAlturaRel(pD));
  // balanço lateral (peso vai para a perna de apoio) — período = ciclo completo
  const sway = 1.1 * Math.sin(ph + Math.PI / 2) * (0.6 + 0.6 * c) * vel;
  const pernaE = perna(-1, pE, hipY, 0);
  const pernaD = perna(1, pD, hipY, 0);
  pernaE.quadril.x += sway;
  pernaD.quadril.x += sway;

  // tronco
  const tronco = 30 - ombroCaido;
  const inc = rad(inclinacao + 1.5 * Math.sin(ph * 2) * passo);
  const torc = rad(torcao * Math.sin(ph));
  const peito = {x: sway * 0.6, y: hipY + tronco * Math.cos(inc), z: tronco * Math.sin(inc)};
  const ombro = (lado: 1 | -1): V3 => ({
    x: peito.x + lado * OMBRO_W * Math.cos(torc),
    y: peito.y - ombroCaido * 0.5 - (lado === 1 ? 0.5 : -0.5) * Math.sin(ph) * 0.8 * passo,
    z: peito.z - lado * OMBRO_W * Math.sin(torc),
  });
  const braco = (lado: 1 | -1, pFase: number) => {
    const o = ombro(lado);
    // articulação do braço: abaixo e para dentro da linha do ombro (a manga nasce do deltoide)
    const sh = {x: o.x - lado * 1.9, y: o.y - 2.6, z: o.z};
    const a = rad(-bracoAmp * Math.sin(pFase) + 2);
    // follow-through: antebraço atrasa a fase
    const cot = rad(14 + 10 * c + 14 * Math.max(0, Math.sin(pFase - 0.5)) * vel);
    const cot2 = a + cot;
    const el = {x: sh.x + lado * 1.6, y: sh.y - L_BRACO * Math.cos(a), z: sh.z + L_BRACO * Math.sin(a)};
    const mao = {x: el.x + lado * 0.6, y: el.y - L_ANTEBRACO * Math.cos(cot2), z: el.z + L_ANTEBRACO * Math.sin(cot2)};
    return {sh, el, mao};
  };
  // braço oposto à perna do mesmo lado
  const bracoE = braco(-1, pD);
  const bracoD = braco(1, pE);
  const pescoco = {x: peito.x, y: peito.y + 3, z: peito.z + 1.2};
  const cab = rad(cabecaCaida + 1.2 * Math.sin(ph * 2 + 0.6) * passo);
  const cabeca = {x: pescoco.x + 0.2 * sway, y: pescoco.y + 6.4 * Math.cos(cab), z: pescoco.z + 6.4 * Math.sin(cab)};

  // ---- projeção ----
  const yaw = rad(vista);
  const ELEV = 0.22;
  const pr = (v: V3): P2 => {
    const sx = v.x * Math.cos(yaw) + v.z * Math.sin(yaw);
    const d = -v.x * Math.sin(yaw) + v.z * Math.cos(yaw);
    return {x: sx, y: -v.y - d * ELEV, d};
  };

  const seg = (a: V3, b: V3) => {
    const A = pr(a);
    const B = pr(b);
    return `M${A.x.toFixed(2)} ${A.y.toFixed(2)} L${B.x.toFixed(2)} ${B.y.toFixed(2)}`;
  };
  const cadeia = (...pts: V3[]) =>
    pts
      .map(pr)
      .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');

  // tronco: contorno de jaqueta/moletom (ombros arredondados, cintura, barra no quadril)
  const ombE = pr(ombro(-1));
  const ombD = pr(ombro(1));
  const qE = pr({...pernaE.quadril, x: pernaE.quadril.x - 2.6, y: hipY - 2});
  const qD = pr({...pernaD.quadril, x: pernaD.quadril.x + 2.6, y: hipY - 2});
  const cinturaE = pr({x: peito.x - 8.4, y: hipY + 11, z: peito.z * 0.4});
  const cinturaD = pr({x: peito.x + 8.4, y: hipY + 11, z: peito.z * 0.4});
  const nuca = pr({x: pescoco.x, y: pescoco.y + 1.2, z: pescoco.z});
  const capuzE = pr({x: pescoco.x - 3.4, y: pescoco.y - 0.2, z: pescoco.z - 0.6});
  const capuzD = pr({x: pescoco.x + 3.4, y: pescoco.y - 0.2, z: pescoco.z - 0.6});
  const capuz = pr({x: pescoco.x, y: pescoco.y - 2.2, z: pescoco.z - 2.4});
  const f = (p: P2) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  // contorno: base do pescoço → trapézio → ombro → deltoide → axila → lateral → cintura → barra (quadril)
  const pp = (p: P2, dx: number, dy: number) => ({x: p.x + dx, y: p.y + dy, d: 0});
  const axE = pr({x: peito.x - (OMBRO_W - 1.2), y: peito.y - 8, z: peito.z * 0.8});
  const axD = pr({x: peito.x + (OMBRO_W - 1.2), y: peito.y - 8, z: peito.z * 0.8});
  const troncoPath = [
    `M${f(capuzE)}`,
    `C${f(pp(capuzE, -2.5, 0.6))} ${f(pp(ombE, 2.2, -1.4))} ${f(pp(ombE, 0, -0.6))}`,
    `C${f(pp(ombE, -1.8, 0.2))} ${f(pp(ombE, -2.2, 3.2))} ${f(axE)}`,
    `C${f(pp(axE, -0.2, 5))} ${f(pp(cinturaE, 0.4, -4))} ${f(cinturaE)}`,
    `L${f(qE)}`,
    `Q${f({x: (qE.x + qD.x) / 2, y: qE.y + 1.4, d: 0})} ${f(qD)}`,
    `L${f(cinturaD)}`,
    `C${f(pp(cinturaD, -0.4, -4))} ${f(pp(axD, 0.2, 5))} ${f(axD)}`,
    `C${f(pp(ombD, 2.2, 3.2))} ${f(pp(ombD, 1.8, 0.2))} ${f(pp(ombD, 0, -0.6))}`,
    `C${f(pp(ombD, -2.2, -1.4))} ${f(pp(capuzD, 2.5, 0.6))} ${f(capuzD)}`,
    `Q${f({x: nuca.x, y: nuca.y - 1.2, d: 0})} ${f(capuzE)}`,
    'Z',
  ].join(' ');
  const cabecaP = pr(cabeca);

  type Parte = {d: number; el: (cor: string) => React.ReactNode};
  const membroPerna = (pp: Perna, k: string): Parte => ({
    d: (pr(pp.joelho).d + pr(pp.tornozelo).d) / 2,
    el: (cor) => (
      <g key={k}>
        <path d={seg(pp.quadril, pp.joelho)} stroke={cor} strokeWidth={9} strokeLinecap="round" fill="none" />
        <path d={seg(pp.joelho, pp.tornozelo)} stroke={cor} strokeWidth={7.6} strokeLinecap="round" fill="none" />
        <path d={cadeia({...pp.tornozelo, y: pp.tornozelo.y - 0.4}, pp.ponta)} stroke={cor} strokeWidth={4.6} strokeLinecap="round" fill="none" />
        <path d={cadeia(pp.tornozelo, {...pp.tornozelo, z: pp.tornozelo.z - 1.6, y: pp.tornozelo.y - 0.6})} stroke={cor} strokeWidth={5} strokeLinecap="round" fill="none" />
      </g>
    ),
  });
  const membroBraco = (b: ReturnType<typeof braco>, k: string): Parte => ({
    d: (pr(b.el).d + pr(b.mao).d) / 2,
    el: (cor) => (
      <g key={k}>
        <path d={seg(b.sh, b.el)} stroke={cor} strokeWidth={7} strokeLinecap="round" fill="none" />
        <path d={seg(b.el, b.mao)} stroke={cor} strokeWidth={6.2} strokeLinecap="round" fill="none" />
      </g>
    ),
  });
  const partes: Parte[] = [
    membroPerna(pernaE, 'pe'),
    membroPerna(pernaD, 'pd'),
    membroBraco(bracoE, 'be'),
    membroBraco(bracoD, 'bd'),
    {
      d: 0,
      el: (cor: string) => (
        <g key="t">
          <path d={troncoPath} fill={cor} stroke={cor} strokeWidth={1.2} strokeLinejoin="round" />
          {/* capuz do moletom caído nas costas */}
          <ellipse cx={capuz.x} cy={capuz.y} rx={5.4} ry={3.2} fill={cor} />
          <path d={seg({...pescoco, y: pescoco.y - 2}, cabeca)} stroke={cor} strokeWidth={5.4} strokeLinecap="round" />
        </g>
      ),
    },
  ].sort((a, b) => b.d - a.d); // mais distante primeiro
  const cabecaEl = (cor: string) => (
    <g key="c">
      <ellipse cx={cabecaP.x} cy={cabecaP.y - 0.4} rx={5.3} ry={6.3} fill={cor} />
      {/* cabelo curto: volume leve no topo/nuca */}
      <ellipse cx={cabecaP.x + 0.3} cy={cabecaP.y - 2.4} rx={5.6} ry={4.8} fill={cor} />
    </g>
  );
  const corpo = (cor: string) => (
    <>
      {partes.map((p) => p.el(cor))}
      {cabecaEl(cor)}
    </>
  );

  // ---- luz ----
  const L = Math.max(0, Math.min(1.5, luz));
  const lx = Math.sin(rad(anguloLuz));
  const ly = -Math.cos(rad(anguloLuz));
  const rimLarg = 0.95; // largura da borda direcional
  const rimEnvolve = 0.1; // borda que envolve todo o contorno (contraluz)

  // ---- visibilidade ----
  const entrada = interpolate(frame, [entradaEm, entradaEm + duracaoEntrada], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const saida =
    saidaEm === undefined
      ? 1
      : interpolate(frame, [saidaEm, saidaEm + duracaoSaida], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  const opacidade = entrada * saida;
  if (opacidade <= 0 || altura <= 0) return null;

  // ---- caixa do SVG (unidades) ----
  const sombraL = Math.max(0, sombraComprimento);
  const vb = {x: -60 - 110 * Math.abs(sombraInclinacao) * sombraL, y: -118, w: 120 + 220 * Math.abs(sombraInclinacao) * sombraL, h: 128 + 105 * sombraL};
  const k = altura / 100;
  const corSil = nevoa > 0 ? misturar(corCorpo, corNevoa, Math.min(1, nevoa)) : corCorpo;
  // sombra: matriz chão (y<0 acima do chão → projetado para baixo/câmera, alongado)
  const sombraMatriz = `matrix(1 0 ${(-sombraInclinacao * sombraL).toFixed(3)} ${(-sombraL * 0.95).toFixed(3)} 0 0)`;

  return (
    <svg
      width={vb.w * k}
      height={vb.h * k}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      style={{
        position: 'absolute',
        left: x + vb.x * k,
        top: y + vb.y * k,
        overflow: 'visible',
        opacity: opacidade,
        filter: desfoque > 0 ? `blur(${desfoque}px)` : undefined,
      }}
    >
      <defs>
        <mask id={`m${uid}`} maskUnits="userSpaceOnUse" x={vb.x} y={vb.y} width={vb.w} height={vb.h}>
          {corpo('#fff')}
        </mask>
        <filter id={`e${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feMorphology operator="erode" radius={rimEnvolve * L} />
          <feOffset dx={-lx * rimLarg * L} dy={-ly * rimLarg * L} />
          <feGaussianBlur stdDeviation={0.35} />
        </filter>
        <filter id={`b${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={2.6} />
        </filter>
        <filter id={`s${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={0.9 + 0.6 * sombraL} />
        </filter>
        <linearGradient id={`g${uid}`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={sombraInclinacao * sombraL * 100} y2={sombraL * 95}>
          <stop offset="0" stopColor="#fff" stopOpacity={1} />
          <stop offset="0.55" stopColor="#fff" stopOpacity={0.45} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <mask id={`sm${uid}`} maskUnits="userSpaceOnUse" x={vb.x} y={vb.y} width={vb.w} height={vb.h}>
          <rect x={vb.x} y={0} width={vb.w} height={vb.h} fill={`url(#g${uid})`} />
        </mask>
      </defs>

      {/* sombra longa projetada (contato nítido no pé, difusa e esmaecida ao longe) */}
      {sombraL > 0 && (
        <g mask={`url(#sm${uid})`} opacity={sombraOpacidade}>
          <g filter={`url(#s${uid})`} transform={sombraMatriz}>
            {corpo('#000')}
          </g>
        </g>
      )}
      {/* sombra de contato (oclusão sob os pés) */}
      <ellipse cx={sway * 0.8} cy={0.6} rx={9} ry={1.6} fill="#000" opacity={0.55 * sombraOpacidade + 0.15} filter={`url(#s${uid})`} />

      {/* halo de contraluz (bloom) vazando pelas bordas do lado da luz */}
      <g opacity={0.16 * Math.min(1, L)} filter={`url(#b${uid})`} transform={`translate(${(lx * 0.8).toFixed(2)} ${(ly * 0.8).toFixed(2)})`}>
        {corpo(corLuz)}
      </g>

      {/* silhueta com luz de recorte: camada de luz por baixo, corpo escuro erodido/deslocado por cima */}
      <g mask={`url(#m${uid})`}>
        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={L > 0 ? misturar(corSil, corLuz, Math.min(1, 0.25 + 0.75 * L)) : corSil} />
        <g filter={`url(#e${uid})`}>{corpo(corSil)}</g>
      </g>
    </svg>
  );
};

/** Mistura duas cores hex (#RRGGBB) — t=0 → a, t=1 → b. */
export const misturar = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

/**
 * Trajetória na estrada: ponto de fuga + progresso → posição dos pés, altura, desfoque e névoa.
 * Use para o personagem caminhar "para dentro" da cena. `progresso` 0 = perto, 1 = no horizonte.
 * Perspectiva: escala ∝ 1/(1 + k·profundidade) (desacelera visualmente ao longe, como na realidade).
 */
export const naEstrada = (o: {
  progresso: number;
  pertoX: number;
  pertoY: number;
  alturaPerto: number;
  fugaX: number;
  fugaY: number;
  /** Quão longe a estrada vai (1 = moderado, 4 = muito longe). */
  profundidade?: number;
}) => {
  const k = o.profundidade ?? 2.5;
  const s = 1 / (1 + k * Math.max(0, o.progresso)); // 1 → 1/(1+k)
  const u = (1 - s) / (1 - 1 / (1 + k)); // 0..1 normalizado para a fuga
  return {
    x: o.pertoX + (o.fugaX - o.pertoX) * u * 0.92,
    y: o.pertoY + (o.fugaY - o.pertoY) * u * 0.92,
    altura: o.alturaPerto * s,
    desfoque: Math.max(0, (1 - s) * 1.4 - 0.2),
    nevoa: Math.min(0.6, (1 - s) * 0.7),
  };
};
